/* 扩展卡组:VS 对比 / 术语卡 / 金句药丸 / 进度环 / 终端打字 / 多指标条 */
import type { ReactNode } from "react";
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, count, easeOutBack, easeOut3, easeOutExpo, enter, item } from "../core/anim";

const FONT = { fontFamily: "var(--deck-font)" } as const;
const MONO = { fontFamily: "var(--deck-mono)" } as const;

/* ── VS 对比卡:两方对撞,胜者高亮、败者退让 ── */
export const versusCard: CardDef<any> = {
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

/* ── 术语卡:英文原名 + 中文术语 + 一句话定义 ── */
export const termCard: CardDef<any> = {
  kind: "termCard",
  name: "术语卡",
  desc: "出现新概念时钉一张:英文名 + 中文术语 + 一句话定义",
  defaults: {
    en: "SKILL",
    term: "Skill · 技能",
    def: "给 AI 的一份可复用工作流说明书",
    pos: "left",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "en", label: "英文原名(可空)", type: "text" },
    { k: "term", label: "术语", type: "text" },
    { k: "def", label: "一句话定义", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const bar = easeOut3((t - 0.05) / 0.35);
    const en = enter(t, 0.15, 0.4);
    const term = item(t, 0, 0.01, 0.45, 0.28);
    const def = item(t, 0, 0.01, 0.45, 0.5);
    return (
      <div
        className="glass"
        style={{
          ...FONT,
          minWidth: 520,
          maxWidth: 780,
          padding: "30px 40px",
          borderLeft: `5px solid var(--acc)`,
          borderLeftWidth: `${(5 * bar).toFixed(1)}px`,
          opacity: bar > 0 ? 1 : 0,
        }}
      >
        {p.en ? (
          <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.32em", fontWeight: 700, color: "var(--acc)", opacity: en }}>
            {String(p.en).toUpperCase()}
          </div>
        ) : null}
        <div style={{ fontSize: 56, fontWeight: 900, color: "#f4f7fa", marginTop: 8, opacity: term, transform: `translateY(${((1 - term) * 16).toFixed(1)}px)` }}>
          {String(p.term || "")}
        </div>
        {p.def ? (
          <div style={{ fontSize: 27, color: "rgba(244,247,250,.66)", marginTop: 14, opacity: def, transform: `translateY(${((1 - def) * 10).toFixed(1)}px)` }}>
            {String(p.def)}
          </div>
        ) : null}
      </div>
    );
  },
};

/* ── 金句药丸:单句短金句弹出 ── */
export const punchPill: CardDef<any> = {
  kind: "punchPill",
  name: "金句药丸",
  desc: "一句话观点弹出定格,比金句卡轻;适合口播中间的顿悟点",
  defaults: {
    text: "收藏 ≠ 学会",
    pos: "bottom",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [{ k: "text", label: "药丸文字", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const pop = easeOutBack((t - 0.1) / 0.42);
    return (
      <div
        className="glass"
        style={{
          ...FONT,
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          padding: "24px 50px",
          borderRadius: 999,
          transform: `scale(${Math.max(0.001, pop).toFixed(3)})`,
          opacity: clamp01(pop * 3),
        }}
      >
        <span style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--acc)", flex: "none", boxShadow: "0 0 16px var(--acc)" }} />
        <span style={{ fontSize: 46, fontWeight: 800, color: "#f4f7fa", whiteSpace: "nowrap" }}>{String(p.text || "")}</span>
      </div>
    );
  },
};

/* ── 进度环:百分比圆环生长 ── */
export const progressRing: CardDef<any> = {
  kind: "progressRing",
  name: "进度环",
  desc: "单个百分比指标:圆环生长 + 中央数字滚动(0-100)",
  defaults: {
    kicker: "TRIGGER RATE",
    value: "86",
    unit: "%",
    label: "触发准确率",
    pos: "right",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉题(英文等宽)", type: "text" },
    { k: "value", label: "百分比(0-100)", type: "text" },
    { k: "unit", label: "单位", type: "text" },
    { k: "label", label: "小注", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const val = Math.min(100, Math.max(0, Number(p.value) || 0));
    const grow = easeOutExpo((t - 0.25) / 1.3);
    const shown = Math.round(val * grow);
    const R = 118;
    const C = 2 * Math.PI * R;
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, width: 360, padding: "26px 30px 30px", textAlign: "center", opacity: en, transform: `translateY(${((1 - en) * 20).toFixed(1)}px)` }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 18, letterSpacing: "0.3em", fontWeight: 700, color: "var(--acc)" }}>{String(p.kicker).toUpperCase()}</div>
        ) : null}
        <div style={{ position: "relative", width: 280, height: 280, margin: "10px auto 0" }}>
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="20" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={C.toFixed(1)}
              strokeDashoffset={(C * (1 - (val / 100) * grow)).toFixed(1)}
              style={{ filter: "drop-shadow(0 0 14px rgba(62,197,214,.45))" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 76, fontWeight: 900, color: "#f4f7fa", fontVariantNumeric: "tabular-nums" }}>{shown}</span>
            {p.unit ? <span style={{ fontSize: 30, fontWeight: 800, color: "var(--acc)" }}>{String(p.unit)}</span> : null}
          </div>
        </div>
        {p.label ? <div style={{ fontSize: 26, color: "rgba(244,247,250,.66)", marginTop: 12 }}>{String(p.label)}</div> : null}
      </div>
    );
  },
};

/* ── 终端打字卡:命令行逐行敲出 ── */
export const terminalCard: CardDef<any> = {
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

/* ── 多指标条:2-3 个数字并排 ── */
export const statStrip: CardDef<any> = {
  kind: "statStrip",
  name: "多指标条",
  desc: "一组关键数字并排。格式「标签,数值,单位」多条用 | 分隔",
  defaults: {
    items: "省时,70,%|成本,0,元|上手,5,分钟",
    pos: "bottom",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "items", label: "指标(标签,数值,单位 | 分隔)", type: "textarea", rows: 2 },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const cells = String(p.items || "")
      .split("|")
      .map((s) => s.split(",").map((x) => x.trim()))
      .filter((r) => r.length >= 2 && r[0])
      .map(([label, v, unit]) => ({ label, v: Number(v.replace(/[^\d.-]/g, "")) || 0, rawV: v, unit: unit ?? "" }));
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, display: "flex", alignItems: "center", padding: "26px 14px", opacity: en }}>
        {cells.map((c, i) => {
          const shown = count(t, c.v, 0.25 + i * 0.3, 1.0);
          const pr = item(t, i, 0.3, 0.4, 0.15);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", opacity: pr }}>
              {i > 0 ? <div style={{ width: 1, height: 74, background: "rgba(255,255,255,.14)", margin: "0 30px" }} /> : null}
              <div style={{ textAlign: "center", padding: "0 26px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5 }}>
                  <span style={{ fontSize: 62, fontWeight: 900, color: "#f4f7fa", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {c.v ? shown.toLocaleString("en-US") : c.rawV}
                  </span>
                  {c.unit ? <span style={{ fontSize: 26, fontWeight: 800, color: "var(--acc)" }}>{c.unit}</span> : null}
                </div>
                <div style={{ fontSize: 21, color: "rgba(244,247,250,.6)", marginTop: 8 }}>{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export const extraCards = [versusCard, termCard, punchPill, progressRing, terminalCard, statStrip];
