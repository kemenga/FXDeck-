/* 三联对比:三列横评,列顶标签,高亮列描边强调(方案横评/A-B-C 对比) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOut3, easeOutBack, enter } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "triCompare",
  name: "三联对比",
  desc: "三列横评:「名称,小注」×3 用 | 分隔;highlight 选强调列(0/1/2),该列描边+辉光",
  defaults: {
    cols: "GPT 模版,基础水准|GPT + skill,接近可用|Opus 级,断崖领先",
    highlight: "2",
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "cols", label: "三列(名称,小注 | 分隔)", type: "textarea", rows: 2 },
    {
      k: "highlight",
      label: "强调列",
      type: "select",
      options: [
        { label: "第一列", value: "0" },
        { label: "第二列", value: "1" },
        { label: "第三列", value: "2" },
        { label: "不强调", value: "-1" },
      ],
    },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const cols = String(p.cols || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((s) => {
        const [name, sub] = s.split(",").map((x) => x.trim());
        return { name: name ?? "", sub: sub ?? "" };
      });
    if (!cols.length) return null;
    const hi = Number(p.highlight ?? 2);
    const en = enter(t, 0.05, 0.4);
    return (
      <div style={{ ...FONT, display: "flex", alignItems: "stretch", gap: 22, opacity: en }}>
        {cols.map((c, i) => {
          const pop = easeOutBack((t - (0.1 + i * 0.16)) / 0.45);
          const on = i === hi;
          return (
            <div
              key={i}
              className="glass"
              style={{
                width: 380,
                padding: "26px 26px 24px",
                textAlign: "center",
                opacity: clamp01(pop),
                transform: `scale(${Math.max(0.001, pop).toFixed(3)})`,
                border: on ? "2px solid var(--acc)" : "2px solid rgba(255,255,255,.09)",
                boxShadow: on ? "0 0 44px rgba(62,197,214,.28), 0 26px 60px rgba(0,0,0,.45)" : "0 26px 60px rgba(0,0,0,.45)",
                background: on ? "linear-gradient(180deg, rgba(62,197,214,.10), rgba(9,12,16,.92))" : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: on ? "#06272b" : "rgba(244,247,250,.85)",
                  background: on ? "var(--acc)" : "rgba(255,255,255,.1)",
                  borderRadius: 999,
                  padding: "5px 16px",
                  display: "inline-block",
                  marginBottom: 16,
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 750,
                  color: on ? "#f4f7fa" : "rgba(244,247,250,.72)",
                  lineHeight: 1.4,
                  opacity: easeOut3((t - (0.35 + i * 0.16)) / 0.4),
                }}
              >
                {c.sub}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
