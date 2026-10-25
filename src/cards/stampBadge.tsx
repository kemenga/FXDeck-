/* 印章:圆形图章砸下 + 冲击环,盖「判定」 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOutBack, easeOutExpo } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "stampBadge",
  name: "印章",
  desc: "盖判定:「亲测可用」「无效别学」。砸下回弹 + 冲击扩散环",
  defaults: { text: "亲测可用", sub: "2026.10 实测", pos: "right", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "text", label: "印章文字(≤6字)", type: "text" },
    { k: "sub", label: "小字(可空)", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const slam = easeOutBack((t - 0.15) / 0.38);
    const ring = easeOutExpo((t - 0.5) / 0.55);
    // 落章后的余震:衰减正弦
    const shake = t > 0.53 ? Math.sin((t - 0.53) * 34) * Math.exp(-(t - 0.53) * 5) * 2.4 : 0;
    const rot = -9 + shake;
    return (
      <div style={{ ...FONT, position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* 冲击扩散环 */}
        {ring > 0.01 && ring < 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid var(--acc)",
              transform: `scale(${(1 + ring * 0.7).toFixed(3)})`,
              opacity: (1 - ring) * 0.7,
            }}
          />
        ) : null}
        <div
          style={{
            width: 250,
            height: 250,
            borderRadius: "50%",
            border: "6px solid var(--acc)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${Math.max(0.001, slam).toFixed(3)}) rotate(${rot.toFixed(2)}deg)`,
            opacity: clamp01(slam * 3),
            boxShadow: "0 0 40px rgba(62,197,214,.25)",
          }}
        >
          <span style={{ fontSize: 52, fontWeight: 900, color: "var(--acc)", letterSpacing: "0.06em", lineHeight: 1.2, textAlign: "center", padding: "0 12px" }}>
            {String(p.text || "")}
          </span>
          {p.sub ? (
            <span style={{ ...MONO, fontSize: 16, color: "rgba(244,247,250,.55)", marginTop: 10, letterSpacing: "0.14em" }}>{String(p.sub)}</span>
          ) : null}
        </div>
      </div>
    );
  },
};

export default def;
