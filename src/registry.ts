/* 卡片注册表:加新卡 = 在 cards/ 建一个 <kind>.tsx(default export 一个 CardDef),
   再在下面 import + CARDS 里加一行,其余全线自动生效 */
import type { CardDef } from "./core/types";
import hookText from "./cards/hookText";
import conceptText from "./cards/conceptText";
import quoteCard from "./cards/quoteCard";
import captionBar from "./cards/captionBar";
import pinList from "./cards/pinList";
import tickList from "./cards/tickList";
import stepFlow from "./cards/stepFlow";
import bigNumber from "./cards/bigNumber";
import barRank from "./cards/barRank";
import versusCard from "./cards/versusCard";
import termCard from "./cards/termCard";
import punchPill from "./cards/punchPill";
import progressRing from "./cards/progressRing";
import terminalCard from "./cards/terminalCard";
import statStrip from "./cards/statStrip";
import arrowFlow from "./cards/arrowFlow";
import markerText from "./cards/markerText";
import chatBubbles from "./cards/chatBubbles";
import growthCurve from "./cards/growthCurve";
import stampBadge from "./cards/stampBadge";
import chapterBar from "./cards/chapterBar";
import countdownRing from "./cards/countdownRing";
import chapterNum from "./cards/chapterNum";
import triCompare from "./cards/triCompare";
import skillList from "./cards/skillList";
import danmaku from "./cards/danmaku";
import stickerPair from "./cards/stickerPair";
import dotMatrix from "./cards/dotMatrix";
import sketchCircle from "./cards/sketchCircle";
import ctaBubble from "./cards/ctaBubble";
import tileGrid from "./cards/tileGrid";

export const CARDS: CardDef<any>[] = [
  hookText,
  conceptText,
  quoteCard,
  captionBar,
  pinList,
  tickList,
  stepFlow,
  bigNumber,
  barRank,
  versusCard,
  termCard,
  punchPill,
  progressRing,
  terminalCard,
  statStrip,
  arrowFlow,
  markerText,
  chatBubbles,
  growthCurve,
  stampBadge,
  chapterBar,
  countdownRing,
  chapterNum,
  triCompare,
  skillList,
  danmaku,
  stickerPair,
  dotMatrix,
  sketchCircle,
  ctaBubble,
  tileGrid,
];

export const byKind = (kind: string) => CARDS.find((c) => c.kind === kind);
