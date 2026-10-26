/* 手绘圈注:大字浮现后,马克笔椭圆从无到有描画一圈圈住重点(双笔触手绘感) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeIO3, easeOut3 } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "sketchCircle",
  name: "手绘圈注",
  desc: "划重点(手绘版):文字浮现后,马克笔椭圆描画一圈圈住它。比荧光笔更「人味」",
  defaults: { text: "国产模型", kicker: "重点", pos: "center", acc: "amber", offX: 0, offY: 0 },
  ctrls: [{ k: "kicker", label: "眉题(可空)", type: "text" }, { k: "text", label: "被圈的文字", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const txtIn = easeOut3((t - 0.15) / 0.5);
    // 椭圆从顶部顺时针描画一圈;第二笔略延迟、更细更透明,叠出手绘双触感
    const d1 = easeIO3((t - 0.7) / 0.65);
    const d2 = easeIO3((t - 0.92) / 0.6);
    const LEN = 1900;
    const W = 900;
    return (
      <div style={{ ...FONT, textAlign: "center" }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 22, letterSpacing: "0.4em", fontWeight: 700, color: "var(--acc)", opacity: txtIn, marginBottom: 18 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ position: "relative", display: "inline-block", padding: "26px 60px" }}>
          <svg width={W} height={260} viewBox={`0 0 ${W} 260`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            <ellipse
              cx={W / 2}
              cy={130}
              rx={W / 2 - 14}
              ry={106}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={LEN.toFixed(0)}
              strokeDashoffset={(LEN * (1 - d1)).toFixed(1)}
              transform={`rotate(-2.2 ${W / 2} 130)`}
              opacity={0.92}
              style={{ filter: "drop-shadow(0 0 10px rgba(242,181,68,.35))" }}
            />
            <ellipse
              cx={W / 2}
              cy={134}
              rx={W / 2 - 6}
              ry={98}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={LEN.toFixed(0)}
              strokeDashoffset={(LEN * (1 - d2)).toFixed(1)}
              transform={`rotate(1.8 ${W / 2} 130)`}
              opacity={0.5}
            />
          </svg>
          <span
            style={{
              position: "relative",
              fontSize: 96,
              fontWeight: 900,
              color: "#f4f7fa",
              whiteSpace: "nowrap",
              opacity: txtIn,
              transform: `translateY(${((1 - txtIn) * 22).toFixed(1)}px)`,
              textShadow: "0 6px 30px rgba(0,0,0,.35)",
            }}
          >
            {String(p.text || "")}
          </span>
        </div>
      </div>
    );
  },
};

export default def;
