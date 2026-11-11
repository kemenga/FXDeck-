/* 连线脑图(白):上排圆片(模型) + 下排瓷片(工具)逐个弹入,然后画连线
   复现情报马开场「模型↔Agent 双列连线」动画 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3 } from "../core/anim";
import { FONT } from "./shared";
import { QBM, QSHADOW, QSHADOW_S, pop } from "./qbmShared";

const W = 960;
const TOP_Y = 59; // 上排圆片中心
const BOT_Y = 289; // 下排瓷片中心

const def: CardDef<any> = {
  kind: "mindMap",
  name: "连线脑图",
  desc: "上排圆片+下排瓷片逐个弹入,再画连线(上-下索引对):0-0/1-3",
  defaults: {
    top: "DeepSeek,🐳|Kimi,K|MiniMax,M",
    bottom: "Claude Code,🐯|Codex,🌀|OpenCode,⬛|Qoder,Q",
    lines: "0-0|0-1|1-3|2-0|2-2",
    stepMs: 180,
    drawAt: 1.2,
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "top", label: "上排(名称,logo | 分隔)", type: "textarea", rows: 2 },
    { k: "bottom", label: "下排(名称,logo | 分隔)", type: "textarea", rows: 2 },
    { k: "lines", label: "连线(上-下 对,| 分隔)", type: "textarea", rows: 2 },
    { k: "stepMs", label: "逐个间隔", type: "range", min: 80, max: 500, step: 20, unit: "ms" },
    { k: "drawAt", label: "连线开始(秒)", type: "range", min: 0.2, max: 4, step: 0.1, unit: "s" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const step = Math.max(0.02, (Number(p.stepMs) || 180) / 1000);
    const drawAt = Number(p.drawAt) || 1.2;
    const parse = (s: unknown) =>
      String(s || "")
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => {
          const [name, logo] = x.split(",");
          return { name: (name || "").trim(), logo: (logo || "?").trim() };
        });
    const top = parse(p.top);
    const bottom = parse(p.bottom);
    const pairs = String(p.lines || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const m = x.match(/(\d+)\s*-\s*(\d+)/);
        return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
      })
      .filter(Boolean) as { a: number; b: number }[];

    const cx = (i: number, n: number) => (W * (i + 0.5)) / n;
    const chip = (size: number, round: number | string): React.CSSProperties => ({
      width: size,
      height: size,
      borderRadius: round,
      background: "#fff",
      boxShadow: QSHADOW,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.44,
      fontWeight: 800,
      color: QBM.ink,
    });

    const botDelay = 0.2 + top.length * step * 0.75;
    const row = (it: { name: string; logo: string }, x: number, y: number, size: number, round: number | string, pp: { scale: number; opacity: number }) => (
      <div
        key={it.name}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 220,
          transform: `translateX(-50%) scale(${pp.scale})`,
          opacity: pp.opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ ...chip(size, round), position: "static", left: undefined }}>{it.logo}</div>
        <div style={{ background: "#fff", color: QBM.ink, borderRadius: 999, boxShadow: QSHADOW_S, padding: "5px 16px", fontSize: 24, fontWeight: 800, whiteSpace: "nowrap" }}>{it.name}</div>
      </div>
    );
    return (
      <div style={{ ...FONT, position: "relative", width: W, height: 380 }}>
        {/* 连线层 */}
        <svg width={W} height={380} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {pairs.map((pr, i) => {
            const x1 = cx(Math.min(pr.a, top.length - 1), top.length);
            const x2 = cx(Math.min(pr.b, bottom.length - 1), bottom.length);
            const dp = easeOut3((t - (drawAt + i * 0.14)) / 0.5);
            if (dp <= 0) return null;
            return (
              <path
                key={i}
                d={`M ${x1} ${TOP_Y + 59} Q ${(x1 + x2) / 2} 174 ${x2} ${BOT_Y - 55}`}
                fill="none"
                stroke="#f2b544"
                strokeWidth={4.5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - dp}
                opacity={0.9}
              />
            );
          })}
        </svg>
        {/* 上排圆片 */}
        {top.map((it, i) => row(it, cx(i, top.length), TOP_Y - 59, 118, "50%", pop(t, 0.12 + i * step, 0.4)))}
        {/* 下排瓷片 */}
        {bottom.map((it, i) => row(it, cx(i, bottom.length), BOT_Y - 55, 110, 26, pop(t, botDelay + i * step, 0.4)))}
      </div>
    );
  },
};

export default def;
