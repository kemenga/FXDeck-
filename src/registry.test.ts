/* 卡片注册表完整性守卫:registry / CardPreview / SKILL.md 三处不许漂移 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { CARDS } from "./registry";
import { PREVIEW_DUR } from "./CardPreview";
import { COMMON_CTRLS } from "./core/types";

describe("卡片注册表完整性", () => {
  it("kind 全库唯一", () => {
    const kinds = CARDS.map((c) => c.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("每张卡:名称/描述/defaults/ctrls/render 齐备,通用参数(pos/acc/offX/offY)齐全", () => {
    for (const d of CARDS) {
      expect(d.name.trim(), `${d.kind} 缺名称`).toBeTruthy();
      expect(d.desc.trim(), `${d.kind} 缺描述`).toBeTruthy();
      for (const k of ["pos", "acc", "offX", "offY"]) {
        expect(d.defaults, `${d.kind} defaults 缺 ${k}`).toHaveProperty(k);
      }
      const ks = d.ctrls.map((c) => c.k);
      for (const k of COMMON_CTRLS.map((c) => c.k)) {
        expect(ks, `${d.kind} ctrls 缺通用控件 ${k}`).toContain(k);
      }
      expect(typeof d.render, `${d.kind} render 应为函数`).toBe("function");
    }
  });

  it("PREVIEW_DUR 的键都是已注册的 kind", () => {
    const kinds = new Set(CARDS.map((c) => c.kind));
    for (const k of Object.keys(PREVIEW_DUR)) {
      expect(kinds.has(k), `PREVIEW_DUR 里的 ${k} 不是已注册卡片`).toBe(true);
    }
  });

  it("SKILL.md 卡片库表收录了每一张卡", () => {
    const md = fs.readFileSync("skill/SKILL.md", "utf8");
    for (const d of CARDS) {
      expect(md, `SKILL.md 缺卡片 ${d.kind}`).toContain(d.kind);
    }
  });
});
