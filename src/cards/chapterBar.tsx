/* 章节条:全片常驻导航,讲到哪格亮到哪(时间感知) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, enter } from "../core/anim";
import { FONT } from "./shared";

const def: CardDef<any> = {
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
  ctrls: [{ k: "chapters", label: "章节(名称 起始秒 / 分隔)", type: "text" }, ...COMMON_CTRLS],
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
    const active = Math.max(
      0,
      chs.findIndex((c, i) => at >= c.start && (i === chs.length - 1 || at < chs[i + 1].start)),
    );
    const en = enter(t, 0.02, 0.35);
    return (
      <div style={{ ...FONT, width: 1100, opacity: en }}>
        <div style={{ display: "flex", marginBottom: 12 }}>
          {chs.map((c, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 24,
                fontWeight: i === active ? 800 : 600,
                color: i === active ? "var(--acc)" : i < active ? "rgba(244,247,250,.6)" : "rgba(244,247,250,.35)",
                transition: "none",
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: 7, borderRadius: 4, background: "rgba(255,255,255,.12)" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${(prog * 100).toFixed(1)}%`,
              borderRadius: 4,
              background: "var(--acc)",
              boxShadow: "0 0 12px rgba(62,197,214,.5)",
            }}
          />
          {chs.slice(1).map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${(c.start / total) * 100}%`,
                top: -3,
                width: 3,
                height: 13,
                borderRadius: 2,
                background: "rgba(244,247,250,.4)",
              }}
            />
          ))}
        </div>
      </div>
    );
  },
};

export default def;
