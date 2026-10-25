/* 进度环:百分比圆环生长 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOutExpo, enter } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "progressRing",
  name: "进度环",
  desc: "单个百分比指标:圆环生长 + 中央数字滚动(0-100)",
  defaults: {
    kicker: "TRIGGER RATE",
    value: "86",
    unit: "%",
    label: "触发准确率",
    pos: "right",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉题(英文等宽)", type: "text" },
    { k: "value", label: "百分比(0-100)", type: "text" },
    { k: "unit", label: "单位", type: "text" },
    { k: "label", label: "小注", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const val = Math.min(100, Math.max(0, Number(p.value) || 0));
    const grow = easeOutExpo((t - 0.25) / 1.3);
    const shown = Math.round(val * grow);
    const R = 118;
    const C = 2 * Math.PI * R;
    const en = enter(t);
    return (
      <div
        className="glass"
        style={{ ...FONT, width: 360, padding: "26px 30px 30px", textAlign: "center", opacity: en, transform: `translateY(${((1 - en) * 20).toFixed(1)}px)` }}
      >
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 18, letterSpacing: "0.3em", fontWeight: 700, color: "var(--acc)" }}>{String(p.kicker).toUpperCase()}</div>
        ) : null}
        <div style={{ position: "relative", width: 280, height: 280, margin: "10px auto 0" }}>
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="20" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={C.toFixed(1)}
              strokeDashoffset={(C * (1 - (val / 100) * grow)).toFixed(1)}
              style={{ filter: "drop-shadow(0 0 14px rgba(62,197,214,.45))" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 76, fontWeight: 900, color: "#f4f7fa", fontVariantNumeric: "tabular-nums" }}>{shown}</span>
            {p.unit ? <span style={{ fontSize: 30, fontWeight: 800, color: "var(--acc)" }}>{String(p.unit)}</span> : null}
          </div>
        </div>
        {p.label ? <div style={{ fontSize: 26, color: "rgba(244,247,250,.66)", marginTop: 12 }}>{String(p.label)}</div> : null}
      </div>
    );
  },
};

export default def;
