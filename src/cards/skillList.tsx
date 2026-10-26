/* 等宽清单:眉标 + 右上计数大数字滚动 + 等宽 checklist 逐条(技能/规则/文件清单) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { count, enter, item } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "skillList",
  name: "等宽清单",
  desc: "技术感清单卡:眉标 + 右上角计数滚动,每行 ✓ 前缀逐条点亮。每行一条,换行分隔",
  defaults: {
    kicker: "已学到的 skills",
    count: "127",
    lines: "phonetic-script-director\nreading-note\nstyle-slate\nmotion-explainer",
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉题", type: "text" },
    { k: "count", label: "计数(可空)", type: "text" },
    { k: "lines", label: "清单行(每行一条)", type: "textarea", rows: 6 },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const rows = String(p.lines || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const total = Number(String(p.count).replace(/[^\d.]/g, "")) || 0;
    const en = enter(t);
    const shown = count(t, total, 0.3, 1.4);
    return (
      <div
        className="glass"
        style={{
          ...FONT,
          minWidth: 560,
          maxWidth: 700,
          padding: "26px 30px 24px",
          opacity: en,
          transform: `translateY(${((1 - en) * 18).toFixed(1)}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 16 }}>
          <div style={{ ...MONO, fontSize: 20, fontWeight: 700, color: "var(--acc)", letterSpacing: "0.06em", paddingTop: 14 }}>{String(p.kicker || "")}</div>
          {total > 0 ? (
            <span style={{ ...MONO, fontSize: 72, fontWeight: 900, lineHeight: 1, color: "#f4f7fa", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(shown).toLocaleString("en-US")}
            </span>
          ) : null}
        </div>
        <div style={{ ...MONO, display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map((r, i) => {
            const pr = item(t, i, 0.35, 0.4, 0.4);
            return (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 21, opacity: pr, transform: `translateX(${((1 - pr) * -14).toFixed(1)}px)` }}
              >
                <span style={{ color: "var(--acc)", fontWeight: 800 }}>✓</span>
                <span style={{ color: "rgba(244,247,250,.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

export default def;
