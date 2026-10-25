/* 文字类卡:钩子大字 / 金句 / 底部字幕条 —— 全部原创视觉设计 */
import { ACC_OPTIONS, COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, easeOut3, enter, item, outro } from "../core/anim";

/** 把 "*强调*" 语法切成段 */
function segs(s: string) {
  const out: { txt: string; hot: boolean }[] = [];
  s.split("*").forEach((part, i) => part && out.push({ txt: part, hot: i % 2 === 1 }));
  return out;
}

/* ── 钩子大字:逐字从虚焦浮出,强调段换色 ── */
export const hookText: CardDef<any> = {
  kind: "hookText",
  name: "钩子大字",
  desc: "开场钩子/金句定格。| 分行,*星号* 段强调变色,逐字浮现",
  defaults: { text: "你是不是|也遇到过*这种事*", staggerMs: 70, pos: "center", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "text", label: "文字(| 分行,*强调*)", type: "textarea", rows: 2 },
    { k: "staggerMs", label: "逐字间隔", type: "range", min: 20, max: 300, step: 10, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const chars: { c: string; hot: boolean }[] = [];
    for (const line of String(p.text || "").split("|"))
      for (const s of segs(line)) for (const c of Array.from(s.txt)) chars.push({ c, hot: s.hot });
    const step = Math.max(0.02, (Number(p.staggerMs) || 70) / 1000);
    const o = outro(t, 0); // 居中卡由渲染器统一淡出;这里恒 0,只留接口
    void o;
    return (
      <div style={{ textAlign: "center", maxWidth: 1500, fontFamily: "var(--deck-font)" }}>
        {String(p.text || "")
          .split("|")
          .map((line, li) => (
            <div key={li} style={{ display: "block" }}>
              {(() => {
                let idx = 0;
                return String(line)
                  .split("*")
                  .map((part, si) => {
                    const hot = si % 2 === 1;
                    const start = idx;
                    idx += Array.from(part).length;
                    return Array.from(part).map((c, ci) => {
                      const i = start + ci;
                      const pr = easeOut3((t - (0.15 + i * step)) / 0.5);
                      const blur = (1 - pr) * 9;
                      return (
                        <span
                          key={`${si}-${ci}`}
                          style={{
                            display: "inline-block",
                            whiteSpace: "pre",
                            fontSize: 86,
                            fontWeight: 900,
                            lineHeight: 1.32,
                            color: hot ? "var(--acc)" : "#f4f7fa",
                            opacity: pr,
                            transform: `translateY(${((1 - pr) * 26).toFixed(1)}px)`,
                            filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined,
                            textShadow: "0 8px 40px rgba(0,0,0,.4)",
                          }}
                        >
                          {c}
                        </span>
                      );
                    });
                  });
              })()}
            </div>
          ))}
      </div>
    );
  },
};

/* ── 金句卡:大引号 + 逐行浮现 + 署名 ── */
export const quoteCard: CardDef<any> = {
  kind: "quoteCard",
  name: "金句卡",
  desc: "多行金句逐行浮现,底部署名(可当来源行)",
  defaults: { quote: "收藏了|不等于学会了", author: "—— 某位博主", pos: "left", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "quote", label: "金句(| 分行)", type: "textarea", rows: 2 },
    { k: "author", label: "署名", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const lines = String(p.quote || "").split("|").filter(Boolean);
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

/* ── 底部字幕条:按绝对时间切句,当前句点亮 ── */
export const captionBar: CardDef<any> = {
  kind: "captionBar",
  name: "底部字幕条",
  desc: "一行一条「起-止 文本」,时间轴走到哪句亮哪句。原片无烧录字幕时用",
  defaults: {
    lines: "0.0-2.5 第一句字幕\n2.5-5.2 第二句字幕",
    pos: "bottom",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "lines", label: "字幕行(每行 起始-结束 文本)", type: "textarea", rows: 6 },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t, at }) => {
    const rows = String(p.lines || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = /^([\d.]+)\s*-\s*([\d.]+)\s+(.*)$/.exec(l);
        return m ? { a: +m[1], b: +m[2], txt: m[3] } : null;
      })
      .filter(Boolean) as { a: number; b: number; txt: string }[];
    const cur = rows.find((r) => at >= r.a && at < r.b) ?? null;
    const en = enter(t, 0.02, 0.3);
    return (
      <div
        className="glass"
        style={{
          padding: "18px 36px",
          borderRadius: 16,
          fontFamily: "var(--deck-font)",
          opacity: en,
          minWidth: 420,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, color: "#f4f7fa", lineHeight: 1.4 }}>
          {cur ? (
            cur.txt.split("*").map((seg, i) =>
              i % 2 === 1 ? (
                <span key={i} style={{ color: "var(--acc)" }}>
                  {seg}
                </span>
              ) : (
                <span key={i}>{seg}</span>
              ),
            )
          ) : (
            <span style={{ opacity: 0.25 }}>·</span>
          )}
        </div>
      </div>
    );
  },
};

export const textCards = [hookText, quoteCard, captionBar];
void ACC_OPTIONS;
