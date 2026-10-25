/* 数字大卡:kicker + 滚动计数 + 单位 + 脚注 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { count, easeOut3, enter } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
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
      <div className="glass" style={{ ...FONT, minWidth: 420, padding: "34px 46px", opacity: en, transform: `translateY(${((1 - en) * 20).toFixed(1)}px)` }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 20, letterSpacing: "0.34em", fontWeight: 700, color: "var(--acc)", marginBottom: 10 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 148, fontWeight: 900, lineHeight: 1, color: "#f4f7fa", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
            {shown.toLocaleString("en-US")}
          </span>
          {p.unit ? <span style={{ fontSize: 46, fontWeight: 800, color: "var(--acc)" }}>{String(p.unit)}</span> : null}
        </div>
        {p.note ? <div style={{ fontSize: 27, color: "rgba(244,247,250,.66)", marginTop: 14, opacity: tick }}>{String(p.note)}</div> : null}
      </div>
    );
  },
};

export default def;
