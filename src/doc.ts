/* 编排文档(FXDeck JSON):解析 / 序列化 / 默认值合并 */
import { byKind } from "./registry";

export interface DocCard {
  id: string;
  kind: string;
  start: number;
  end: number;
  params: Record<string, any>;
}

export interface Doc {
  fmt: "fxdeck/1";
  theme: "dark";
  cards: DocCard[];
}

export interface ParseResult {
  doc: Doc | null;
  error?: string;
  dropped?: { kind: string; n: number }[];
}

export function parseDoc(text: string): ParseResult {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { doc: null, error: `不是合法 JSON:${e}` };
  }
  const cardsIn = Array.isArray(raw?.cards) ? raw.cards : null;
  if (!cardsIn) return { doc: null, error: "缺少 cards 数组" };
  const droppedMap = new Map<string, number>();
  const cards: DocCard[] = [];
  for (const c of cardsIn) {
    const def = byKind(String(c?.kind ?? ""));
    if (!def || typeof c.start !== "number" || typeof c.end !== "number" || !(c.end > c.start)) {
      droppedMap.set(String(c?.kind ?? "?"), (droppedMap.get(String(c?.kind ?? "?")) ?? 0) + 1);
      continue;
    }
    cards.push({
      id: String(c.id ?? `card-${cards.length + 1}`),
      kind: String(c.kind),
      start: c.start,
      end: c.end,
      params: { ...def.defaults, ...(c.params ?? {}) },
    });
  }
  cards.sort((a, b) => a.start - b.start);
  return {
    doc: { fmt: "fxdeck/1", theme: "dark", cards },
    dropped: [...droppedMap.entries()].map(([kind, n]) => ({ kind, n })),
  };
}

export const serializeDoc = (doc: Doc) => JSON.stringify(doc, null, 2);

/** 编辑台里新建一张卡 */
export function newCard(kind: string, start: number, existIds: string[]): DocCard {
  const def = byKind(kind)!;
  let n = existIds.length + 1;
  while (existIds.includes(`c${n}`)) n++;
  const dur = kind === "captionBar" || kind === "stepFlow" ? 12 : 5;
  return { id: `c${n}`, kind, start, end: start + dur, params: { ...def.defaults } };
}
