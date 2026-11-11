#!/usr/bin/env node
/* 把 skill/SKILL.md 同步到本机技能目录(fxdeck-orchestrator),
   让「FXDeck编排」触发词在新会话里可用。npm run skill:sync */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const src = path.resolve("skill", "SKILL.md");
const targets = [path.join(os.homedir(), ".agents", "skills", "fxdeck-orchestrator"), path.join(os.homedir(), ".zcode", "skills", "fxdeck-orchestrator")];

for (const dir of targets) {
  const dest = path.join(dir, "SKILL.md");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`✓ 已同步 → ${dest}`);
  } catch (e) {
    console.warn(`✗ 跳过 ${dest}:${String(e).slice(0, 80)}`);
  }
}
