/* 打勾清单:条目滑入后勾逐个亮 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3, enter, item } from "../core/anim";
import { FONT, splitItems } from "./shared";

const def: CardDef<any> = {
  kind: "tickList",
  name: "打勾清单",
  desc: "流程逐项完成,勾随讲述节奏亮起。/ 分隔",
  defaults: { title: "搭建步骤", items: "装环境/写脚本/跑起来", stepMs: 1100, pos: "right", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "title", label: "小标题(可空)", type: "text" },
    { k: "items", label: "条目(/ 分隔)", type: "textarea", rows: 3 },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 300, max: 4000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const items = splitItems(p.items);
    const step = Math.max(0.2, (Number(p.stepMs) || 1100) / 1000);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, minWidth: 460, maxWidth: 780, padding: "30px 36px" }}>
        {p.title ? <div style={{ fontSize: 30, fontWeight: 800, color: "#f4f7fa", marginBottom: 16, opacity: en }}>{String(p.title)}</div> : null}
        {items.map((it, i) => {
          const pr = item(t, i, step);
          const tick = easeOut3((t - (0.4 + i * step)) / 0.3);
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
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: tick > 0 ? "var(--acc)" : "rgba(255,255,255,.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${(0.6 + 0.4 * tick).toFixed(3)})`,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path
                    d="M4 10.5 8.2 14.5 16 5.5"
                    fill="none"
                    stroke="#0b0f14"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={tick}
                  />
                </svg>
              </span>
              <span style={{ fontSize: 32, fontWeight: 650, color: "#f4f7fa", opacity: tick > 0.5 ? 1 : 0.82 }}>{it}</span>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
