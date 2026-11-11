/* 要点芯片(白):圆点 + 混色文字芯片逐条弹入,复现发布信息逐条弹出 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { FONT } from "./shared";
import { Mixed, QSHADOW_S, TONE_OPTIONS, pop, toneColor } from "./qbmShared";

const def: CardDef<any> = {
  kind: "factChip",
  name: "要点芯片",
  desc: "白底要点芯片逐条弹入:圆点+混色文字(*色词*),复现情报马发布信息条",
  defaults: {
    chips: "昨天凌晨 *02:00*|发布 *旗舰模型 3.1 Pro*",
    tone: "blue",
    stepMs: 260,
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "chips", label: "芯片(| 分条,*色词*)", type: "textarea", rows: 3 },
    { k: "tone", label: "强调色", type: "select", options: TONE_OPTIONS },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 80, max: 800, step: 20, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const color = toneColor(p.tone);
    const step = Math.max(0.02, (Number(p.stepMs) || 260) / 1000);
    const chips = String(p.chips || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    return (
      <div style={{ ...FONT, display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start" }}>
        {chips.map((c, i) => {
          const pp = pop(t, 0.15 + i * step, 0.4);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "#fff",
                borderRadius: 20,
                boxShadow: QSHADOW_S,
                padding: "16px 30px",
                transform: `scale(${pp.scale})`,
                opacity: pp.opacity,
                transformOrigin: "left center",
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.3 }}>
                <Mixed text={c} color={color} />
              </span>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
