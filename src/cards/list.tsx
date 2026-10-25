/* 列表类卡:要点钉板 / 打勾清单 / 步骤链 —— 全部原创视觉设计 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, enter, easeOut3, item } from "../core/anim";

const splitItems = (s: unknown) =>
  String(s || "")
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);

const panelFont = { fontFamily: "var(--deck-font)" } as const;

/* ── 要点钉板:编号点 + 条目逐条滑入,讲过不撤 ── */
export const pinList: CardDef<any> = {
  kind: "pinList",
  name: "要点钉板",
  desc: "2-4 条短要点逐条钉住,讲过的留在画面上。/ 分隔",
  defaults: { title: "三个要点", items: "第一条要点/第二条要点/第三条要点", stepMs: 900, pos: "left", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "title", label: "小标题(可空)", type: "text" },
    { k: "items", label: "要点(/ 分隔)", type: "textarea", rows: 3 },
    { k: "stepMs", label: "逐条间隔", type: "range", min: 300, max: 4000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const items = splitItems(p.items);
    const step = Math.max(0.2, (Number(p.stepMs) || 900) / 1000);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...panelFont, minWidth: 460, maxWidth: 780, padding: "30px 36px" }}>
        {p.title ? (
          <div style={{ fontSize: 30, fontWeight: 800, color: "#f4f7fa", marginBottom: 16, opacity: en }}>
            {String(p.title)}
          </div>
        ) : null}
        {items.map((it, i) => {
          const pr = item(t, i, step);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", opacity: pr, transform: `translateX(${((1 - pr) * -22).toFixed(1)}px)` }}>
              <span
                style={{
                  flex: "none",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(255,255,255,.07)",
                  border: `1.5px solid ${i === 0 ? "var(--acc)" : "rgba(255,255,255,.14)"}`,
                  color: i === 0 ? "var(--acc)" : "rgba(244,247,250,.55)",
                  fontSize: 19,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--deck-mono)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 32, fontWeight: 650, color: "#f4f7fa" }}>{it}</span>
            </div>
          );
        })}
      </div>
    );
  },
};

/* ── 打勾清单:条目滑入后勾逐个亮 ── */
export const tickList: CardDef<any> = {
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
      <div className="glass" style={{ ...panelFont, minWidth: 460, maxWidth: 780, padding: "30px 36px" }}>
        {p.title ? (
          <div style={{ fontSize: 30, fontWeight: 800, color: "#f4f7fa", marginBottom: 16, opacity: en }}>{String(p.title)}</div>
        ) : null}
        {items.map((it, i) => {
          const pr = item(t, i, step);
          const tick = easeOut3((t - (0.4 + i * step)) / 0.3);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", opacity: pr, transform: `translateX(${((1 - pr) * -22).toFixed(1)}px)` }}>
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
                  <path d="M4 10.5 8.2 14.5 16 5.5" fill="none" stroke="#0b0f14" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity={tick} />
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

/* ── 步骤链:横向步骤胶囊,时间推进到哪步亮哪步 ── */
export const stepFlow: CardDef<any> = {
  kind: "stepFlow",
  name: "步骤链",
  desc: "横向步骤推进(整章常驻),讲到第几步点亮第几步",
  defaults: { steps: "选题/拍摄/剪辑/发布", stepMs: 2400, pos: "top", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "steps", label: "步骤(/ 分隔)", type: "text" },
    { k: "stepMs", label: "每步时长", type: "range", min: 500, max: 8000, step: 100, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const steps = splitItems(p.steps);
    const stepMs = Math.max(0.5, (Number(p.stepMs) || 2400) / 1000);
    const active = Math.min(steps.length, Math.floor(Math.max(0, t - 0.3) / stepMs) + 1);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...panelFont, display: "flex", alignItems: "center", gap: 0, padding: "16px 26px", borderRadius: 999, opacity: en }}>
        {steps.map((s, i) => {
          const on = i < active;
          const cur = i === active - 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? (
                <div style={{ width: 46, height: 2, borderRadius: 1, background: on ? "var(--acc)" : "rgba(255,255,255,.14)", margin: "0 10px", transition: "none" }} />
              ) : null}
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: on ? "var(--acc)" : "rgba(255,255,255,.08)",
                    color: on ? "#0b0f14" : "rgba(244,247,250,.5)",
                    fontSize: 14,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--deck-mono)",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 25, fontWeight: 700, color: cur ? "#f4f7fa" : on ? "rgba(244,247,250,.75)" : "rgba(244,247,250,.42)" }}>{s}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

export const listCards = [pinList, tickList, stepFlow];
void clamp01;
