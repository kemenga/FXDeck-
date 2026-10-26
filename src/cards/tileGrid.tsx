/* 图表瓷片网格:深色小方卡阵列,每格一枚微型图表,逐格弹出(动效库/能力矩阵展示) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOut3, easeOutBack, enter } from "../core/anim";
import { FONT, MONO } from "./shared";

/** 微型图表:kind 决定画哪种,progress 0..1 驱动生长 */
function MiniChart({ kind, progress }: { kind: number; progress: number }) {
  const s = clamp01(progress);
  const stroke = "var(--acc)";
  if (kind % 4 === 0) {
    // 柱状:四根依次生长
    const hs = [0.45, 0.75, 0.55, 1].map((h) => h * s);
    return (
      <svg width="52" height="52" viewBox="0 0 52 52">
        {hs.map((h, i) => (
          <rect key={i} x={7 + i * 11} y={44 - h * 36} width="7" height={Math.max(0.5, h * 36)} rx="2.5" fill={i === 3 ? stroke : "rgba(255,255,255,.4)"} />
        ))}
      </svg>
    );
  }
  if (kind % 4 === 1) {
    // 环形:扫描
    const C = 2 * Math.PI * 17;
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r="17" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="6" />
        <circle
          cx="26"
          cy="26"
          r="17"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C.toFixed(1)}
          strokeDashoffset={(C * (1 - s)).toFixed(1)}
        />
      </svg>
    );
  }
  if (kind % 4 === 2) {
    // 折线:描画
    const LEN = 70;
    return (
      <svg width="52" height="52" viewBox="0 0 52 52">
        <polyline
          points="6,40 19,26 30,32 46,12"
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={String(LEN)}
          strokeDashoffset={String(LEN * (1 - s))}
        />
      </svg>
    );
  }
  // 点阵:逐个亮
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      {Array.from({ length: 9 }, (_, i) => {
        const on = s * 9 > i;
        return <circle key={i} cx={10 + (i % 3) * 16} cy={10 + Math.floor(i / 3) * 16} r="5" fill={on ? stroke : "rgba(255,255,255,.22)"} />;
      })}
    </svg>
  );
}

const def: CardDef<any> = {
  kind: "tileGrid",
  name: "图表瓷片",
  desc: "能力矩阵:2×4 深色小方卡阵列,微图表逐格弹出并生长。展示「一套动效库/工具集」",
  defaults: { kicker: "MOTION LIBRARY", rows: "2", cols: "4", pos: "center", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "kicker", label: "眉题(可空)", type: "text" },
    { k: "rows", label: "行数", type: "range", min: 1, max: 3, step: 1 },
    { k: "cols", label: "列数", type: "range", min: 2, max: 5, step: 1 },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const rows = Math.round(Number(p.rows) || 2);
    const cols = Math.round(Number(p.cols) || 4);
    const total = rows * cols;
    const en = enter(t);
    return (
      <div style={{ ...FONT, textAlign: "center", opacity: en }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.32em", fontWeight: 700, color: "var(--acc)", marginBottom: 16 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 108px)`, gap: 14 }}>
          {Array.from({ length: total }, (_, i) => {
            const pop = easeOutBack((t - (0.2 + i * 0.09)) / 0.4);
            const grow = easeOut3((t - (0.35 + i * 0.09)) / 0.6);
            return (
              <div
                key={i}
                style={{
                  width: 108,
                  height: 108,
                  borderRadius: 18,
                  background: "rgba(255,255,255,.055)",
                  border: "1px solid rgba(255,255,255,.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: clamp01(pop * 2.2),
                  transform: `scale(${Math.max(0.001, pop).toFixed(3)})`,
                  boxShadow: "0 14px 34px rgba(0,0,0,.35)",
                }}
              >
                <MiniChart kind={i} progress={grow} />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

export default def;
