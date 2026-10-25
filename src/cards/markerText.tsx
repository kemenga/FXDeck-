/* 荧光笔:大字先浮现,色块从左往右扫过文字(划重点) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3 } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "markerText",
  name: "荧光笔",
  desc: "划重点:大字浮现后,强调色块从左往右扫过文字",
  defaults: { text: "这一句就是重点", kicker: "划重点", pos: "center", acc: "amber", offX: 0, offY: 0 },
  ctrls: [{ k: "kicker", label: "眉题(可空)", type: "text" }, { k: "text", label: "文字", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const txtIn = easeOut3((t - 0.15) / 0.5);
    const sweep = easeOut3((t - 0.6) / 0.55);
    return (
      <div style={{ ...FONT, textAlign: "center" }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 22, letterSpacing: "0.4em", fontWeight: 700, color: "var(--acc)", opacity: txtIn, marginBottom: 18 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ position: "relative", display: "inline-block", padding: "6px 22px" }}>
          {/* 荧光色块:扫过的部分从底下滑出 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "12%",
              bottom: "12%",
              width: `${(sweep * 100).toFixed(1)}%`,
              borderRadius: 14,
              background: "var(--acc)",
              opacity: 0.32,
            }}
          />
          <span
            style={{
              position: "relative",
              fontSize: 74,
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
