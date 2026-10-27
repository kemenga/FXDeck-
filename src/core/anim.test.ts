/* anim.ts 单元测试:缓动纯函数的边界与单调性 */
import { describe, it, expect } from "vitest";
import { clamp01, easeOut3, easeOutExpo, easeIO3, easeOutBack, enter, item, outro, count, fmtTime } from "./anim";

describe("clamp01", () => {
  it("夹取到 [0,1]", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(2)).toBe(1);
  });
});

describe("缓动曲线端点", () => {
  it("easeOut3 / easeOutExpo / easeIO3 / easeOutBack 在 0 与 1 处取 0 与 1", () => {
    for (const f of [easeOut3, easeOutExpo, easeIO3, easeOutBack]) {
      expect(f(0)).toBeCloseTo(0, 6);
      expect(f(1)).toBeCloseTo(1, 6);
    }
  });

  it("easeIO3 中点为 0.5(对称三阶)", () => {
    expect(easeIO3(0.5)).toBeCloseTo(0.5, 6);
  });

  it("超范围输入被夹取,输出仍落在 [0,1]", () => {
    for (const f of [easeOut3, easeOutExpo, easeIO3, easeOutBack]) {
      expect(f(-5)).toBeLessThanOrEqual(1);
      expect(f(-5)).toBeGreaterThanOrEqual(0);
      expect(f(7)).toBeLessThanOrEqual(1);
      expect(f(7)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("节奏函数", () => {
  it("enter:delay 前为 0,delay+dur 后为 1", () => {
    expect(enter(0.02, 0.05, 0.4)).toBe(0);
    expect(enter(1.0, 0.05, 0.4)).toBe(1);
  });

  it("item:第 i 条按 delay+i*step 依次进场", () => {
    expect(item(0.1, 0, 1, 0.45, 0.2)).toBe(0); // 第 1 条还没过 delay
    expect(item(0.1, 3, 1, 0.45, 0.2)).toBe(0); // 第 4 条 3.2s 才开始,远没轮到
    expect(item(2.0, 1, 1, 0.45, 0.2)).toBe(1); // 第 2 条 1.2s 开始,2.0s 已完成
    expect(item(4.0, 3, 1, 0.45, 0.2)).toBe(1); // 第 4 条 3.65s 完成
  });

  it("outro:dur 未知恒 0;末尾 out 秒从 0 涨到 1", () => {
    expect(outro(5, 0)).toBe(0);
    expect(outro(4.4, 5, 0.5)).toBe(0);
    expect(outro(4.75, 5, 0.5)).toBeCloseTo(0.5, 6);
    expect(outro(5, 5, 0.5)).toBe(1);
  });

  it("count:起于 0,滚完等于 value", () => {
    expect(count(0, 1000)).toBe(0);
    expect(count(10, 1000)).toBe(1000);
    const mid = count(0.85, 1000); // delay 0.25 + grow 1.2 的一半
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1000);
  });
});

describe("fmtTime", () => {
  it("mm:ss.d 格式,分与秒补零", () => {
    expect(fmtTime(0)).toBe("00:00.0");
    expect(fmtTime(9.98)).toBe("00:10.0");
    expect(fmtTime(65.5)).toBe("01:05.5");
  });
});
