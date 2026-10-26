/* 章节序号卡:细线画出 + 大号序号 + 英文眉 + 粗标题(章节转场锚点) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3, enter, item } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "chapterNum",
  name: "章节序号",
  desc: "章节转场:细线扫出,大号序号 + 英文眉题 + 粗标题依次落位。比 chapterBar 更重的分章卡",
  defaults: { num: "01", kicker: "CHAPTER · MOTION", title: "重设计动效", pos: "left", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "num", label: "序号", type: "text" },
    { k: "kicker", label: "英文眉题(可空)", type: "text" },
    { k: "title", label: "标题", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const line = easeOut3((t - 0.05) / 0.5);
    const numIn = enter(t, 0.2, 0.5);
    const kick = item(t, 0, 0.01, 0.4, 0.55);
    const title = item(t, 0, 0.01, 0.5, 0.7);
    return (
      <div style={{ ...FONT, minWidth: 560, maxWidth: 860 }}>
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: "var(--acc)",
            width: `${(line * 100).toFixed(1)}%`,
            boxShadow: "0 0 14px rgba(62,197,214,.4)",
            marginBottom: 22,
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 26 }}>
          <span
            style={{
              ...MONO,
              fontSize: 128,
              fontWeight: 900,
              lineHeight: 0.9,
              color: "var(--acc)",
              opacity: numIn,
              transform: `translateY(${((1 - numIn) * 30).toFixed(1)}px)`,
              textShadow: "0 10px 40px rgba(0,0,0,.4)",
            }}
          >
            {String(p.num || "01")}
          </span>
          <div style={{ paddingTop: 10 }}>
            {p.kicker ? (
              <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.3em", fontWeight: 700, color: "var(--acc)", opacity: kick, marginBottom: 10 }}>
                {String(p.kicker).toUpperCase()}
              </div>
            ) : null}
            <div
              style={{
                fontSize: 62,
                fontWeight: 900,
                color: "#f4f7fa",
                lineHeight: 1.15,
                opacity: title,
                transform: `translateY(${((1 - title) * 18).toFixed(1)}px)`,
              }}
            >
              {String(p.title || "")}
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export default def;
