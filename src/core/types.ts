/* FXDeck 渲染核心 · 类型系统
   设计原则:动效卡 = 时间的纯函数。卡片自己没有状态、没有时钟,
   一切动画由外部注入的 t(卡片已进行的秒数)驱动 —— 编辑台用 rAF 驱动,
   导出用无头浏览器逐帧注入。同一份渲染代码,预览即导出。 */
import type { ReactNode } from "react";

/** 参数控件声明(参数面板据此自动生成 UI) */
export type Ctrl =
  | { k: string; label: string; type: "text" }
  | { k: string; label: string; type: "textarea"; rows?: number }
  | { k: string; label: string; type: "select"; options: { label: string; value: string }[] }
  | { k: string; label: string; type: "range"; min: number; max: number; step: number; unit?: string }
  | { k: string; label: string; type: "toggle" };

/** 渲染上下文:p=参数, t=卡片已进行秒数, dur=卡片总时长, at=时间轴绝对秒(字幕类卡用) */
export interface Ctx<P = Record<string, unknown>> {
  p: P;
  t: number;
  dur: number;
  at: number;
}

/** 一张动效卡的定义 */
export interface CardDef<P = Record<string, unknown>> {
  kind: string;
  name: string;
  desc: string;
  defaults: P;
  ctrls: Ctrl[];
  /** 纯渲染:t 只增不减,同一 t 必得同一画面(导出逐帧对位的根基) */
  render: (c: Ctx<P>) => ReactNode;
}

/** 通用参数:所有卡都带(渲染器统一消费,不用每张卡自己声明控件) */
export interface CommonP {
  pos: "left" | "right" | "top" | "bottom" | "center";
  acc: string; // cyan | amber | rose
  offX: number;
  offY: number;
}

/** 强调色三原(全片语义制:数据青 / 提醒琥珀 / 否定玫) */
export const ACCENTS: Record<string, string> = {
  cyan: "#3ec5d6",
  amber: "#f2b544",
  rose: "#ef6a7a",
};
export const ACC_OPTIONS = [
  { label: "青 · 数据/正向", value: "cyan" },
  { label: "琥珀 · 提醒/转变", value: "amber" },
  { label: "玫 · 否定/风险", value: "rose" },
];
export const POS_OPTIONS = [
  { label: "左列", value: "left" },
  { label: "右列", value: "right" },
  { label: "顶部", value: "top" },
  { label: "底部", value: "bottom" },
  { label: "居中", value: "center" },
];

/** 所有卡共用的控件尾部(落位/强调色/微调) */
export const COMMON_CTRLS: Ctrl[] = [
  { k: "pos", label: "落位", type: "select", options: POS_OPTIONS },
  { k: "acc", label: "强调色", type: "select", options: ACC_OPTIONS },
  { k: "offX", label: "水平微调", type: "range", min: -800, max: 800, step: 10, unit: "px" },
  { k: "offY", label: "垂直微调", type: "range", min: -450, max: 450, step: 10, unit: "px" },
];
