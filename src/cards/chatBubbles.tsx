/* 对话气泡:我 vs AI 的问答演示。行首 `>` = AI(右),无 = 用户(左) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3 } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "chatBubbles",
  name: "对话气泡",
  desc: "演示与 AI 的对话。每行一条,行首 `>` 是 AI(右侧),否则用户(左侧)",
  defaults: {
    lines: "帮我写个周报 skill\n> 先回答我 4 个问题\n省时间,全自动那种\n> 已生成,评分 9.1",
    stepMs: 1100,
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "lines", label: "对话(每行一条,`>` 开头=AI)", type: "textarea", rows: 4 },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 300, max: 3000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const rows = String(p.lines || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const step = Math.max(0.25, (Number(p.stepMs) || 1100) / 1000);
    return (
      <div style={{ ...FONT, display: "flex", flexDirection: "column", gap: 14, width: 760 }}>
        {rows.map((raw, i) => {
          const isAI = raw.startsWith(">");
          const text = isAI ? raw.slice(1).trim() : raw;
          const pr = easeOut3((t - (0.2 + i * step)) / 0.42);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isAI ? "flex-end" : "flex-start",
                opacity: pr,
                transform: `translateX(${((1 - pr) * (isAI ? 36 : -36)).toFixed(1)}px)`,
              }}
            >
              <div
                className="glass"
                style={{
                  maxWidth: 560,
                  padding: "16px 26px",
                  borderRadius: 18,
                  borderBottomRightRadius: isAI ? 5 : 18,
                  borderBottomLeftRadius: isAI ? 18 : 5,
                  fontSize: 29,
                  fontWeight: 650,
                  color: isAI ? "var(--acc)" : "#f4f7fa",
                  border: isAI ? "1.5px solid var(--acc)" : undefined,
                  lineHeight: 1.45,
                }}
              >
                {isAI ? <span style={{ ...MONO, fontSize: 17, fontWeight: 700, letterSpacing: "0.18em", opacity: 0.75, marginRight: 10 }}>AI</span> : null}
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
