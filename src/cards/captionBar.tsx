/* 底部字幕条:按绝对时间切句,当前句点亮 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { enter } from "../core/anim";

const def: CardDef<any> = {
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
  ctrls: [{ k: "lines", label: "字幕行(每行 起始-结束 文本)", type: "textarea", rows: 6 }, ...COMMON_CTRLS],
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

export default def;
