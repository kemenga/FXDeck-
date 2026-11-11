/* 窗口判定卡(白):模拟应用窗口滑入 → 图钉药丸逐个戳入 → 可变灰 + 判定章
   复现情报马「排除/认可」演示段(如 Claude 客户端盖红✗) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOutBack, clamp01, easeOut3 } from "../core/anim";
import { FONT } from "./shared";
import { QBM, QSHADOW, TONE_OPTIONS, pop, toneColor } from "./qbmShared";

const def: CardDef<any> = {
  kind: "winVerdict",
  name: "窗口判定卡",
  desc: "模拟窗口滑入+侧栏,图钉药丸逐个戳入,grayAt 后变灰并盖判定章(✗/👍/自定)",
  defaults: {
    bodyKicker: "🌟",
    bodyText: "How can I help?",
    sidebar: "新对话,项目,设置",
    stamps: "🔒 中文界面|仅订阅用户",
    stampTone: "pink",
    stampStepMs: 700,
    grayAt: 3.4,
    verdict: "✗",
    verdictTone: "red",
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "bodyKicker", label: "内容 emoji(可空)", type: "text" },
    { k: "bodyText", label: "内容文字(可空)", type: "text" },
    { k: "sidebar", label: "侧栏项(,分隔,可空)", type: "text" },
    { k: "stamps", label: "图钉药丸(| 分条,可空)", type: "textarea", rows: 2 },
    { k: "stampTone", label: "药丸色", type: "select", options: TONE_OPTIONS },
    { k: "stampStepMs", label: "药丸间隔", type: "range", min: 200, max: 1500, step: 50, unit: "ms" },
    { k: "grayAt", label: "变灰时刻(秒,0=不变灰)", type: "range", min: 0, max: 10, step: 0.2, unit: "s" },
    { k: "verdict", label: "判定章文字(✗/👍/空)", type: "text" },
    { k: "verdictTone", label: "判定章色", type: "select", options: TONE_OPTIONS },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const stampTone = toneColor(p.stampTone, QBM.pink);
    const verdictTone = toneColor(p.verdictTone, QBM.red);
    const step = Math.max(0.02, (Number(p.stampStepMs) || 700) / 1000);
    const grayAt = Number(p.grayAt) || 0;
    const stamps = String(p.stamps || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    const sidebar = String(p.sidebar || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    // 窗口滑入:左移淡入
    const sl = easeOut3((t - 0.05) / 0.45);
    const grayP = grayAt > 0 ? clamp01((t - grayAt) / 0.5) : 0;
    const vp = easeOutBack((t - (grayAt > 0 ? grayAt + 0.35 : 1.5)) / 0.42);
    return (
      <div
        style={{
          ...FONT,
          width: 840,
          position: "relative",
          opacity: sl,
          transform: `translateX(${((1 - sl) * -60).toFixed(1)}px)`,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 26,
            boxShadow: QSHADOW,
            overflow: "hidden",
            display: "flex",
            height: 520,
            filter: grayP > 0 ? `grayscale(${(grayP * 0.95).toFixed(2)})` : undefined,
          }}
        >
          {/* 侧栏 */}
          {sidebar.length ? (
            <div style={{ width: 200, background: "#f4f6fa", padding: "22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: "#d5dbe6" }} />
                ))}
              </div>
              {sidebar.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 24,
                    fontWeight: i === 0 ? 800 : 600,
                    color: i === 0 ? QBM.ink : QBM.sub,
                    background: i === 0 ? "#e8ecf4" : "transparent",
                    borderRadius: 10,
                    padding: "8px 12px",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
          {/* 内容区 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", gap: 18 }}>
            {p.bodyKicker ? <span style={{ fontSize: 84, lineHeight: 1 }}>{String(p.bodyKicker)}</span> : null}
            {p.bodyText ? <span style={{ fontSize: 46, fontWeight: 800, color: QBM.ink }}>{String(p.bodyText)}</span> : null}
            {/* 图钉药丸:底部居中逐个戳入 */}
            {stamps.map((s, i) => {
              const pp = pop(t, 0.7 + i * step, 0.38);
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    bottom: 30 + i * 78,
                    background: stampTone,
                    color: "#fff",
                    borderRadius: 999,
                    padding: "10px 26px",
                    fontSize: 30,
                    fontWeight: 800,
                    boxShadow: `0 8px 24px ${stampTone}55`,
                    transform: `scale(${pp.scale}) rotate(-2deg)`,
                    opacity: pp.opacity,
                  }}
                >
                  {s}
                </span>
              );
            })}
          </div>
        </div>
        {/* 判定章 */}
        {p.verdict && vp > 0.001 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 210,
                fontWeight: 900,
                color: verdictTone,
                textShadow: "0 10px 44px rgba(40,40,60,.35)",
                transform: `scale(${Math.max(0.001, vp).toFixed(3)}) rotate(-10deg)`,
                opacity: 0.92,
                lineHeight: 1,
              }}
            >
              {String(p.verdict)}
            </span>
          </div>
        ) : null}
      </div>
    );
  },
};

export default def;
