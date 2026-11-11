/* 白底横条榜(白):彩色横条生长 + 数值滚动;支持「升级行」旧名划线、新名弹入、反超脚注
   复现情报马 AA 智能指数榜(如 Kimi K3 44→55 反超 GPT-6) */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { count, easeOut3 } from "../core/anim";
import { FONT, MONO } from "./shared";
import { QBM, QSHADOW, pop, slide } from "./qbmShared";

const COLORS: Record<string, string> = {
  orange: QBM.orange,
  dark: QBM.dark,
  blue: QBM.blue,
  pink: QBM.pink,
  green: QBM.green,
  sky: QBM.sky,
};

const def: CardDef<any> = {
  kind: "rankBoard",
  name: "白底横条榜",
  desc: "白底榜单:彩色横条+数值滚动;升级=旧行划线换新名新值+反超脚注",
  defaults: {
    title: "AA 智能指数",
    source: "Artificial Analysis",
    rows: "Claude Opus 5.5,58,orange,max|GPT-6 Astra,53,dark|Kimi K3,44,blue,上一代",
    upgrade: "2,Kimi K3.1 Pro,55",
    upgradeAt: 3,
    note: "上一代 44 → 55 分,反超 GPT-6(53 分)",
    footnote: "数据来源: Artificial Analysis · 2026-10-24",
    pos: "center",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "title", label: "标题(可空)", type: "text" },
    { k: "source", label: "右上来源(可空)", type: "text" },
    { k: "rows", label: "数据行(名称,值,颜色,小注 | 分隔)", type: "textarea", rows: 3 },
    { k: "upgrade", label: "升级行(行号,新名,新值;空=无)", type: "text" },
    { k: "upgradeAt", label: "升级时刻(秒)", type: "range", min: 0.5, max: 8, step: 0.1, unit: "s" },
    { k: "note", label: "反超脚注(可空)", type: "text" },
    { k: "footnote", label: "底部来源行(可空)", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const rows = String(p.rows || "")
      .split("|")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => {
        const [name, v, color, tag] = r.split(",").map((x) => (x ?? "").trim());
        return { name: name || "", v: Number(v) || 0, color: COLORS[color || "blue"] || QBM.blue, tag: tag || "" };
      });
    // 升级参数
    const upRaw = String(p.upgrade || "").trim();
    const upgradeAt = Number(p.upgradeAt) || 3;
    let up: { idx: number; name: string; v: number } | null = null;
    const m = upRaw.match(/(\d+)\s*,\s*([^,]+)\s*,\s*(\d+)/);
    if (m) up = { idx: Number(m[1]), name: m[2].trim(), v: Number(m[3]) || 0 };
    const max = Math.max(1, ...rows.map((r) => r.v), up?.v ?? 0);

    const hd = slide(t, 0.05, 0.4, -18);
    return (
      <div style={{ ...FONT, background: "#fff", borderRadius: 30, boxShadow: QSHADOW, padding: "32px 40px 28px", width: 900, opacity: hd.opacity, transform: `translateY(${hd.dy}px)` }}>
        {p.title || p.source ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: QBM.ink }}>{String(p.title || "")}</span>
            <span style={{ ...MONO, fontSize: 21, color: QBM.sub }}>{String(p.source || "")}</span>
          </div>
        ) : null}
        {rows.map((r, i) => {
          const delay = 0.3 + i * 0.35;
          const grow = easeOut3((t - delay) / 0.8);
          // 升级行:upgradeAt 后值从旧滚到新,名称划线换新
          const isUp = up && i === up.idx;
          const upP = isUp ? easeOut3((t - upgradeAt) / 0.8) : 0;
          const shownV = isUp && t >= upgradeAt ? Math.round(r.v + (up!.v - r.v) * upP) : count(t, r.v, delay, 0.8);
          const widthPct = ((isUp && t >= upgradeAt ? r.v + (up!.v - r.v) * upP : r.v) / max) * 100 * (isUp && t >= upgradeAt ? 1 : grow);
          const renamed = isUp && t >= upgradeAt + 0.25;
          const rn = pop(t, upgradeAt + 0.25, 0.36);
          return (
            <div key={i} style={{ padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                {renamed ? (
                  <>
                    <span style={{ fontSize: 28, fontWeight: 800, color: QBM.sub, textDecoration: "line-through" }}>{r.name}</span>
                    <span style={{ fontSize: 30, fontWeight: 900, color: r.color, transform: `translateX(${((1 - rn.opacity) * 14).toFixed(1)}px)`, opacity: rn.opacity }}>
                      {up!.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 28, fontWeight: 800, color: QBM.ink }}>{r.name}</span>
                    {r.tag ? <span style={{ fontSize: 21, color: QBM.sub }}>{r.tag}</span> : null}
                  </>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", alignItems: "center", gap: 14 }}>
                <div style={{ height: 30, borderRadius: 8, background: "#eef1f6", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, widthPct).toFixed(2)}%`, borderRadius: 8, background: r.color }} />
                </div>
                <span style={{ fontSize: 30, fontWeight: 900, color: r.color, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{shownV}</span>
              </div>
            </div>
          );
        })}
        {p.note && (!up || t >= upgradeAt + 0.85) ? (() => {
          const np = pop(t, (up ? upgradeAt + 0.85 : 1.3), 0.4);
          return (
            <div
              style={{
                marginTop: 16,
                background: "#eef3ff",
                color: QBM.blue,
                borderRadius: 14,
                padding: "12px 22px",
                fontSize: 26,
                fontWeight: 800,
                transform: `scale(${np.scale})`,
                opacity: np.opacity,
                transformOrigin: "left center",
              }}
            >
              {String(p.note)}
            </div>
          );
        })() : null}
        {p.footnote ? (
          <div style={{ ...MONO, marginTop: 14, fontSize: 19, color: QBM.sub, opacity: easeOut3((t - 1.4) / 0.5) }}>{String(p.footnote)}</div>
        ) : null}
      </div>
    );
  },
};

export default def;
