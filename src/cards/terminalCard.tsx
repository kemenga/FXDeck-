/* 终端打字卡:命令行逐行敲出。行首语法:$ 命令 | ✓ 成功 | ✗ 失败 | # 注释 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, enter } from "../core/anim";

const def: CardDef<any> = {
  kind: "terminalCard",
  name: "终端打字卡",
  desc: "命令行逐行敲出。行首语法:$ 命令 | ✓ 成功 | ✗ 失败 | # 注释",
  defaults: {
    title: "skill-creator",
    lines: "$ fxdeck run weekly-report\n✓ 4 个反问已就绪\n✓ skill 生成,评分 9.1",
    stepMs: 800,
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "title", label: "窗口标题", type: "text" },
    { k: "lines", label: "终端行(每行一条)", type: "textarea", rows: 5 },
    { k: "stepMs", label: "逐行间隔", type: "range", min: 300, max: 3000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const lines = String(p.lines || "")
      .split("\n")
      .map((s) => s.replace(/\s+$/, ""))
      .filter((s) => s.length > 0);
    const step = Math.max(0.25, (Number(p.stepMs) || 700) / 1000);
    const lineStyle = (raw: string) => {
      if (raw.startsWith("$")) return { prompt: "$", color: "#f4f7fa", promptColor: "var(--acc)" };
      if (raw.startsWith("✓")) return { prompt: "✓", color: "var(--acc)", promptColor: "var(--acc)" };
      if (raw.startsWith("✗")) return { prompt: "✗", color: "var(--danger)", promptColor: "var(--danger)" };
      if (raw.startsWith("#")) return { prompt: "#", color: "rgba(244,247,250,.5)", promptColor: "rgba(244,247,250,.35)" };
      return { prompt: "›", color: "rgba(244,247,250,.85)", promptColor: "var(--acc)" };
    };
    const body = lines.map((raw, i) => {
      const start = 0.35 + i * step;
      const vis = clamp01((t - start) / 0.4);
      const chars = Math.floor(vis * raw.length);
      const typing = t >= start && t < start + 0.45;
      const { prompt, color, promptColor } = lineStyle(raw);
      const text = raw.startsWith("$") || raw.startsWith("✓") || raw.startsWith("✗") || raw.startsWith("#")
        ? raw.slice(1).trimStart()
        : raw;
      return (
        <div key={i} style={{ display: "flex", gap: 12, minHeight: 40, alignItems: "center", opacity: vis > 0 ? 1 : 0 }}>
          <span style={{ color: promptColor, fontWeight: 800, flex: "none" }}>{prompt}</span>
          <span style={{ color, whiteSpace: "pre-wrap" }}>{text.slice(0, chars)}</span>
          {typing ? (
            <span
              style={{
                width: 13,
                height: 30,
                background: "var(--acc)",
                flex: "none",
                opacity: Math.floor(t * 2.6) % 2 === 0 ? 1 : 0.15,
              }}
            />
          ) : null}
        </div>
      );
    });
    const en = enter(t);
    return (
      <div
        className="glass"
        style={{
          width: 780,
          padding: 0,
          overflow: "hidden",
          fontFamily: "var(--deck-mono)",
          opacity: en,
          transform: `translateY(${((1 - en) * 18).toFixed(1)}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, flex: "none" }} />
          ))}
          <span style={{ marginLeft: 10, fontSize: 15, color: "rgba(244,247,250,.55)" }}>{String(p.title || "terminal")}</span>
        </div>
        <div style={{ padding: "18px 24px 20px", fontSize: 23, lineHeight: 1.85, minHeight: 44 + lines.length * 44 }}>
          {body}
        </div>
      </div>
    );
  },
};

export default def;
