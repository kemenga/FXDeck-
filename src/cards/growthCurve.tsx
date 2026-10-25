/* 增长曲线:折线自绘 + 数据点弹出 + 峰值计数 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { clamp01, count, easeIO3, easeOutBack, enter } from "../core/anim";
import { FONT, MONO } from "./shared";

const def: CardDef<any> = {
  kind: "growthCurve",
  name: "增长曲线",
  desc: "上涨叙事:折线自己画出来,峰值数字滚动。每条「标签,数值」用 | 分隔",
  defaults: {
    kicker: "GROWTH",
    points: "1月,120|2月,480|3月,2100",
    unit: "粉",
    pos: "right",
    acc: "cyan",
    offX: 0,
    offY: 0,
  },
  ctrls: [
    { k: "kicker", label: "眉题(英文等宽)", type: "text" },
    { k: "points", label: "数据点(标签,数值 | 分隔)", type: "textarea", rows: 2 },
    { k: "unit", label: "单位", type: "text" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const pts = String(p.points || "")
      .split("|")
      .map((s) => s.split(",").map((x) => x.trim()))
      .filter((r) => r.length >= 2)
      .map(([label, v]) => ({ label, v: Number(v) || 0 }));
    if (pts.length < 2) return null;
    const W = 660,
      H = 340,
      L = 56,
      R = 120,
      T = 46,
      B = 56;
    const max = Math.max(...pts.map((x) => x.v), 1);
    const xy = pts.map((pt, i) => ({
      x: L + (i * (W - L - R)) / (pts.length - 1),
      y: T + (1 - pt.v / max) * (H - T - B),
    }));
    const totalLen = xy.slice(1).reduce((acc, cur, i) => acc + Math.hypot(cur.x - xy[i].x, cur.y - xy[i].y), 0);
    const draw = easeIO3((t - 0.3) / 1.5);
    const peak = pts[pts.length - 1];
    const peakShown = count(t, peak.v, 1.2, 0.9);
    const en = enter(t);
    return (
      <div className="glass" style={{ ...FONT, width: W + 40, padding: "26px 20px 18px", opacity: en }}>
        {p.kicker ? (
          <div style={{ ...MONO, fontSize: 19, letterSpacing: "0.32em", fontWeight: 700, color: "var(--acc)", marginLeft: 36 }}>
            {String(p.kicker).toUpperCase()}
          </div>
        ) : null}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* 横轴基线 */}
          <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="rgba(255,255,255,.14)" strokeWidth="2" />
          {/* 面积:随画线进度淡入 */}
          <polygon points={`${xy.map((q) => `${q.x},${q.y}`).join(" ")} ${W - R},${H - B} ${L},${H - B}`} fill="var(--acc)" opacity={0.1 * draw} />
          {/* 折线:dashoffset 从全长画到 0 */}
          <polyline
            points={xy.map((q) => `${q.x},${q.y}`).join(" ")}
            fill="none"
            stroke="var(--acc)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen.toFixed(1)}
            strokeDashoffset={(totalLen * (1 - draw)).toFixed(1)}
            style={{ filter: "drop-shadow(0 0 10px rgba(62,197,214,.4))" }}
          />
          {/* 数据点:线画到哪,点弹出 */}
          {xy.map((q, i) => {
            const passed = clamp01((draw * (pts.length - 1) - i + 1) / 1);
            const pop = easeOutBack((passed - 0.15) / 0.3);
            return <circle key={i} cx={q.x} cy={q.y} r={9} fill="#0b0f14" stroke="var(--acc)" strokeWidth="5" opacity={clamp01(pop)} />;
          })}
          {/* 横轴标签 */}
          {pts.map((pt, i) => (
            <text key={i} x={xy[i].x} y={H - 18} textAnchor="middle" fontSize="20" fill="rgba(244,247,250,.55)" fontFamily="var(--deck-mono)">
              {pt.label}
            </text>
          ))}
          {/* 峰值标签 */}
          <text x={W - R + 16} y={xy[xy.length - 1].y + 9} fontSize="38" fontWeight="900" fill="#f4f7fa" fontFamily="var(--deck-font)">
            {peakShown.toLocaleString("en-US")}
          </text>
          <text x={W - R + 16} y={xy[xy.length - 1].y + 38} fontSize="19" fill="var(--acc)" fontFamily="var(--deck-font)">
            {String(p.unit || "")}
          </text>
        </svg>
      </div>
    );
  },
};

export default def;
