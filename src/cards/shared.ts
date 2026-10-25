/* 卡片共享小件:常用字体样式与「/」分隔参数解析 */
export const FONT = { fontFamily: "var(--deck-font)" } as const;
export const MONO = { fontFamily: "var(--deck-mono)" } as const;

/** 「a/b/c」斜杠分隔参数 → 修剪空白的非空条目数组 */
export const splitItems = (s: unknown) =>
  String(s || "")
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);
