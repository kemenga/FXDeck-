/* 卡片注册表:加新卡 = 写一个 CardDef,push 进 CARDS,其余全线自动生效 */
import type { CardDef } from "./core/types";
import { textCards } from "./cards/text";
import { listCards } from "./cards/list";
import { dataCards } from "./cards/data";
import { extraCards } from "./cards/extra";
import { moreCards } from "./cards/more";

export const CARDS: CardDef<any>[] = [...textCards, ...listCards, ...dataCards, ...extraCards, ...moreCards];

export const byKind = (kind: string) => CARDS.find((c) => c.kind === kind);
