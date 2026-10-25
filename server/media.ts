/* 垫底视频落盘:POST /api/media(原始字节流,x-filename 头带文件名)→ public/_media/,
   返回 /_media/xxx 服务器路径 —— 导出成片时 ffmpeg 直接读这个文件 */
import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

export function mediaUpload(): Plugin {
  return {
    name: "fx-media",
    configureServer(server) {
      server.middlewares.use("/api/media", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end('{"ok":false,"error":"POST only"}');
          return;
        }
        try {
          const raw = String(req.headers["x-filename"] ?? "video.mp4");
          // 只留安全字符,防路径穿越;中文保留
          const safe = decodeURIComponent(raw)
            .replace(/[^\w.\-\u4e00-\u9fff]/g, "_")
            .slice(-80);
          const dir = path.join(server.config.root, "public", "_media");
          fs.mkdirSync(dir, { recursive: true });
          const dest = path.join(dir, safe);
          // 先写草稿再改名:同名文件边读边写会自毁;Windows 上改名被占用时稍等重试
          const tmp = `${dest}.${process.pid}-${Date.now()}.part`;
          const ws = fs.createWriteStream(tmp);
          const fail = (why: string) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: why }));
          };
          req.on("error", () => fail("上传中断"));
          ws.on("error", (e) => fail(String(e)));
          ws.on("finish", () => {
            const tries = [0, 200, 600];
            const attempt = (k: number) => {
              try {
                fs.renameSync(tmp, dest);
                const v = Math.floor(fs.statSync(dest).mtimeMs);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: true, url: `/_media/${encodeURIComponent(safe)}?v=${v}` }));
              } catch (e) {
                if (k < tries.length - 1) setTimeout(() => attempt(k + 1), tries[k + 1]);
                else fail(`落盘失败:${e}`);
              }
            };
            attempt(0);
          });
          req.pipe(ws);
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
    },
  };
}
