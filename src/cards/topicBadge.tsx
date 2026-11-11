/* 话题徽章(白):高亮药丸 + 白药丸两行组合逐个弹入,复现左上角「免费 用上 / 国产大模型+所有Agent」 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { FONT } from "./shared";
import { QBM, QSHADOW_S, TONE_OPTIONS, pop, toneColor } from "./qbmShared";

const def: CardDef<any> = {
  kind: "topicBadge",
  name: "话题徽章",
  desc: "左上角话题组合:高亮词药丸 + 白药丸行(*强调*可空),逐个弹簧弹入",
  defaults: {
    hl: "免费",
    rest: "用上",
    row2: "国产大模型,+,所有 Agent",
    tone: "green",
    pos: "top",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "hl", label: "高亮词(彩底白字,可空)", type: "text" },
    { k: "rest", label: "同行白药丸(可空)", type: "text" },
    { k: "row2", label: "第二行药丸(,分隔,可空)", type: "text" },
    { k: "tone", label: "高亮色", type: "select", options: TONE_OPTIONS },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const color = toneColor(p.tone, QBM.green);
    const white = (fs: number) => ({
      background: "#fff",
      color: QBM.ink,
      borderRadius: 16,
      boxShadow: QSHADOW_S,
      padding: "10px 26px",
      fontSize: fs,
      fontWeight: 900,
      lineHeight: 1.25,
      whiteSpace: "pre" as const,
    });
    const pp1 = pop(t, 0.08, 0.38);
    const pp2 = pop(t, 0.2, 0.38);
    const row2 = String(p.row2 || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return (
      <div style={{ ...FONT, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, maxWidth: 900 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {p.hl ? (
            <span
              style={{
                background: color,
                color: "#fff",
                borderRadius: 16,
                padding: "10px 26px",
                fontSize: 46,
                fontWeight: 900,
                transform: `scale(${pp1.scale})`,
                opacity: pp1.opacity,
                boxShadow: `0 8px 26px ${color}55`,
              }}
            >
              {String(p.hl)}
            </span>
          ) : null}
          {p.rest ? (
            <span style={{ ...white(46), transform: `scale(${pp2.scale})`, opacity: pp2.opacity }}>
              {String(p.rest)}
            </span>
          ) : null}
        </div>
        {row2.length ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", whiteSpace: "nowrap" }}>
            {row2.map((x, i) => {
              const pp = pop(t, 0.34 + i * 0.1, 0.36);
              const isPlus = x === "+";
              return (
                <span
                  key={i}
                  style={{
                    ...(isPlus ? white(30) : white(36)),
                    transform: `scale(${pp.scale})`,
                    opacity: pp.opacity,
                  }}
                >
                  {isPlus ? "+" : x}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  },
};

export default def;
