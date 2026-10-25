/* 数据类卡:数字大卡 / 横条排名 —— 全部原创视觉设计 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { count, easeOut3, enter } from "../core/anim";

/* ── 数字大卡:kicker + 滚动计数 + 单位 + 脚注 ── */
export const bigNumber: CardDef<any> = {
  kind: "bigNumber",
  name: "数字大卡",
  desc: "里程碑/成绩/金额:巨号滚动计数,一行小注",
  defaults: { kicker: "MILESTONE", value: "10000", unit: "粉", note: "三个月达成", pos: "right", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "kicker", label: "眉题(英文等宽)", type: "text" },
    { k: "value", label: "数字", type: "text" },
    { k: "unit", label: "单位", type: "text" },
    { k: "note", label: "小注", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const val = Number(p.value) || 0;
    const shown = count(t, val);
    const en = enter(t);
    const tick = easeOut3((t - 1.6) / 0.4); // 小注稍后出现
    return (
      <div className="glass" style={{ minWidth: 420, padding: "34px 46px", fontFamily: "var(--deck-font)", opacity: en, transform: `translateY(${((1 - en) * 20).toFixed(1)}px)` }}>
        {p.kicker ? (
          <div style={{ fontSize: 20, letterSpacing: "0.34em", fontWeight: 700, color: "var(--acc)", fontFamily: "var(--deck-mono)", marginBottom: 10 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 148, fontWeight: 900, lineHeight: 1, color: "#f4f7fa", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
            {shown.toLocaleString("en-US")}
          </span>
          {p.unit ? <span style={{ fontSize: 46, fontWeight: 800, color: "var(--acc)" }}>{String(p.unit)}</span> : null}
        </div>
        {p.note ? (
          <div style={{ fontSize: 27, color: "rgba(244,247,250,.66)", marginTop: 14, opacity: tick }}>{String(p.note)}</div>
        ) : null}
      </div>
    );
  },
};

/* ── 横条排名:条形生长 + 数值滚动 ── */
export const barRank: CardDef<any> = {
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
      <div className="glass" style={{ minWidth: 520, maxWidth: 820, padding: "30px 36px", fontFamily: "var(--deck-font)", opacity: en }}>
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

export const dataCards = [bigNumber, barRank];
