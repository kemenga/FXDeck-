/* 金句卡:大引号 + 逐行浮现 + 署名 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, enter, item } from "../core/anim";

const def: CardDef<any> = {
  kind: "quoteCard",
  name: "金句卡",
  desc: "多行金句逐行浮现,底部署名(可当来源行)",
  defaults: { quote: "收藏了|不等于学会了", author: "—— 某位博主", pos: "left", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [{ k: "quote", label: "金句(| 分行)", type: "textarea", rows: 2 }, { k: "author", label: "署名", type: "text" }, ...COMMON_CTRLS],
  render: ({ p, t }) => {
    const lines = String(p.quote || "")
      .split("|")
      .filter(Boolean);
    const en = enter(t);
    return (
      <div className="glass" style={{ maxWidth: 760, padding: "40px 46px 34px", fontFamily: "var(--deck-font)" }}>
        <div
          style={{
            fontSize: 88,
            lineHeight: 0.6,
            fontWeight: 900,
            color: "var(--acc)",
            opacity: en,
            transform: `translateY(${((1 - en) * 14).toFixed(1)}px)`,
            marginBottom: 16,
          }}
        >
          “
        </div>
        {lines.map((ln, i) => {
          const pr = item(t, i, 0.55, 0.5, 0.25);
          return (
            <div
              key={i}
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: "#f4f7fa",
                lineHeight: 1.5,
                letterSpacing: "0.02em",
                opacity: pr,
                transform: `translateX(${((1 - pr) * -20).toFixed(1)}px)`,
              }}
            >
              {ln}
            </div>
          );
        })}
        {p.author ? (
          <div
            style={{
              marginTop: 22,
              fontSize: 22,
              color: "rgba(244,247,250,.62)",
              opacity: clamp01((t - (0.3 + lines.length * 0.55)) / 0.5),
            }}
          >
            {p.author}
          </div>
        ) : null}
      </div>
    );
  },
};

export default def;
