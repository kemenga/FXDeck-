/* 导出链路:POST /api/export 起无头渲染脚本(立即返回,不占连接)
   → GET /api/status 轮询进度与最终结果 → POST /api/cancel 中途取消
   GET /api/job 给导出视图喂编排 */
import type { Plugin } from "vite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

export function fxExport(): Plugin {
  let job: any = null;
  let child: ChildProcessByStdio<null, Readable, Readable> | null = null; // stdio 配了 pipe,stdout/stderr 必非空
  let cancelled = false;
  let prog: {
    running: boolean;
    frame: number;
    total: number;
    stage: string;
    result: { ok: boolean; mov?: string; final?: string; dir?: string; frames?: number; blank?: number; error?: string } | null;
  } = { running: false, frame: 0, total: 0, stage: "", result: null };

  return {
    name: "fx-export",
    configureServer(server) {
      server.middlewares.use("/api/job", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(job ?? {}));
      });
      server.middlewares.use("/api/status", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(prog));
      });
      server.middlewares.use("/api/cancel", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (prog.running && child) {
          cancelled = true;
          child.kill("SIGKILL");
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.end(JSON.stringify({ ok: false, error: "没有在跑的任务" }));
        }
      });
      server.middlewares.use("/api/export", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (prog.running) {
          res.statusCode = 429;
          res.end(JSON.stringify({ ok: false, error: "已有导出任务在跑" }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            job = JSON.parse(body || "{}");
            // 入参归一:调用方可能直接给编排本体(fmt: fxdeck/1),统一包成 {doc}
            if (!job.doc && job.fmt === "fxdeck/1") job = { doc: job };
            // 垫底视频:把 /_media/ URL 解析成服务器上的真实路径,成片合成时 ffmpeg 直接读
            if (job.video) {
              try {
                const u = new URL(job.video, "http://x");
                const name = path.basename(decodeURIComponent(u.pathname));
                const vp = path.join(server.config.root, "public", "_media", name);
                if (fs.existsSync(vp)) job.videoPath = vp;
              } catch {
                /* video 字段坏就当没给,走纯透明层导出 */
              }
            }
            const jobFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fxdeck-")), "job.json");
            fs.writeFileSync(jobFile, JSON.stringify({ ...job, base: `http://localhost:${server.config.server?.port ?? 5188}` }));
            const proc = spawn(process.execPath, ["scripts/export.mjs", jobFile], {
              cwd: server.config.root,
              stdio: ["ignore", "pipe", "pipe"],
            });
            child = proc;
            cancelled = false;
            prog = { running: true, frame: 0, total: 0, stage: "render", result: null };
            // 立刻应答:任务已受理,进度走 /api/status 轮询(长连接挂 30 分钟容易被打断)
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, started: true }));
            let out = "";
            let err = "";
            // 看门狗:任何输出都续命;10 分钟静默按假死强停,避免 busy 卡死
            let idle = setTimeout(() => child?.kill("SIGKILL"), 10 * 60_000);
            const kick = () => {
              clearTimeout(idle);
              idle = setTimeout(() => child?.kill("SIGKILL"), 10 * 60_000);
            };
            proc.stdout.on("data", (d) => {
              kick();
              out += d;
              process.stdout.write(`[export] ${d}`);
              const m = [...out.matchAll(/progress (\d+)\/(\d+)/g)].pop();
              if (m) {
                prog.frame = +m[1];
                prog.total = +m[2];
                prog.stage = "render";
              }
              if (out.includes("composing mov")) prog.stage = "mov";
              if (out.includes("composing webm")) prog.stage = "webm";
              if (out.includes("composing final mp4")) prog.stage = "final";
            });
            proc.stderr.on("data", (d) => {
              kick();
              err += d;
            });
            proc.on("close", (code) => {
              clearTimeout(idle);
              child = null;
              // 末行是导出脚本的 JSON 结果;被取消/失败时给 error
              let result: typeof prog.result;
              if (cancelled) {
                result = { ok: false, error: "已手动取消" };
              } else if (code === 0) {
                const lines = out.trim().split("\n");
                try {
                  result = JSON.parse(lines[lines.length - 1]);
                } catch {
                  result = { ok: true };
                }
              } else {
                result = { ok: false, error: (err || out).slice(-900) };
              }
              prog = { ...prog, running: false, stage: code === 0 && !cancelled ? "done" : "error", result };
              try {
                fs.rmSync(path.dirname(jobFile), { recursive: true, force: true });
              } catch {
                /* 留着无妨 */
              }
            });
          } catch (e) {
            prog.running = false;
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}
