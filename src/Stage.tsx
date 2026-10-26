/* 舞台:1920×1080 逻辑画布等比缩放;按 now 渲染在场卡片
   编辑台和导出视图共用这一个组件 —— 预览即导出的物理保证 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ACCENTS } from "./core/types";
import { byKind } from "./registry";
import type { DocCard } from "./doc";
import { outro } from "./core/anim";

export const W = 1920;
export const H = 1080;

const ANCHOR: Record<string, CSSProperties> = {
  left: { left: 110, top: "50%", transform: "translateY(-50%)" },
  right: { right: 110, top: "50%", transform: "translateY(-50%)" },
  top: { left: "50%", top: 84, transform: "translateX(-50%)" },
  bottom: { left: "50%", bottom: 96, transform: "translateX(-50%)" },
  center: { left: "50%", top: "50%", transform: "translate(-50%,-50%)" },
};

export type StagePos = keyof typeof ANCHOR;

/** 拖放落位提示框:每种 pos 高亮的舞台区域(舞台坐标,跟画布一起缩放) */
const HINT_RECT: Record<StagePos, CSSProperties> = {
  left: { left: 26, top: 26, bottom: 26, width: 562 },
  right: { right: 26, top: 26, bottom: 26, width: 562 },
  top: { left: 640, right: 640, top: 26, height: 326 },
  bottom: { left: 640, right: 640, bottom: 26, height: 326 },
  center: { left: 640, top: 404, right: 640, height: 272 },
};
const POS_LABEL: Record<StagePos, string> = { left: "左列", right: "右列", top: "顶部", bottom: "底部", center: "居中" };

/** 画布直拖:按下选中并捕获指针,位移按舞台缩放换算写回 offX/offY(≥3px 才算拖,避免误抖) */
function CardAt({
  card,
  now,
  selected,
  onPick,
  onMove,
  scale,
}: {
  card: DocCard;
  now: number;
  selected: boolean;
  onPick?: (id: string) => void;
  onMove?: (id: string, offX: number, offY: number) => void;
  scale: number;
}) {
  const def = byKind(card.kind);
  const dragRef = useRef<{ x0: number; y0: number; ox: number; oy: number; moved: boolean } | null>(null);
  if (!def) return null;
  const dur = card.end - card.start;
  const t = now - card.start;
  const o = outro(t, dur);
  const acc = ACCENTS[String(card.params.acc)] ?? ACCENTS.cyan;
  const pos = String(card.params.pos ?? "left") as keyof typeof ANCHOR;
  const interactive = !!(onPick || onMove);
  return (
    <div
      // 拖拽态从 ref 读:拖动期间 onMove 会触发重渲,is-drag 类随任一次重渲生效,无需为它单独开状态
      // eslint-disable-next-line react-hooks/refs -- 见上:有意的渲染期读 ref,微优化不加渲染
      className={"fd-card" + (selected ? " is-sel" : "") + (dragRef.current?.moved ? " is-drag" : "")}
      data-card={card.id}
      onPointerDown={
        interactive
          ? (e) => {
              // 只响应主键;文本输入类的卡内容不抢拖拽(比如字幕选字)——交给浏览器默认行为
              if (e.button !== 0) return;
              dragRef.current = {
                x0: e.clientX,
                y0: e.clientY,
                ox: Number(card.params.offX) || 0,
                oy: Number(card.params.offY) || 0,
                moved: false,
              };
              // 捕获指针保证快速拖出卡片范围也不断线;合成事件没有活动指针时会抛,不影响拖拽本身
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {
                /* 忽略 */
              }
              e.stopPropagation();
              onPick?.(card.id);
            }
          : undefined
      }
      onPointerMove={
        onMove
          ? (e) => {
              const d = dragRef.current;
              if (!d) return;
              const dx = (e.clientX - d.x0) / scale;
              const dy = (e.clientY - d.y0) / scale;
              if (!d.moved && Math.hypot(dx, dy) < 3) return; // 3px 内算点击,不动
              d.moved = true;
              onMove(card.id, Math.round(d.ox + dx), Math.round(d.oy + dy));
            }
          : undefined
      }
      onPointerUp={(e) => {
        dragRef.current = null;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      style={{
        position: "absolute",
        ...(ANCHOR[pos] ?? ANCHOR.left),
        marginLeft: Number(card.params.offX) || 0,
        marginTop: Number(card.params.offY) || 0,
        ["--acc" as string]: acc,
        opacity: 1 - o,
        transform: `${(ANCHOR[pos] ?? ANCHOR.left).transform} translateY(${(o * 14).toFixed(1)}px)`,
        pointerEvents: interactive ? "auto" : "none",
        touchAction: "none",
      }}
    >
      {def.render({ p: card.params, t, dur, at: now })}
    </div>
  );
}

export function Stage({
  cards,
  now,
  selId,
  onPick,
  onMove,
  videoUrl,
  videoMuted,
  onVideoMeta,
  onDropCard,
}: {
  cards: DocCard[];
  now: number;
  selId?: string | null;
  onPick?: (id: string) => void;
  onMove?: (id: string, offX: number, offY: number) => void;
  videoUrl?: string | null;
  videoMuted?: boolean;
  onVideoMeta?: (dur: number) => void;
  /** 卡片库拖入:落下时回调(kind 已验证存在),pos 按落点区域推定 */
  onDropCard?: (kind: string, pos: StagePos) => void;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.4);
  const [dropPos, setDropPos] = useState<StagePos | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setScale(Math.min(r.width / W, r.height / H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /** 屏幕坐标 → 落位区域:左右竖带给 left/right,中带按上下再分 top/bottom/center */
  const posFromPoint = (clientX: number, clientY: number): StagePos => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return "center";
    const w = W * scale;
    const h = H * scale;
    const nx = (clientX - (r.left + (r.width - w) / 2)) / w;
    const ny = (clientY - (r.top + (r.height - h) / 2)) / h;
    if (nx < 0.32) return "left";
    if (nx > 0.68) return "right";
    if (ny < 0.35) return "top";
    if (ny > 0.65) return "bottom";
    return "center";
  };
  const live = cards.filter((c) => now >= c.start - 0.001 && now < c.end);
  return (
    <div
      ref={wrap}
      className="fd-stagewrap"
      onDragOver={
        onDropCard
          ? (e) => {
              if (!e.dataTransfer.types.includes("text/plain")) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDropPos(posFromPoint(e.clientX, e.clientY));
            }
          : undefined
      }
      onDragLeave={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) setDropPos(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("text/plain");
        setDropPos(null);
        if (!onDropCard || !byKind(kind)) return;
        onDropCard(kind, posFromPoint(e.clientX, e.clientY));
      }}
    >
      <div className="fd-stage" style={{ width: W, height: H, transform: `translate(-50%,-50%) scale(${scale})` }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            className="fd-backdrop"
            muted={videoMuted ?? true}
            playsInline
            onLoadedMetadata={(e) => onVideoMeta?.(e.currentTarget.duration || 0)}
            // 编辑台由外部对时;导出视图不传视频
            ref={(el) => {
              if (el && el.dataset.bind !== "1") {
                el.dataset.bind = "1";
                (el as any).__seek = (t: number) => {
                  try {
                    el.currentTime = t;
                  } catch {
                    /* 元数据未到 */
                  }
                };
              }
            }}
          />
        ) : null}
        {live.map((c) => (
          <CardAt key={c.id} card={c} now={now} selected={c.id === selId} onPick={onPick} onMove={onMove} scale={scale} />
        ))}
        {dropPos ? (
          <div className="fd-drop-hint" style={HINT_RECT[dropPos]}>
            <span>{POS_LABEL[dropPos]}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
