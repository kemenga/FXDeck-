/* 金句药丸:单句短金句弹出 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOutBack } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "punchPill",
  name: "金句药丸",
  desc: "一句话观点弹出定格,比金句卡轻;适合口播中间的顿悟点",
  defaults: {
    text: "收藏 ≠ 学会",
    pos: "bottom",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [{ k: "text", label: "药丸文字", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const pop = easeOutBack((t - 0.1) / 0.42);
    return (
      <div
        className="glass"
        style={{
          ...FONT,
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          padding: "24px 50px",
          borderRadius: 999,
          transform: `scale(${Math.max(0.001, pop).toFixed(3)})`,
          opacity: clamp01(pop * 3),
        }}
      >
        <span style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--acc)", flex: "none", boxShadow: "0 0 16px var(--acc)" }} />
        <span style={{ fontSize: 46, fontWeight: 800, color: "#f4f7fa", whiteSpace: "nowrap" }}>{String(p.text || "")}</span>
      </div>
    );
  },
};

export default def;
