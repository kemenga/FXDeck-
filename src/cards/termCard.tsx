/* 术语卡:英文原名 + 中文术语 + 一句话定义 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3, enter, item } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "termCard",
  name: "术语卡",
  desc: "出现新概念时钉一张:英文名 + 中文术语 + 一句话定义",
  defaults: {
    en: "SKILL",
    term: "Skill · 技能",
    def: "给 AI 的一份可复用工作流说明书",
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "en", label: "英文原名(可空)", type: "text" },
    { k: "term", label: "术语", type: "text" },
    { k: "def", label: "一句话定义", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const bar = easeOut3((t - 0.05) / 0.35);
    const en = enter(t, 0.15, 0.4);
    const term = item(t, 0, 0.01, 0.45, 0.28);
    const def = item(t, 0, 0.01, 0.45, 0.5);
    return (
      <div
        className="glass"
        style={{
          ...FONT,
          minWidth: 520,
          maxWidth: 780,
          padding: "30px 40px",
          borderLeft: `5px solid var(--acc)`,
          borderLeftWidth: `${(5 * bar).toFixed(1)}px`,
          opacity: bar > 0 ? 1 : 0,
        }}
      >
        {p.en ? (
          <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.32em", fontWeight: 700, color: "var(--acc)", opacity: en }}>
            {String(p.en).toUpperCase()}
          </div>
        ) : null}
        <div style={{ fontSize: 56, fontWeight: 900, color: "#f4f7fa", marginTop: 8, opacity: term, transform: `translateY(${((1 - term) * 16).toFixed(1)}px)` }}>
          {String(p.term || "")}
        </div>
        {p.def ? (
          <div style={{ fontSize: 27, color: "rgba(244,247,250,.66)", marginTop: 14, opacity: def, transform: `translateY(${((1 - def) * 10).toFixed(1)}px)` }}>
            {String(p.def)}
          </div>
        ) : null}
      </div>
    );
  },
};

export default def;
