import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** 垫底视频落盘:POST /api/media(原始字节流,x-filename 头带文件名)→ public/_media/,
    返回 /_media/xxx 服务器路径 —— 导出成片时 ffmpeg 直接读这个文件 */
function mediaUpload(): Plugin {
  return {
    name: 'fx-media',
    configureServer(server) {
      server.middlewares.use('/api/media', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('{"ok":false,"error":"POST only"}')
          return
        }
        try {
          const raw = String(req.headers['x-filename'] ?? 'video.mp4')
          // 只留安全字符,防路径穿越;中文保留
          const safe = decodeURIComponent(raw).replace(/[^\w.\-\u4e00-\u9fff]/g, '_').slice(-80)
          const dir = path.join(server.config.root, 'public', '_media')
          fs.mkdirSync(dir, { recursive: true })
          const dest = path.join(dir, safe)
          // 先写草稿再改名:同名文件边读边写会自毁;Windows 上改名被占用时稍等重试
          const tmp = `${dest}.${process.pid}-${Date.now()}.part`
          const ws = fs.createWriteStream(tmp)
          const fail = (why: string) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: why }))
          }
          req.on('error', () => fail('上传中断'))
          ws.on('error', (e) => fail(String(e)))
          ws.on('finish', () => {
            const tries = [0, 200, 600]
            const attempt = (k: number) => {
              try {
                fs.renameSync(tmp, dest)
                const v = Math.floor(fs.statSync(dest).mtimeMs)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true, url: `/_media/${encodeURIComponent(safe)}?v=${v}` }))
              } catch (e) {
                if (k < tries.length - 1) setTimeout(() => attempt(k + 1), tries[k + 1])
                else fail(`落盘失败:${e}`)
              }
            }
            attempt(0)
          })
          req.pipe(ws)
        } catch (e) {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    },
  }
}

/** 导出链路:POST /api/export 起无头渲染脚本;GET /api/job 给导出视图喂编排;GET /api/status 报进度 */
function fxExport(): Plugin {
  let job: any = null;
  let prog = { running: false, frame: 0, total: 0, stage: "" };
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
      server.middlewares.use("/api/export", (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
        if (prog.running) { res.statusCode = 429; res.end(JSON.stringify({ ok: false, error: "已有导出任务在跑" })); return; }
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
            const jobFile = path.join(fs.mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "fxdeck-")), "job.json");
            fs.writeFileSync(jobFile, JSON.stringify({ ...job, base: `http://localhost:${server.config.server?.port ?? 5188}` }));
            const child = spawn(process.execPath, ["scripts/export.mjs", jobFile], {
              cwd: server.config.root,
              stdio: ["ignore", "pipe", "pipe"],
            });
            prog = { running: true, frame: 0, total: 0, stage: "render" };
            let out = "";
            let err = "";
            // 看门狗:任何输出都续命;10 分钟静默按假死强停,避免 busy 卡死
            let idle = setTimeout(() => child.kill("SIGKILL"), 10 * 60_000);
            const kick = () => { clearTimeout(idle); idle = setTimeout(() => child.kill("SIGKILL"), 10 * 60_000); };
            child.stdout.on("data", (d) => {
              kick();
              out += d;
              process.stdout.write(`[export] ${d}`);
              const m = [...out.matchAll(/progress (\d+)\/(\d+)/g)].pop();
              if (m) { prog.frame = +m[1]; prog.total = +m[2]; prog.stage = "render"; }
              if (out.includes("composing mov")) prog.stage = "mov";
              if (out.includes("composing webm")) prog.stage = "webm";
            });
            child.stderr.on("data", (d) => { kick(); err += d; });
            child.on("close", (code) => {
              clearTimeout(idle);
              prog = { ...prog, running: false, stage: "done" };
              res.setHeader("Content-Type", "application/json");
              if (code === 0) {
                const lines = out.trim().split("\n");
                res.end(lines[lines.length - 1]);
              } else {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: (err || out).slice(-900) }));
              }
              try { fs.rmSync(path.dirname(jobFile), { recursive: true, force: true }); } catch { /* 留着无妨 */ }
            });
          } catch (e) {
            prog.running = false;
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fxExport(), mediaUpload()],
  server: { port: 5188, strictPort: true },
});
