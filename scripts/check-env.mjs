#!/usr/bin/env node
/* FXDeck 环境体检:npm run check
   逐项检查新机器跑本项目需要的东西,缺什么用人话提示怎么装 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let failed = 0;
const ok = (name, detail = "") => console.log(`  ✓ ${name}${detail ? ` —— ${detail}` : ""}`);
const bad = (name, hint) => {
  console.log(`  ✗ ${name}\n      ${hint}`);
  failed++;
};
const run = (cmd, args) => {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 15_000 });
    return r.status === 0
      ? String(r.stdout ?? "")
          .split("\n")[0]
          .trim()
      : null;
  } catch {
    return null;
  }
};

console.log("FXDeck 环境体检\n────────────────");

/* 1. Node 版本(engines: >=22) */
const major = Number(process.versions.node.split(".")[0]);
if (major >= 22) ok(`Node.js ${process.versions.node}`);
else bad(`Node.js ${process.versions.node}(需要 ≥ 22)`, "去 https://nodejs.org 装 22 LTS,或:winget install OpenJS.NodeJS.LTS;装完重开终端");

/* 2. Git */
const git = run("git", ["--version"]);
if (git) ok(git);
else bad("Git 未安装", "winget install Git.Git(或去 https://git-scm.com 下载);装完重开终端");

/* 3. ffmpeg(导出合成用) */
const ffmpeg = run("ffmpeg", ["-version"]);
if (ffmpeg) ok(ffmpeg);
else bad("ffmpeg 不在 PATH(导出 MOV/MP4 会失败)", "winget install Gyan.FFmpeg(或去 https://www.gyan.dev/ffmpeg/builds/ 下载把 bin 加进 PATH);装完重开终端");

/* 4. 依赖已安装 */
if (fs.existsSync(path.join(process.cwd(), "node_modules"))) ok("npm 依赖已安装(node_modules 存在)");
else bad("依赖未安装", "在本项目目录跑:npm install");

/* 5. chrome-headless-shell 内核(导出渲染用) */
const cacheRoot = process.env.PUPPETEER_CACHE_DIR || path.join(os.homedir(), ".cache", "puppeteer");
const shellRoot = path.join(cacheRoot, "chrome-headless-shell");
let shellExe = null;
try {
  for (const ver of fs.readdirSync(shellRoot)) {
    // 目录名随平台不同:win64 / mac-arm / mac / linux64,以文件名开头匹配,别硬编码平台
    const verDir = path.join(shellRoot, ver);
    for (const sub of fs.readdirSync(verDir)) {
      const subDir = path.join(verDir, sub);
      if (!fs.statSync(subDir).isDirectory()) continue;
      for (const f of fs.readdirSync(subDir)) {
        if (f.startsWith("chrome-headless-shell")) {
          shellExe = path.join(subDir, f);
          break;
        }
      }
      if (shellExe) break;
    }
    if (shellExe) break;
  }
} catch {
  /* 目录不存在,当没装 */
}
if (shellExe) ok("chrome-headless-shell 内核", path.relative(cacheRoot, shellExe));
else
  bad(
    "chrome-headless-shell 内核未安装(预览可用,导出会失败)",
    "在本项目目录跑:npx puppeteer browsers install chrome-headless-shell(装到 " + cacheRoot + ",约 150MB)",
  );

/* 结论 */
console.log("────────────────");
if (failed === 0) {
  console.log("全部就绪!npm run dev → http://localhost:5188");
  process.exit(0);
}
console.log(`缺 ${failed} 项,按上面的提示装齐后重新 npm run check`);
process.exit(1);
