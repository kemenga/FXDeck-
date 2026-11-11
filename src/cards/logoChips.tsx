/* logo圆片阵(白):白底圆片/圆角片 + 名称药丸逐个弹入;可先虚线占位再填入
   复现情报马「模型行圆片 / 工具行瓷片」的逐个弹入与虚线占位动画 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { FONT } from "./shared";
import { QBM, QSHADOW, QSHADOW_S, pop } from "./qbmShared";

const def: CardDef<any> = {
  kind: "logoChips",
  name: "logo圆片阵",
  desc: "logo 片 + 名称药丸逐个弹入:emoji/字当 logo;dash=先虚线占位再填入",
  defaults: {
    items: "DeepSeek,🐳|Kimi,K|常有,✳️|MiniMax,M",
    shape: "circle",
    dash: true,
    stepMs: 200,
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "items", label: "条目(名称,logo | 分隔)", type: "textarea", rows: 2 },
    {
      k: "shape",
      label: "片形",
      type: "select",
      options: [
        { label: "圆形", value: "circle" },
        { label: "圆角方", value: "square" },
      ],
    },
    { k: "dash", label: "虚线占位先行", type: "toggle" },
    { k: "stepMs", label: "逐个间隔", type: "range", min: 80, max: 600, step: 20, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const step = Math.max(0.02, (Number(p.stepMs) || 200) / 1000);
    const circle = String(p.shape ?? "circle") === "circle";
    const dash = !!p.dash;
    const items = String(p.items || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const [name, logo] = x.split(",");
        return { name: (name || "").trim(), logo: (logo || "?").trim() };
      });
    const chipBase: React.CSSProperties = {
      width: 124,
      height: 124,
      borderRadius: circle ? "50%" : 30,
      background: "#fff",
      boxShadow: QSHADOW,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 54,
    };
    return (
      <div style={{ ...FONT, display: "flex", gap: 30, justifyContent: "center", alignItems: "flex-start" }}>
        {items.map((it, i) => {
          const d0 = dash ? 0.15 + i * step : 0.08 + i * step;
          const dOut = dashPlaceholderTiming(dash, d0);
          const dashP = pop(t, d0, 0.34);
          const pIn = pop(t, dOut, 0.42);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 124, height: 124 }}>
                {dash ? (
                  <div
                    style={{
                      ...chipBase,
                      position: "absolute",
                      background: "transparent",
                      border: "3px dashed rgba(255,255,255,.85)",
                      boxShadow: "none",
                      transform: `scale(${dashP.scale})`,
                      opacity: dashP.opacity,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    ...chipBase,
                    position: "absolute",
                    fontWeight: 800,
                    color: QBM.ink,
                    transform: `scale(${pIn.scale})`,
                    opacity: pIn.opacity,
                  }}
                >
                  {it.logo}
                </div>
              </div>
              <div
                style={{
                  background: "#fff",
                  color: QBM.ink,
                  borderRadius: 999,
                  boxShadow: QSHADOW_S,
                  padding: "6px 18px",
                  fontSize: 25,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  transform: `scale(${pIn.scale})`,
                  opacity: pIn.opacity,
                }}
              >
                {it.name}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

/** 虚线占位后内容填入的时机:占位弹出 0.34s 完成,再接内容 */
function dashPlaceholderTiming(dash: boolean, d0: number) {
  return dash ? d0 + 0.38 : d0;
}

export default def;
