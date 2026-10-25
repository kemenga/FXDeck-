/* 步骤链:横向步骤胶囊,时间推进到哪步亮哪步 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { enter } from "../core/anim";
import { FONT, splitItems } from "./shared";

const def: CardDef<any> = {
  kind: "stepFlow",
  name: "步骤链",
  desc: "横向步骤推进(整章常驻),讲到第几步点亮第几步",
  defaults: { steps: "选题/拍摄/剪辑/发布", stepMs: 2400, pos: "top", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "steps", label: "步骤(/ 分隔)", type: "text" },
    { k: "stepMs", label: "每步时长", type: "range", min: 500, max: 8000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const steps = splitItems(p.steps);
    const stepMs = Math.max(0.5, (Number(p.stepMs) || 2400) / 1000);
    const active = Math.min(steps.length, Math.floor(Math.max(0, t - 0.3) / stepMs) + 1);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, display: "flex", alignItems: "center", gap: 0, padding: "16px 26px", borderRadius: 999, opacity: en }}>
        {steps.map((s, i) => {
          const on = i < active;
          const cur = i === active - 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? (
                <div style={{ width: 46, height: 2, borderRadius: 1, background: on ? "var(--acc)" : "rgba(255,255,255,.14)", margin: "0 10px", transition: "none" }} />
              ) : null}
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: on ? "var(--acc)" : "rgba(255,255,255,.08)",
                    color: on ? "#0b0f14" : "rgba(244,247,250,.5)",
                    fontSize: 14,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--deck-mono)",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 25, fontWeight: 700, color: cur ? "#f4f7fa" : on ? "rgba(244,247,250,.75)" : "rgba(244,247,250,.42)" }}>{s}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
