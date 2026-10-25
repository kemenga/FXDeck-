/* 箭头链:阶段节点依次弹出,箭头逐段画出(管线/流转图) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOut3, easeOutBack } from "../core/anim";
import { FONT, splitItems } from "./shared";

const def: CardDef<any> = {
  kind: "arrowFlow",
  name: "箭头链",
  desc: "流程管线:字幕 → JSON → 成片。节点逐个弹出,箭头逐段画出",
  defaults: { items: "SRT 字幕/编排 JSON/透明动效层/剪映成片", stepMs: 900, pos: "center", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "items", label: "节点(/ 分隔)", type: "text" },
    { k: "stepMs", label: "逐个间隔", type: "range", min: 300, max: 3000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const nodes = splitItems(p.items);
    const step = Math.max(0.25, (Number(p.stepMs) || 900) / 1000);
    return (
      <div style={{ ...FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {nodes.map((n, i) => {
          const pop = easeOutBack((t - (0.15 + i * step)) / 0.4);
          const arrow = easeOut3((t - (0.15 + i * step + step * 0.45)) / (step * 0.5));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? (
                <svg width="72" height="22" viewBox="0 0 72 22" style={{ margin: "0 12px", flex: "none", transform: `scaleX(${arrow.toFixed(3)})`, transformOrigin: "left center", opacity: arrow > 0.02 ? 1 : 0 }}>
                  <line x1="0" y1="11" x2="58" y2="11" stroke="var(--acc)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M56 3 L70 11 L56 19 Z" fill="var(--acc)" />
                </svg>
              ) : null}
              <div
                className="glass"
                style={{
                  padding: "16px 26px",
                  borderRadius: 14,
                  fontSize: 30,
                  fontWeight: 750,
                  color: i === nodes.length - 1 ? "var(--acc)" : "#f4f7fa",
                  border: i === nodes.length - 1 ? "1.5px solid var(--acc)" : undefined,
                  transform: `scale(${Math.max(0.001, pop).toFixed(3)})`,
                  opacity: clamp01(pop * 2.5),
                  whiteSpace: "nowrap",
                }}
              >
                {n}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
