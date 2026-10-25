/* VS 对比卡:两方对撞,胜者高亮、败者退让 */
import type { ReactNode } from "react";
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOut3, easeOutBack, enter } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "versusCard",
  name: "VS 对比卡",
  desc: "两个方法/工具对撞。胜者亮边框,败者自动退让(winner 填 a/b/none)",
  defaults: {
    aTitle: "手动写",
    aSub: "半天一份",
    bTitle: "AI 生成",
    bSub: "两分钟",
    winner: "b",
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "aTitle", label: "左方标题", type: "text" },
    { k: "aSub", label: "左方小注", type: "text" },
    { k: "bTitle", label: "右方标题", type: "text" },
    { k: "bSub", label: "右方小注", type: "text" },
    {
      k: "winner",
      label: "胜者",
      type: "select",
      options: [
        { label: "右方 B", value: "b" },
        { label: "左方 A", value: "a" },
        { label: "不分胜负", value: "none" },
      ],
    },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const enL = enter(t, 0.1, 0.45);
    const enR = enter(t, 0.22, 0.45);
    const vs = easeOutBack((t - 0.55) / 0.35);
    const decide = easeOut3((t - 1.0) / 0.4);
    const winner = String(p.winner || "none");
    const glowA = winner === "a" ? decide : 0;
    const glowB = winner === "b" ? decide : 0;
    const dimA = winner === "b" ? 1 - decide * 0.4 : 1;
    const dimB = winner === "a" ? 1 - decide * 0.4 : 1;
    const panel = (title: string, sub: string, en: number, dim: number, glow: number, fromLeft: boolean): ReactNode => (
      <div
        className="glass"
        style={{
          width: 380,
          padding: "34px 30px",
          textAlign: "center",
          opacity: en * dim,
          transform: `translateX(${((1 - en) * (fromLeft ? -46 : 46)).toFixed(1)}px) scale(${(1 + glow * 0.04).toFixed(3)})`,
          border: glow > 0.05 ? `2px solid var(--acc)` : "2px solid rgba(255,255,255,.09)",
          boxShadow: glow > 0.05 ? "0 0 46px rgba(62,197,214,.30), 0 26px 60px rgba(0,0,0,.45)" : "0 26px 60px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, color: glow > 0.5 ? "var(--acc)" : "#f4f7fa", lineHeight: 1.25 }}>{title}</div>
        {sub ? <div style={{ fontSize: 23, color: "rgba(244,247,250,.6)", marginTop: 10 }}>{sub}</div> : null}
      </div>
    );
    return (
      <div style={{ ...FONT, display: "flex", alignItems: "center" }}>
        {panel(String(p.aTitle || "A"), String(p.aSub || ""), enL, dimA, glowA, true)}
        <div
          style={{
            flex: "none",
            width: 78,
            height: 78,
            borderRadius: "50%",
            margin: "0 22px",
            background: "var(--acc)",
            color: "#06272b",
            fontSize: 30,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${vs.toFixed(3)})`,
            boxShadow: "0 10px 30px rgba(0,0,0,.4)",
            opacity: clamp01(vs * 2),
          }}
        >
          VS
        </div>
        {panel(String(p.bTitle || "B"), String(p.bSub || ""), enR, dimB, glowB, false)}
      </div>
    );
  },
};

export default def;
