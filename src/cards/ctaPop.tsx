/* CTA组合(白):心形上浮 + 点赞白药丸 + 关注粉药丸弹簧弹入,复现片尾求赞关注 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { FONT } from "./shared";
import { QBM, QSHADOW_S, pop } from "./qbmShared";

const def: CardDef<any> = {
  kind: "ctaPop",
  name: "CTA组合",
  desc: "片尾求赞关注:心形上浮 + 点赞白药丸 + 关注粉药丸 + 可选结语",
  defaults: {
    heart: true,
    likeText: "👍 点赞",
    followText: "+ 关注",
    note: "感谢大家",
    pos: "bottom",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "heart", label: "心形上浮", type: "toggle" },
    { k: "likeText", label: "点赞药丸(可空)", type: "text" },
    { k: "followText", label: "关注药丸(可空)", type: "text" },
    { k: "note", label: "结语药丸(可空)", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const heartOn = !!p.heart;
    const hp = pop(t, 0.15, 0.45);
    const float = Math.sin(t * 2.2) * 9;
    const lp = pop(t, 0.55, 0.42);
    const fp = pop(t, 0.75, 0.42);
    const np = pop(t, 1.05, 0.4);
    const pill = (bg: string, fg: string, pp: { scale: number; opacity: number }, rot: number): React.CSSProperties => ({
      background: bg,
      color: fg,
      borderRadius: 999,
      padding: "14px 34px",
      fontSize: 40,
      fontWeight: 900,
      boxShadow: QSHADOW_S,
      whiteSpace: "pre",
      transform: `scale(${pp.scale}) rotate(${rot}deg)`,
      opacity: pp.opacity,
    });
    return (
      <div style={{ ...FONT, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        {heartOn ? (
          <span
            style={{
              fontSize: 110,
              lineHeight: 1,
              transform: `scale(${hp.scale}) translateY(${float.toFixed(1)}px)`,
              opacity: hp.opacity,
              filter: "drop-shadow(0 8px 20px rgba(242,109,141,.45))",
            }}
          >
            ❤️
          </span>
        ) : null}
        <div style={{ display: "flex", gap: 20 }}>
          {p.likeText ? <span style={pill("#fff", QBM.ink, lp, -2)}>{String(p.likeText)}</span> : null}
          {p.followText ? <span style={pill(QBM.pink, "#fff", fp, 2)}>{String(p.followText)}</span> : null}
        </div>
        {p.note ? (
          <span
            style={{
              background: "#fff",
              color: QBM.ink,
              borderRadius: 18,
              boxShadow: QSHADOW_S,
              padding: "10px 28px",
              fontSize: 30,
              fontWeight: 800,
              transform: `scale(${np.scale})`,
              opacity: np.opacity,
            }}
          >
            {String(p.note)}
          </span>
        ) : null}
      </div>
    );
  },
};

export default def;
