/* 要点钉板:编号点 + 条目逐条滑入,讲过不撤 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { enter, item } from "../core/anim";
import { FONT, splitItems } from "./shared";

const def: CardDef<any> = {
  kind: "pinList",
  name: "要点钉板",
  desc: "2-4 条短要点逐条钉住,讲过的留在画面上。/ 分隔",
  defaults: { title: "三个要点", items: "第一条要点/第二条要点/第三条要点", stepMs: 900, pos: "left", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "title", label: "小标题(可空)", type: "text" },
    { k: "items", label: "要点(/ 分隔)", type: "textarea", rows: 3 },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 300, max: 4000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const items = splitItems(p.items);
    const step = Math.max(0.2, (Number(p.stepMs) || 900) / 1000);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, minWidth: 460, maxWidth: 780, padding: "30px 36px" }}>
        {p.title ? <div style={{ fontSize: 30, fontWeight: 800, color: "#f4f7fa", marginBottom: 16, opacity: en }}>{String(p.title)}</div> : null}
        {items.map((it, i) => {
          const pr = item(t, i, step);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "10px 0",
                opacity: pr,
                transform: `translateX(${((1 - pr) * -22).toFixed(1)}px)`,
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(255,255,255,.07)",
                  border: `1.5px solid ${i === 0 ? "var(--acc)" : "rgba(255,255,255,.14)"}`,
                  color: i === 0 ? "var(--acc)" : "rgba(244,247,250,.55)",
                  fontSize: 19,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--deck-mono)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 32, fontWeight: 650, color: "#f4f7fa" }}>{it}</span>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
