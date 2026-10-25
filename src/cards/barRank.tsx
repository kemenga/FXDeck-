/* 横条排名:条形生长 + 数值滚动 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { count, easeOut3, enter } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "barRank",
  name: "横条排名",
  desc: "多项对比:「名称,数值」一行一项,| 分隔;条按值生长",
  defaults: {
    title: "各平台涨粉",
    rows: "抖音,4200|B站,1800|小红书,950",
    suffix: "粉",
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "title", label: "标题(可空)", type: "text" },
    { k: "rows", label: "数据行(名称,数值 | 分隔)", type: "textarea", rows: 3 },
    { k: "suffix", label: "数值后缀", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const rows = String(p.rows || "")
      .split("|")
      .map((r) => r.split(",").map((x) => x.trim()))
      .filter((r) => r.length >= 2)
      .map(([name, v]) => ({ name, v: Number(v) || 0 }))
      .sort((a, b) => b.v - a.v);
    const max = Math.max(1, ...rows.map((r) => r.v));
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, minWidth: 520, maxWidth: 820, padding: "30px 36px", opacity: en }}>
        {p.title ? <div style={{ fontSize: 30, fontWeight: 800, color: "#f4f7fa", marginBottom: 18 }}>{String(p.title)}</div> : null}
        {rows.map((r, i) => {
          const gr = easeOut3((t - (0.3 + i * 0.4)) / 0.8);
          const shown = count(t, r.v, 0.3 + i * 0.4, 0.8);
          const top = i === 0;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 1fr 130px", alignItems: "center", gap: 16, padding: "9px 0" }}>
              <span style={{ fontSize: 29, fontWeight: 700, color: top ? "#f4f7fa" : "rgba(244,247,250,.7)", textAlign: "right" }}>{r.name}</span>
              <div style={{ height: 26, borderRadius: 8, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(r.v / max) * 100 * gr}%`,
                    borderRadius: 8,
                    background: top ? "var(--acc)" : "rgba(244,247,250,.28)",
                    boxShadow: top ? "0 0 24px color-mix(in srgb, var(--acc) 45%, transparent)" : undefined,
                  }}
                />
              </div>
              <span style={{ fontSize: 28, fontWeight: 800, color: top ? "var(--acc)" : "rgba(244,247,250,.72)", fontVariantNumeric: "tabular-nums" }}>
                {shown.toLocaleString("en-US")}
                {p.suffix ? <span style={{ fontSize: 19, fontWeight: 600 }}> {String(p.suffix)}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
