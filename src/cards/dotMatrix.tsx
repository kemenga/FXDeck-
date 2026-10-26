/* 点阵矩阵:噪点小方块按比例随机点亮(数据吸收/占比/概率的隐喻视觉) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOutBack, enter } from "../core/anim";
import { FONT, MONO } from "./shared";

/** 确定性伪随机(固定种子,每帧图案稳定):mulberry32 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const def: CardDef<any> = {
  kind: "dotMatrix",
  name: "点阵矩阵",
  desc: "隐喻视觉:噪点小方块按「占比」随机逐个点亮,讲概率/覆盖率/数据吸收时用",
  defaults: {
    kicker: "训练数据",
    ratio: "30",
    note: "被模型吸收的知识占比",
    cols: "26",
    rows: "14",
    pos: "right",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉题(可空)", type: "text" },
    { k: "ratio", label: "点亮占比(0-100)", type: "text" },
    { k: "note", label: "小注(可空)", type: "text" },
    { k: "cols", label: "列数", type: "range", min: 10, max: 40, step: 1 },
    { k: "rows", label: "行数", type: "range", min: 6, max: 24, step: 1 },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const cols = Math.round(Number(p.cols) || 26);
    const rows = Math.round(Number(p.rows) || 14);
    const total = cols * rows;
    const ratio = Math.min(100, Math.max(0, Number(p.ratio) || 0));
    const lit = Math.round((total * ratio) / 100);
    // 固定种子洗牌出点亮次序:同样的占比每次出现同一批格子
    const order = rng(20260101);
    const rank: number[] = Array.from({ length: total }, (_, i) => ({ i, r: order() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.i);
    const litAt = new Map<number, number>();
    rank.forEach((cell, k) => litAt.set(cell, k < lit ? 0.35 + (k / Math.max(1, lit)) * 1.5 : Infinity));
    const size = 26;
    const gap = 7;
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, padding: "26px 32px 24px", opacity: en }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.3em", fontWeight: 700, color: "var(--acc)", marginBottom: 14 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap }}>
          {Array.from({ length: total }, (_, i) => {
            const at = litAt.get(i) ?? Infinity;
            const pop = at === Infinity ? 0 : easeOutBack((t - at) / 0.3);
            const on = pop > 0.02;
            return (
              <div
                key={i}
                style={{
                  width: size,
                  height: size,
                  borderRadius: 5,
                  background: on ? "var(--acc)" : "rgba(255,255,255,.12)",
                  opacity: on ? clamp01(pop) : 1,
                  transform: on ? `scale(${(0.4 + 0.6 * clamp01(pop)).toFixed(3)})` : undefined,
                  boxShadow: on ? "0 0 10px rgba(62,197,214,.4)" : undefined,
                }}
              />
            );
          })}
        </div>
        {p.note ? <div style={{ fontSize: 24, color: "rgba(244,247,250,.66)", marginTop: 14 }}>{String(p.note)}</div> : null}
      </div>
    );
  },
};

export default def;
