/* CTA 气泡:强调色实底圆角气泡带小尾巴,白勾 + 砸入落定(行动号召/结论引导) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOutBack, easeOutExpo } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "ctaBubble",
  name: "CTA 气泡",
  desc: "行动号召:实底气泡带小尾巴,白勾弹出砸落。比印章轻,比药丸重",
  defaults: { text: "更新就能用", sub: "", pos: "bottom", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [{ k: "text", label: "气泡文字", type: "text" }, { k: "sub", label: "尾巴下小字(可空)", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const pop = easeOutBack((t - 0.12) / 0.42);
    // 砸落后轻微回正:从 -4° 摆到 0
    const rot = (1 - clamp01((t - 0.12) / 0.55)) * -4;
    const ring = easeOutExpo((t - 0.45) / 0.5);
    return (
      <div style={{ ...FONT, position: "relative", display: "inline-block" }}>
        {ring > 0.01 && ring < 1 ? (
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 30,
              border: "2.5px solid var(--acc)",
              transform: `scale(${(1 + ring * 0.25).toFixed(3)})`,
              opacity: (1 - ring) * 0.6,
            }}
          />
        ) : null}
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            background: "var(--acc)",
            color: "#06272b",
            borderRadius: 26,
            borderBottomLeftRadius: 7,
            padding: "22px 42px 22px 30px",
            transform: `rotate(${rot.toFixed(2)}deg) scale(${Math.max(0.001, pop).toFixed(3)})`,
            transformOrigin: "left bottom",
            opacity: clamp01(pop * 3),
            boxShadow: "0 22px 50px rgba(0,0,0,.45), 0 0 30px rgba(62,197,214,.25)",
          }}
        >
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "rgba(6,39,43,.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26">
              <path d="M4.5 13.5 10.5 19.5 21.5 6.5" fill="none" stroke="#06272b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ fontSize: 44, fontWeight: 900, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{String(p.text || "")}</span>
        </div>
        {p.sub ? (
          <div style={{ marginTop: 14, fontSize: 24, fontWeight: 700, color: "rgba(244,247,250,.75)", textAlign: "center" }}>{String(p.sub)}</div>
        ) : null}
      </div>
    );
  },
};

export default def;
