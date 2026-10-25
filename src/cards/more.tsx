/* 第三批卡:箭头链 / 荧光笔 / 对话气泡 / 增长曲线 / 印章 / 章节条 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, count, easeIO3, easeOut3, easeOutBack, easeOutExpo, enter } from "../core/anim";

const FONT = { fontFamily: "var(--deck-font)" } as const;
const MONO = { fontFamily: "var(--deck-mono)" } as const;

/* ── 箭头链:阶段节点依次弹出,箭头逐段画出(管线/流转图) ── */
export const arrowFlow: CardDef<any> = {
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
    const nodes = String(p.items || "").split("/").map((s) => s.trim()).filter(Boolean);
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

/* ── 荧光笔:大字先浮现,色块从左往右扫过文字(划重点) ── */
export const markerText: CardDef<any> = {
  kind: "markerText",
  name: "荧光笔",
  desc: "划重点:大字浮现后,强调色块从左往右扫过文字",
  defaults: { text: "这一句就是重点", kicker: "划重点", pos: "center", acc: "amber", offX: 0, offY: 0 },
  ctrls: [
    { k: "kicker", label: "眉题(可空)", type: "text" },
    { k: "text", label: "文字", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const txtIn = easeOut3((t - 0.15) / 0.5);
    const sweep = easeOut3((t - 0.6) / 0.55);
    return (
      <div style={{ ...FONT, textAlign: "center" }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 22, letterSpacing: "0.4em", fontWeight: 700, color: "var(--acc)", opacity: txtIn, marginBottom: 18 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <div style={{ position: "relative", display: "inline-block", padding: "6px 22px" }}>
          {/* 荧光色块:扫过的部分从底下滑出 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "12%",
              bottom: "12%",
              width: `${(sweep * 100).toFixed(1)}%`,
              borderRadius: 14,
              background: "var(--acc)",
              opacity: 0.32,
            }}
          />
          <span
            style={{
              position: "relative",
              fontSize: 74,
              fontWeight: 900,
              color: "#f4f7fa",
              whiteSpace: "nowrap",
              opacity: txtIn,
              transform: `translateY(${((1 - txtIn) * 22).toFixed(1)}px)`,
              textShadow: "0 6px 30px rgba(0,0,0,.35)",
            }}
          >
            {String(p.text || "")}
          </span>
        </div>
      </div>
    );
  },
};

/* ── 对话气泡:我 vs AI 的问答演示。行首 `>` = AI(右),无 = 用户(左) ── */
export const chatBubbles: CardDef<any> = {
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
    const rows = String(p.lines || "").split("\n").map((s) => s.trim()).filter(Boolean);
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

/* ── 增长曲线:折线自绘 + 数据点弹出 + 峰值计数 ── */
export const growthCurve: CardDef<any> = {
  kind: "growthCurve",
  name: "增长曲线",
  desc: "上涨叙事:折线自己画出来,峰值数字滚动。每条「标签,数值」用 | 分隔",
  defaults: {
    kicker: "GROWTH",
    points: "1月,120|2月,480|3月,2100",
    unit: "粉",
    pos: "right",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉题(英文等宽)", type: "text" },
    { k: "points", label: "数据点(标签,数值 | 分隔)", type: "textarea", rows: 2 },
    { k: "unit", label: "单位", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const pts = String(p.points || "")
      .split("|")
      .map((s) => s.split(",").map((x) => x.trim()))
      .filter((r) => r.length >= 2)
      .map(([label, v]) => ({ label, v: Number(v) || 0 }));
    if (pts.length < 2) return null;
    const W = 660, H = 340, L = 56, R = 120, T = 46, B = 56;
    const max = Math.max(...pts.map((x) => x.v), 1);
    const xy = pts.map((pt, i) => ({
      x: L + (i * (W - L - R)) / (pts.length - 1),
      y: T + (1 - pt.v / max) * (H - T - B),
    }));
    const totalLen = xy.slice(1).reduce((acc, cur, i) => acc + Math.hypot(cur.x - xy[i].x, cur.y - xy[i].y), 0);
    const draw = easeIO3((t - 0.3) / 1.5);
    const peak = pts[pts.length - 1];
    const peakShown = count(t, peak.v, 1.2, 0.9);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, width: W + 40, padding: "26px 20px 18px", opacity: en }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.32em", fontWeight: 700, color: "var(--acc)", marginLeft: 36 }}>{String(p.kicker).toUpperCase()}</div>
        ) : null}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* 横轴基线 */}
          <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="rgba(255,255,255,.14)" strokeWidth="2" />
          {/* 面积:随画线进度淡入 */}
          <polygon
            points={`${xy.map((q) => `${q.x},${q.y}`).join(" ")} ${W - R},${H - B} ${L},${H - B}`}
            fill="var(--acc)"
            opacity={0.1 * draw}
          />
          {/* 折线:dashoffset 从全长画到 0 */}
          <polyline
            points={xy.map((q) => `${q.x},${q.y}`).join(" ")}
            fill="none"
            stroke="var(--acc)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen.toFixed(1)}
            strokeDashoffset={(totalLen * (1 - draw)).toFixed(1)}
            style={{ filter: "drop-shadow(0 0 10px rgba(62,197,214,.4))" }}
          />
          {/* 数据点:线画到哪,点弹出 */}
          {xy.map((q, i) => {
            const passed = clamp01((draw * (pts.length - 1) - i + 1) / 1);
            const pop = easeOutBack((passed - 0.15) / 0.3);
            return <circle key={i} cx={q.x} cy={q.y} r={9} fill="#0b0f14" stroke="var(--acc)" strokeWidth="5" opacity={clamp01(pop)} />;
          })}
          {/* 横轴标签 */}
          {pts.map((pt, i) => (
            <text key={i} x={xy[i].x} y={H - 18} textAnchor="middle" fontSize="20" fill="rgba(244,247,250,.55)" fontFamily="var(--deck-mono)">
              {pt.label}
            </text>
          ))}
          {/* 峰值标签 */}
          <text x={W - R + 16} y={xy[xy.length - 1].y + 9} fontSize="38" fontWeight="900" fill="#f4f7fa" fontFamily="var(--deck-font)">
            {peakShown.toLocaleString("en-US")}
          </text>
          <text x={W - R + 16} y={xy[xy.length - 1].y + 38} fontSize="19" fill="var(--acc)" fontFamily="var(--deck-font)">
            {String(p.unit || "")}
          </text>
        </svg>
      </div>
    );
  },
};

/* ── 印章:圆形图章砸下 + 冲击环,盖「判定」 ── */
export const stampBadge: CardDef<any> = {
  kind: "stampBadge",
  name: "印章",
  desc: "盖判定:「亲测可用」「无效别学」。砸下回弹 + 冲击扩散环",
  defaults: { text: "亲测可用", sub: "2026.10 实测", pos: "right", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "text", label: "印章文字(≤6字)", type: "text" },
    { k: "sub", label: "小字(可空)", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const slam = easeOutBack((t - 0.15) / 0.38);
    const ring = easeOutExpo((t - 0.5) / 0.55);
    // 落章后的余震:衰减正弦
    const shake = t > 0.53 ? Math.sin((t - 0.53) * 34) * Math.exp(-(t - 0.53) * 5) * 2.4 : 0;
    const rot = -9 + shake;
    return (
      <div style={{ ...FONT, position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* 冲击扩散环 */}
        {ring > 0.01 && ring < 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid var(--acc)",
              transform: `scale(${(1 + ring * 0.7).toFixed(3)})`,
              opacity: (1 - ring) * 0.7,
            }}
          />
        ) : null}
        <div
          style={{
            width: 250,
            height: 250,
            borderRadius: "50%",
            border: "6px solid var(--acc)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${Math.max(0.001, slam).toFixed(3)}) rotate(${rot.toFixed(2)}deg)`,
            opacity: clamp01(slam * 3),
            boxShadow: "0 0 40px rgba(62,197,214,.25)",
          }}
        >
          <span style={{ fontSize: 52, fontWeight: 900, color: "var(--acc)", letterSpacing: "0.06em", lineHeight: 1.2, textAlign: "center", padding: "0 12px" }}>
            {String(p.text || "")}
          </span>
          {p.sub ? (
            <span style={{ ...MONO, fontSize: 16, color: "rgba(244,247,250,.55)", marginTop: 10, letterSpacing: "0.14em" }}>{String(p.sub)}</span>
          ) : null}
        </div>
      </div>
    );
  },
};

/* ── 章节条:全片常驻导航,讲到哪格亮到哪(时间感知) ── */
export const chapterBar: CardDef<any> = {
  kind: "chapterBar",
  name: "章节条",
  desc: "全片常驻:章节导航条。每章「名称 起始秒」用 / 分隔;卡片拉满全片",
  defaults: {
    chapters: "为什么要做 0/怎么做的 21/效果如何 50",
    pos: "top",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "chapters", label: "章节(名称 起始秒 / 分隔)", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t, dur, at }) => {
    const chs = String(p.chapters || "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = /^(.+?)\s+([\d.]+)$/.exec(s);
        return m ? { name: m[1], start: Number(m[2]) } : { name: s, start: 0 };
      });
    if (!chs.length) return null;
    const total = dur > 0 ? Math.max(dur, chs[chs.length - 1].start + 1) : chs[chs.length - 1].start + 10;
    const prog = clamp01(t / total);
    const active = Math.max(0, chs.findIndex((c, i) => at >= c.start && (i === chs.length - 1 || at < chs[i + 1].start)));
    const en = enter(t, 0.02, 0.35);
    return (
      <div style={{ ...FONT, width: 1100, opacity: en }}>
        <div style={{ display: "flex", marginBottom: 12 }}>
          {chs.map((c, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 24, fontWeight: i === active ? 800 : 600, color: i === active ? "var(--acc)" : i < active ? "rgba(244,247,250,.6)" : "rgba(244,247,250,.35)", transition: "none" }}>
              {c.name}
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: 7, borderRadius: 4, background: "rgba(255,255,255,.12)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(prog * 100).toFixed(1)}%`, borderRadius: 4, background: "var(--acc)", boxShadow: "0 0 12px rgba(62,197,214,.5)" }} />
          {chs.slice(1).map((c, i) => (
            <div key={i} style={{ position: "absolute", left: `${(c.start / total) * 100}%`, top: -3, width: 3, height: 13, borderRadius: 2, background: "rgba(244,247,250,.4)" }} />
          ))}
        </div>
      </div>
    );
  },
};

export const moreCards = [arrowFlow, markerText, chatBubbles, growthCurve, stampBadge, chapterBar];
void easeOutExpo;
