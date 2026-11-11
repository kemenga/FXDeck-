/* 情报马白卡包共享件:白底卡片视觉语言(资讯号「情报马(ai资讯版)」动效拆解复现)
   特点:白底圆角卡 + 深灰正文 + 鲜艳色块强调 + 弹簧弹入,与暗色玻璃卡(glass)互补 */
import { easeOut3, easeOutBack, clamp01 } from "../core/anim";

/** 情报马调色板(从原片取色) */
export const QBM = {
  blue: "#3d6bf4",
  sky: "#9db6e8",
  orange: "#e8653a",
  dark: "#3c4354",
  red: "#e4443c",
  pink: "#f26d8d",
  green: "#27a55b",
  ink: "#232b38",
  sub: "#8a93a3",
};

/** 白卡通用阴影 */
export const QSHADOW = "0 14px 44px rgba(28,42,80,.24)";
/** 白卡小阴影(药丸/芯片) */
export const QSHADOW_S = "0 6px 20px rgba(28,42,80,.18)";

/** tone 参数选项(情报马语义色) */
export const TONE_OPTIONS = [
  { label: "蓝 · 主色", value: "blue" },
  { label: "橙 · 数据", value: "orange" },
  { label: "粉 · CTA", value: "pink" },
  { label: "红 · 否定", value: "red" },
  { label: "绿 · 认可", value: "green" },
  { label: "深灰 · 中性", value: "dark" },
  { label: "浅蓝 · kicker", value: "sky" },
];

export const toneColor = (tone: unknown, fallback = QBM.blue) =>
  (QBM as Record<string, string>)[String(tone || "")] ?? fallback;

/** *强调* 段解析 → [{text, hl}](与 hookText 同语法,奇数段为强调) */
export function segs(text: unknown): { text: string; hl: boolean }[] {
  return String(text || "")
    .split("*")
    .map((s, i) => ({ text: s, hl: i % 2 === 1 }));
}

/** 混色文字行:hl 段染 tone 色(继承父级字号) */
export function Mixed({ text, color }: { text: unknown; color: string }) {
  return (
    <>
      {segs(text).map((s, i) => (
        <span key={i} style={{ color: s.hl ? color : QBM.ink, whiteSpace: "pre" }}>
          {s.text}
        </span>
      ))}
    </>
  );
}

/** 白卡弹入:弹簧缩放(0.6→1 带过冲)+ 快速淡入 */
export function pop(t: number, delay = 0, dur = 0.42) {
  const p = easeOutBack((t - delay) / dur);
  return { scale: Math.max(0.001, p), opacity: clamp01((t - delay) / (dur * 0.35)) };
}

/** 白卡滑入:位移淡入(dy 为起始偏移) */
export function slide(t: number, delay = 0.05, dur = 0.4, dy = -22) {
  const p = easeOut3((t - delay) / dur);
  return { opacity: p, dy: (1 - p) * dy };
}
