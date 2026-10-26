/* 评论弹幕:白底无描边纯圆角气泡,左右错落弹出(模拟观众评论流) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOutBack } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
  kind: "danmaku",
  name: "评论弹幕",
  desc: "观众评论流:白底纯圆角气泡左右错落逐条弹出,模拟真实弹幕。每行一条,行首 > 放右侧",
  defaults: {
    lines: "Opus 5.5 做的动效也太离谱了吧\n> 一句话就 one shot,我直接搞坐\n这审美,设计师都要失业了\n> 可惜我用不上",
    stepMs: 900,
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "lines", label: "评论(每行一条,> 开头=右侧)", type: "textarea", rows: 4 },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 300, max: 3000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const rows = String(p.lines || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    const step = Math.max(0.25, (Number(p.stepMs) || 900) / 1000);
    return (
      <div style={{ ...FONT, position: "relative", width: 1240, minHeight: rows.length * 92 }}>
        {rows.map((raw, i) => {
          const right = raw.startsWith(">");
          const text = right ? raw.slice(1).trim() : raw;
          const pop = easeOutBack((t - (0.1 + i * step)) / 0.42);
          // 左右交替 + 奇偶行错落横移,避免排成整齐两列
          const sideShift = right ? 60 - (i % 2) * 96 : -40 + (i % 2) * 84;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * 92,
                [right ? "right" : "left"]: 0,
                marginLeft: right ? undefined : sideShift,
                marginRight: right ? sideShift : undefined,
                opacity: clamp01(pop * 2),
                transform: `scale(${Math.max(0.001, pop).toFixed(3)}) translateX(${(1 - pop) * (right ? 30 : -30)}px)`,
                transformOrigin: right ? "right center" : "left center",
              }}
            >
              <div
                style={{
                  background: "#f6f7f9",
                  color: "#171a1f",
                  borderRadius: 22,
                  padding: "18px 32px",
                  fontSize: 32,
                  fontWeight: 650,
                  lineHeight: 1.4,
                  boxShadow: "0 16px 40px rgba(0,0,0,.42)",
                  whiteSpace: "nowrap",
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export default def;
