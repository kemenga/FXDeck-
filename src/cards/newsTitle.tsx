/* 资讯标题卡(白):kicker 日期行 + 大标题(*色词*强调) + 动作药丸弹入
   复现情报马白底标题卡(如「Kimi K3.1 Pro 测评来了」) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { FONT, MONO } from "./shared";
import { Mixed, QBM, QSHADOW, TONE_OPTIONS, pop, slide, toneColor } from "./qbmShared";

const def: CardDef<any> = {
  kind: "newsTitle",
  name: "资讯标题卡",
  desc: "白底资讯开场:kicker 日期行 + 大标题(*色词*) + 动作药丸弹入,复现情报马标题卡",
  defaults: {
    kicker: "2026.10.24 · 新模型实测",
    title: "Kimi K3.1 *Pro*",
    pill: "测评来了",
    tone: "blue",
    pos: "top",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉行(日期·栏目,可空)", type: "text" },
    { k: "title", label: "大标题(*色词*强调)", type: "text" },
    { k: "pill", label: "动作药丸(可空)", type: "text" },
    { k: "tone", label: "强调色", type: "select", options: TONE_OPTIONS },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const color = toneColor(p.tone);
    const sl = slide(t, 0.05, 0.4, -24);
    const pp = pop(t, 0.55, 0.4);
    return (
      <div
        style={{
          ...FONT,
          background: "#fff",
          borderRadius: 30,
          boxShadow: QSHADOW,
          padding: "34px 52px 38px",
          textAlign: "center",
          opacity: sl.opacity,
          transform: `translateY(${sl.dy}px)`,
          minWidth: 560,
        }}
      >
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 26, fontWeight: 700, color: QBM.sky, letterSpacing: "0.3em", marginBottom: 14 }}>
            {String(p.kicker)}
          </div>
        ) : null}
        <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1.25, color: QBM.ink }}>
          <Mixed text={p.title} color={color} />
        </div>
        {p.pill ? (
          <div
            style={{
              display: "inline-block",
              marginTop: 26,
              padding: "10px 34px",
              borderRadius: 999,
              background: color,
              color: "#fff",
              fontSize: 33,
              fontWeight: 800,
              transform: `scale(${pp.scale})`,
              opacity: pp.opacity,
              boxShadow: `0 8px 26px ${color}55`,
            }}
          >
            {String(p.pill)}
          </div>
        ) : null}
      </div>
    );
  },
};

export default def;
