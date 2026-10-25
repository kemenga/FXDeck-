/* 多指标条:2-3 个数字并排 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { count, enter, item } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "statStrip",
  name: "多指标条",
  desc: "一组关键数字并排。格式「标签,数值,单位」多条用 | 分隔",
  defaults: {
    items: "省时,70,%|成本,0,元|上手,5,分钟",
    pos: "bottom",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "items", label: "指标(标签,数值,单位 | 分隔)", type: "textarea", rows: 2 },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const cells = String(p.items || "")
      .split("|")
      .map((s) => s.split(",").map((x) => x.trim()))
      .filter((r) => r.length >= 2 && r[0])
      .map(([label, v, unit]) => ({ label, v: Number(v.replace(/[^\d.-]/g, "")) || 0, rawV: v, unit: unit ?? "" }));
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, display: "flex", alignItems: "center", padding: "26px 14px", opacity: en }}>
        {cells.map((c, i) => {
          const shown = count(t, c.v, 0.25 + i * 0.3, 1.0);
          const pr = item(t, i, 0.3, 0.4, 0.15);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", opacity: pr }}>
              {i > 0 ? <div style={{ width: 1, height: 74, background: "rgba(255,255,255,.14)", margin: "0 30px" }} /> : null}
              <div style={{ textAlign: "center", padding: "0 26px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5 }}>
                  <span style={{ fontSize: 62, fontWeight: 900, color: "#f4f7fa", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {c.v ? shown.toLocaleString("en-US") : c.rawV}
                  </span>
                  {c.unit ? <span style={{ fontSize: 26, fontWeight: 800, color: "var(--acc)" }}>{c.unit}</span> : null}
                </div>
                <div style={{ fontSize: 21, color: "rgba(244,247,250,.6)", marginTop: 8 }}>{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
