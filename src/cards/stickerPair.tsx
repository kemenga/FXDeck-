/* 贴纸标签:白底纸感便签依次弹出,微旋转 + 顶部胶带贴条(对比/结论的轻量标注) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOutBack } from "../core/anim";
import { FONT } from "./shared";

/** 每张贴纸的固定倾角:像手贴上去的,不到正 */
const ROTS = [-3, 2.4, -1.6];

const def: CardDef<any> = {
  kind: "stickerPair",
  name: "贴纸标签",
  desc: "白底纸感便签依次弹出,微旋转像手贴上去的。轻量对比/结论标注。条目用 | 分隔(2-3 条)",
  defaults: {
    items: "GPT 是工程思维|Claude 是哲学思维",
    stepMs: 700,
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "items", label: "标签(| 分隔,2-3 条)", type: "textarea", rows: 2 },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 300, max: 3000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    // 与 danmaku/triCompare 同约定:| 分隔(splitItems 是 / 分隔,勿混用)
    const rows = String(p.items || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (!rows.length) return null;
    const step = Math.max(0.25, (Number(p.stepMs) || 700) / 1000);
    return (
      <div style={{ ...FONT, display: "flex", alignItems: "center", gap: 40 }}>
        {rows.map((txt, i) => {
          const pop = easeOutBack((t - (0.15 + i * step)) / 0.45);
          return (
            <div
              key={i}
              style={{
                position: "relative",
                opacity: clamp01(pop * 2.5),
                transform: `rotate(${ROTS[i % 3]}deg) scale(${Math.max(0.001, pop).toFixed(3)})`,
              }}
            >
              {/* 顶部胶带贴条:半透明,压住纸边 */}
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  width: 88,
                  height: 26,
                  transform: "translateX(-50%) rotate(-2deg)",
                  background: "rgba(255,255,255,.55)",
                  border: "1px solid rgba(255,255,255,.45)",
                  borderRadius: 3,
                }}
              />
              <div
                style={{
                  background: "#f6f4ee",
                  color: "#1c1e22",
                  borderRadius: 8,
                  padding: "24px 36px",
                  fontSize: 38,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  boxShadow: "0 18px 44px rgba(0,0,0,.45)",
                }}
              >
                {txt}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
