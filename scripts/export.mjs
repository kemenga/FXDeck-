#!/usr/bin/env node
/* FXDeck 导出脚本:无头浏览器逐帧截图(带 alpha)→ ffmpeg 合成透明 MOV/WebM
   用法:node scripts/export.mjs <job.json>
   job: { doc, fps, duration, base } */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer";

// Chrome 内核缓存未配置时给出人话提示(而不是一屏堆栈)
if (!process.env.PUPPETEER_CACHE_DIR && !fs.existsSync(path.join(process.env.USERPROFILE ?? "~", ".cache", "puppeteer"))) {
  console.error(
    "找不到无头浏览器内核。设好缓存目录再跑:\n" +
      "  set PUPPETEER_CACHE_DIR=<chrome缓存目录>\n" +
      "或装一份:npx puppeteer browsers install chrome",
  );
  process.exit(1);
}

const jobFile = process.argv[2];
if (!jobFile) {
  console.error("用法:node scripts/export.mjs <job.json>");
  process.exit(1);
}
const job = JSON.parse(fs.readFileSync(jobFile, "utf8"));
// 两种入参都收:完整 job {doc,...} 或编排本体(fmt: fxdeck/1)
const doc = job.doc?.cards ? job.doc : job.fmt === "fxdeck/1" ? job : null;
const base = job.base;
const fps = job.fps ?? 30000 / 1001;
// 时长优先用调用方给的;没给就从编排里推导(末卡结束 + 0.4s 收尾)——别信调用方一定给对
const duration =
  job.duration ??
  (doc?.cards?.length ? Math.max(...doc.cards.map((c) => c.end)) + 0.4 : 0);
if (!doc || !duration) {
  console.error("job 缺 doc 或推不出时长");
  process.exit(1);
}

const outDir = path.resolve("exports", new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19));
fs.mkdirSync(outDir, { recursive: true });

/** 跑一个外部命令,失败抛错 */
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} 退出码 ${c}`))));
    p.on("error", reject);
  });
}

// 这台 Windows 上新 headless(全版本)被系统层拦杀(crashpad 自杀),只有 shell 精简内核能跑;
// 而 shell 的 omitBackground 有 bug(整帧 alpha=0,连内容一起透明)。
// 所以 alpha 靠重构:每帧对黑、白两种页面底各截一张不透明图,
//   black = C·α,white = C·α + 255·(1-α)  ⇒  α = 1-(white-black)/255,C = black/α
// 逐像素还原出与真 alpha 截图数学等价的 RGBA(含毛玻璃/阴影/抗锯齿边缘)。
// 本机 Chrome 导出compat矩阵(实测):新 headless 全版本被系统拦杀(crashpad 自杀),只有 shell 能起;
// shell 的 omitBackground 在 --disable-gpu(软件光栅)下整帧全透明,但 GPU 路径正常 ——
// 所以往 GPU 路径走,配页面里的常驻 rAF 循环 + 每次 seek 后 settle 两帧,单张截图即带真 alpha。
async function launchBrowser() {
  return await puppeteer.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-crash-reporter",
      "--run-all-compositor-stages-before-draw",
      "--disable-new-content-rendering-timeout",
    ],
  });
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`${base}/?export=1`, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  // 等导出视图拿到 job 并挂好 __fxSeek
  await page.waitForFunction("typeof window.__fxSeek === 'function'", { timeout: 30_000 });
  // 硬等待:编排装载完成(舞台出现)才开渲。不能等 .fd-card——首卡进场晚于 0 秒时,
  // t=0 本来就没有活卡,等卡片会永远超时(实际踩过)
  await page.waitForFunction("document.querySelectorAll('.fd-stage').length > 0", { timeout: 20_000 });

  const frames = Math.max(1, Math.round(duration * fps));
  const frameName = (i) => "f" + String(i).padStart(5, "0") + ".png";
  // 底色切换后必须等页面的 rAF 循环走两帧再截:立即截会拍到上一帧
  // (页面里的常驻 rAF 循环保证这两帧一定会来)。
  const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    await page.evaluate((x) => window.__fxSeek(x), t);
    await settle();
    // 单张 + omitBackground = 直接拿到带真 alpha 的 PNG(GPU 合成路径实测可靠;
    // 软件光栅路径才有"整帧全透明"的 bug,别退回去)
    await page.screenshot({ path: path.join(outDir, frameName(i)), omitBackground: true });
    if (i % 20 === 0 || i === frames - 1) console.log(`progress ${i + 1}/${frames}`);
  }
  await browser.close();

  // (旧版这里有一段「黑/白双图重构 alpha」的 Node 逐像素处理——GPU 路径下
  //  omitBackground 直接产出真 alpha,整段废弃,省 5-8 分钟)

  // ── 成片模式:垫底视频 + 透明层 + 原声 → H.264 MP4(直接可发布)──
  if (job.final && job.videoPath) {
    console.log("composing final mp4");
    await run("ffmpeg", [
      "-y", "-i", job.videoPath,
      "-framerate", String(fps), "-i", path.join(outDir, "f%05d.png"),
      // 透明层叠到原片;层播完后保留原片(eof_action=pass);宽高取偶(H.264 要求)
      "-filter_complex",
      "[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:eof_action=pass:format=auto,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      path.join(outDir, "final.mp4"),
    ]);
    console.log(JSON.stringify({ ok: true, final: path.join(outDir, "final.mp4"), dir: outDir, frames }));
  } else {
    console.log("composing mov");
    await run("ffmpeg", [
      "-y", "-framerate", String(fps), "-i", path.join(outDir, "f%05d.png"),
      "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
      path.join(outDir, "overlay.mov"),
    ]);
    // WebM 是可选备用格式(vp9 编码要几分钟),默认不导,job.webm = true 才要
    let webmPath = null;
    if (job.webm) {
      console.log("composing webm");
      await run("ffmpeg", [
        "-y", "-framerate", String(fps), "-i", path.join(outDir, "f%05d.png"),
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "32",
        "-deadline", "realtime", "-cpu-used", "5",
        path.join(outDir, "overlay.webm"),
      ]);
      webmPath = path.join(outDir, "overlay.webm");
    }
    console.log(JSON.stringify({ ok: true, mov: path.join(outDir, "overlay.mov"), webm: webmPath, dir: outDir, frames }));
  }
} catch (e) {
  await browser.close().catch(() => {});
  console.error(String(e));
  process.exit(1);
}
