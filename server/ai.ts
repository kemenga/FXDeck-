/* AI 助手聊天:把终端编程代理(ZCode / Codex / Claude Code)挂进编辑台 ——
   GET  /api/ai/engines  并发探测各 CLI 是否在 PATH 上,带回版本与安装提示
   POST /api/ai/chat     起子进程跑一条消息,stdout/stderr 按 NDJSON 事件流式推给前端
   POST /api/ai/stop     强停当前进程
   事件格式:{t:"out"|"err",line} 逐块原文,{t:"exit",code} 收尾 */
import type { Plugin } from "vite";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

/** 给每条消息前置的项目背景:让代理不用翻 README 就知道往哪改 */
const FXDECK_BRIEF =
  "你在 FXDeck 项目目录里(动效卡片编辑台,给口播视频配动效)。加/改动效卡 = src/cards/<kind>.tsx 一卡一文件," +
  "默认导出 CardDef,渲染必须是时间 t 的纯函数;新卡在 src/registry.ts 登记。约定细节见 README.md。回答与提交说明用中文。";

interface EngineDef {
  id: string;
  name: string;
  cmd: string;
  versionArgs: string[];
  buildArgs: (prompt: string) => string[];
  note: string;
}

const ENGINES: EngineDef[] = [
  {
    id: "zcode",
    name: "ZCode",
    cmd: "zcode",
    versionArgs: ["--version"],
    // -p 无头跑一条;edit 模式自动应用文件编辑;yolo 是 -p 的默认值,过宽
    buildArgs: (p) => ["-p", `${FXDECK_BRIEF}\n\n${p}`, "--no-color", "--mode", "edit"],
    note: "ZCode 桌面版自带 CLI;本机已 shim 到 PATH",
  },
  {
    id: "codex",
    name: "Codex CLI",
    cmd: "codex",
    versionArgs: ["--version"],
    // workspace-write 沙箱 + 审批自动放行:能改项目文件,又不给全盘权限
    buildArgs: (p) => ["exec", "-s", "workspace-write", "--approve-for-me", `${FXDECK_BRIEF}\n\n${p}`],
    note: "npm i -g @openai/codex",
  },
  {
    id: "claude",
    name: "Claude Code",
    cmd: "claude",
    versionArgs: ["--version"],
    buildArgs: (p) => ["-p", `${FXDECK_BRIEF}\n\n${p}`, "--output-format", "text", "--permission-mode", "acceptEdits"],
    note: "npm i -g @anthropic-ai/claude-code",
  },
];

export function aiChat(): Plugin {
  let child: ChildProcessByStdio<null, Readable, Readable> | null = null; // stdio 配了 pipe,stdout/stderr 必非空
  let engineId = "";
  // 绝对时长上限:代理卡死不至挂满一天(正常改卡一两分钟)
  let deadline: ReturnType<typeof setTimeout> | null = null;

  const kill = () => {
    if (!child) return;
    const c = child;
    child = null;
    if (deadline) clearTimeout(deadline);
    c.kill("SIGKILL");
  };

  return {
    name: "fx-ai",
    configureServer(server) {
      server.middlewares.use("/api/ai/engines", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        Promise.all(
          ENGINES.map(
            (e) =>
              new Promise<{ id: string; name: string; ok: boolean; version: string; note: string }>((done) => {
                let out = "";
                const p = spawn(e.cmd, e.versionArgs, { stdio: ["ignore", "pipe", "ignore"] });
                const t = setTimeout(() => p.kill("SIGKILL"), 4000);
                p.stdout.on("data", (d) => (out += d));
                p.on("error", () => {
                  clearTimeout(t);
                  done({ id: e.id, name: e.name, ok: false, version: "", note: e.note });
                });
                p.on("close", (code) => {
                  clearTimeout(t);
                  done({ id: e.id, name: e.name, ok: code === 0, version: out.trim().split("\n")[0] ?? "", note: e.note });
                });
              }),
          ),
        ).then((engines) => res.end(JSON.stringify({ ok: true, engines })));
      });

      server.middlewares.use("/api/ai/stop", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const had = !!child;
        kill();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: had }));
      });

      server.middlewares.use("/api/ai/chat", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (child) {
          res.statusCode = 429;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: `已有任务在跑(${engineId}),先停止或等它结束` }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let engine: EngineDef | undefined;
          let prompt = "";
          try {
            const j = JSON.parse(body || "{}");
            engine = ENGINES.find((e) => e.id === j.engine);
            prompt = String(j.prompt ?? "").trim();
          } catch {
            /* 落到下面的校验 */
          }
          if (!engine || !prompt) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "缺 engine 或 prompt" }));
            return;
          }
          const proc = spawn(engine.cmd, engine.buildArgs(prompt), {
            cwd: server.config.root,
            stdio: ["ignore", "pipe", "pipe"],
          });
          child = proc;
          engineId = engine.id;
          res.setHeader("Content-Type", "application/x-ndjson");
          res.setHeader("Cache-Control", "no-cache");
          // 客户端停止/刷新会销毁 socket:后续 write 的异步错误必须吞掉,不然打挂 dev server
          res.on("error", () => {});
          const send = (ev: object) => {
            if (!res.writableEnded && !res.destroyed) res.write(JSON.stringify(ev) + "\n");
          };
          send({ t: "start", engine: engine.id });
          proc.stdout.on("data", (d) => send({ t: "out", line: String(d) }));
          proc.stderr.on("data", (d) => send({ t: "err", line: String(d) }));
          proc.on("close", (code) => {
            if (child === proc) {
              child = null;
              if (deadline) clearTimeout(deadline);
            }
            send({ t: "exit", code: code ?? -1 });
            res.end();
          });
          deadline = setTimeout(() => {
            send({ t: "err", line: "\n[超时] 15 分钟上限,进程已强停\n" });
            kill();
          }, 15 * 60_000);
        });
      });
    },
  };
}
