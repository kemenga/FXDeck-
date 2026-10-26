/* 倒计时环:数字递减 + 圆环同步收缩(盲测/悬念倒数),最后 3 秒变玫色脉冲 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01 } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "countdownRing",
  name: "倒计时环",
  desc: "悬念倒数徽章:数字递减,圆环同步收缩,最后 3 秒变玫色脉冲。卡片时长 = 倒计时长",
  defaults: { seconds: "10", label: "", pos: "top", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [{ k: "seconds", label: "倒计秒数", type: "text" }, { k: "label", label: "角标文字(可空)", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const total = Math.max(1, Number(p.seconds) || 10);
    const left = Math.max(0, total - t);
    const frac = clamp01(left / total);
    const R = 66;
    const C = 2 * Math.PI * R;
    const urgent = left <= 3 && left > 0;
    // 最后 3 秒:心跳脉冲(scale 随秒节拍起伏)
    const pulse = urgent ? 1 + 0.06 * Math.abs(Math.sin(left * Math.PI)) : 1;
    return (
      <div
        style={{ ...FONT, position: "relative", width: 180, height: 180 + (p.label ? 40 : 0), display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div style={{ position: "relative", width: 180, height: 180, transform: `scale(${pulse.toFixed(3)})` }}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="90" cy="90" r={R} fill="rgba(10,13,17,.82)" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
            <circle
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={urgent ? "var(--danger)" : "var(--acc)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C.toFixed(1)}
              strokeDashoffset={(C * (1 - frac)).toFixed(1)}
              style={{ filter: `drop-shadow(0 0 12px ${urgent ? "rgba(224,122,106,.5)" : "rgba(62,197,214,.45)"})` }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span
              style={{ ...MONO, fontSize: 58, fontWeight: 900, color: urgent ? "var(--danger)" : "#f4f7fa", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
            >
              {Math.ceil(left)}
            </span>
            <span style={{ ...MONO, fontSize: 13, letterSpacing: "0.2em", color: "rgba(244,247,250,.5)", marginTop: 4 }}>SEC</span>
          </div>
        </div>
        {p.label ? (
          <div className="glass" style={{ marginTop: 10, padding: "8px 24px", borderRadius: 999, fontSize: 24, fontWeight: 800, color: "#f4f7fa" }}>
            {String(p.label)}
          </div>
        ) : null}
      </div>
    );
  },
};

export default def;
