/* 概念大字:单个词句砸落定场 + 衰减余震,当段落视觉锚点用(与钩子大字的逐字浮现、药丸的小巧弹出差异化) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOut3 } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "conceptText",
  name: "概念大字",
  desc: "单句概念砸落定场:特粗大字微旋转 + 余震,段落视觉锚点用(≤8 字)",
  defaults: { text: "断崖领先", kicker: "", sub: "", pos: "center", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "text", label: "概念词(≤8 字)", type: "text" },
    { k: "kicker", label: "英文眉(可空)", type: "text" },
    { k: "sub", label: "小注(可空)", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    // 砸落:1.9 倍透明缩到落定,随后衰减余震(复用印章的震感语言)
    const slam = easeOut3((t - 0.12) / 0.28);
    const shake = t > 0.4 ? Math.sin((t - 0.4) * 30) * Math.exp(-(t - 0.4) * 6) * 1.6 : 0;
    const subIn = clamp01((t - 0.55) / 0.4);
    return (
      <div style={{ ...FONT, textAlign: "center" }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 22, letterSpacing: "0.4em", fontWeight: 700, color: "var(--acc)", opacity: slam, marginBottom: 14 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 190,
            fontWeight: 900,
            lineHeight: 1.05,
            color: "var(--acc)",
            whiteSpace: "nowrap",
            textShadow: "0 14px 50px rgba(0,0,0,.5)",
            opacity: clamp01(slam * 1.4),
            transform: `rotate(-2deg) scale(${(1.9 - 0.9 * slam).toFixed(3)}) translateX(${shake.toFixed(1)}px)`,
          }}
        >
          {String(p.text || "")}
        </div>
        {p.sub ? <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,247,250,.8)", marginTop: 16, opacity: subIn }}>{String(p.sub)}</div> : null}
      </div>
    );
  },
};

export default def;
