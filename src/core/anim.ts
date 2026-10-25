/* 缓动与节奏工具:卡片渲染只许用这里的纯函数,不许自己开定时器 */
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut3 = (p: number) => 1 - (1 - clamp01(p)) ** 3;
export const easeOutExpo = (p: number) => (p >= 1 ? 1 : 1 - 2 ** (-10 * clamp01(p)));
export const easeIO3 = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
/** 回弹:过冲后落定,弹窗/徽章弹出用 */
export const easeOutBack = (p: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp01(p);
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

/** 整卡进场(0→1,delay 后 dur 秒内完成) */
export const enter = (t: number, delay = 0.05, dur = 0.4) => easeOut3((t - delay) / dur);

/** 逐条进场:第 i 条在 delay + i*step 时出发 */
export const item = (t: number, i: number, step: number, dur = 0.45, delay = 0.2) =>
  easeOut3((t - (delay + i * step)) / dur);

/** 退场(0→1):dur 已知时,最后 out 秒淡出+轻微下移;dur 未知恒 0 */
export const outro = (t: number, dur: number, out = 0.3) =>
  dur > 0 ? clamp01((t - (dur - out)) / out) : 0;

/** 数字滚动:0→value,从 delay 起 grow 秒滚完 */
export const count = (t: number, value: number, delay = 0.25, grow = 1.2) =>
  Math.round(value * easeOutExpo((t - delay) / grow));

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`;
};
