/* 底部时间轴:工具条(撤销重做/缩放/删除) + 刻度 + 多轨色块 + 可擦洗播放头。
   拖拽手势(色块平移/trim/播放头擦洗)与落点指示是本面板的局部 UI 状态,随组件走;
   编排变更通过回调交回 App */
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { byKind } from "../registry";
import type { DocCard } from "../doc";

const LANE_H = 50;

export function Timeline({
  cards,
  sel,
  selId,
  now,
  dur,
  pps,
  onPpsChange,
  histLen,
  onUndo,
  onRedo,
  onSeek,
  onAddCard,
  onPatchSel,
  onSetSelId,
  onRemoveCard,
  playing,
  onPlayingChange,
}: {
  cards: DocCard[];
  sel: DocCard | null;
  selId: string | null;
  now: number;
  dur: number;
  pps: number;
  onPpsChange: Dispatch<SetStateAction<number>>;
  histLen: { u: number; r: number };
  onUndo: () => void;
  onRedo: () => void;
  onSeek: (t: number) => void;
  onAddCard: (kind: string, at?: number) => void;
  onPatchSel: (patch: Partial<DocCard>) => void;
  onSetSelId: (id: string) => void;
  onRemoveCard: (id: string) => void;
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
}) {
  const tlWidth = Math.max(1200, dur * pps + 400);

  /* 卡片库拖放:时间轴悬停的落点指示(秒),null = 不在拖入 */
  const [tlDropTime, setTlDropTime] = useState<number | null>(null);
  // 拖拽在时间轴外松手(dragend 在源元素上触发,冒泡到 window)也要清指示
  useEffect(() => {
    const clear = () => setTlDropTime(null);
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, []);
  const tlDropT = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const t = Math.max(0, Math.min((e.clientX - r.left + el.scrollLeft) / pps, tlWidth / pps - 0.5));
    return Math.round(t * 10) / 10; // 0.1s 栅格,与色块拖拽/检查器输入一致
  };

  /* 轨道分行:时间重叠的卡排不同行(剪映式多轨),贪心装箱 */
  const lanes = useMemo(() => {
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const c of cards) {
      let li = laneEnds.findIndex((e) => e <= c.start + 1e-9);
      if (li === -1) {
        li = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[li] = c.end;
      laneOf.set(c.id, li);
    }
    return { n: Math.max(1, laneEnds.length), laneOf };
  }, [cards]);

  /* 时间轴色块拖拽:主体水平拖 = 平移起止(时长不变);右缘手柄拖 = 调 end(trim,最小 0.3s) */
  const drag = useRef<{ id: string; x0: number; start: number; end: number; mode: "move" | "trim" } | null>(null);
  const onBlockDown = (e: React.PointerEvent, c: DocCard, mode: "move" | "trim") => {
    e.stopPropagation();
    onSetSelId(c.id);
    drag.current = { id: c.id, x0: e.clientX, start: c.start, end: c.end, mode };
    // 合成事件没有活动指针时会抛,不影响拖拽本身
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* 忽略 */
    }
  };
  const onBlockMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.round(((e.clientX - d.x0) / pps) * 10) / 10;
    if (d.mode === "trim") {
      onPatchSel({ id: d.id, end: Math.max(d.start + 0.3, d.end + dt) } as Partial<DocCard>);
      return;
    }
    const ns = Math.max(0, d.start + dt);
    onPatchSel({ id: d.id, start: ns, end: ns + (d.end - d.start) } as Partial<DocCard>);
  };
  const onBlockUp = () => {
    drag.current = null;
  };

  /* 播放头擦洗:抓住竖线/线头左右拖,画面与垫底视频跟手;拖动中暂停,松手恢复播放。
     相对拖拽(抓住点不跳),范围夹在 0..dur */
  const phDrag = useRef<{ x0: number; t0: number; wasPlaying: boolean } | null>(null);
  const onPhDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // 别触发轨道的点击跳转
    // 捕获指针保证快速拖出竖线也不断线;合成事件没有活动指针时会抛,不影响拖拽本身
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* 忽略 */
    }
    phDrag.current = { x0: e.clientX, t0: now, wasPlaying: playing };
    if (playing) onPlayingChange(false);
  };
  const onPhMove = (e: React.PointerEvent) => {
    const d = phDrag.current;
    if (!d) return;
    const t = d.t0 + (e.clientX - d.x0) / pps;
    onSeek(dur > 0 ? Math.min(Math.max(0, t), dur) : Math.max(0, t));
  };
  const onPhUp = (e: React.PointerEvent) => {
    const d = phDrag.current;
    phDrag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* 合成事件没有活动指针 */
    }
    if (d?.wasPlaying) onPlayingChange(true);
  };

  return (
    <>
      <div className="fd-tlbar">
        <span className="fd-tl-title">时间轴</span>
        <button title="撤销(Ctrl+Z)" disabled={histLen.u === 0} onClick={onUndo}>
          ↶
        </button>
        <button title="重做(Ctrl+Shift+Z)" disabled={histLen.r === 0} onClick={onRedo}>
          ↷
        </button>
        <button title="缩小" onClick={() => onPpsChange((p) => Math.max(24, p - 16))}>
          −
        </button>
        <input type="range" min={24} max={240} value={pps} onChange={(e) => onPpsChange(+e.target.value)} />
        <button title="放大" onClick={() => onPpsChange((p) => Math.min(240, p + 16))}>
          ＋
        </button>
        <span className="fd-zoom-val">{pps}px/s</span>
        <span className="fd-flex" />
        <button disabled={!sel} onClick={() => sel && onRemoveCard(sel.id)}>
          🗑 删除选中
        </button>
      </div>
      <div className="fd-timeline">
        <div
          className="fd-tl-scroll"
          onPointerDown={(e) => {
            const el = e.currentTarget as HTMLElement;
            const r = el.getBoundingClientRect();
            onSeek((e.clientX - r.left + el.scrollLeft) / pps);
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("text/plain")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setTlDropTime(tlDropT(e));
          }}
          onDragLeave={(e) => {
            if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setTlDropTime(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const kind = e.dataTransfer.getData("text/plain");
            setTlDropTime(null);
            if (byKind(kind)) onAddCard(kind, tlDropT(e));
          }}
        >
          <div className="fd-tl-inner" style={{ width: tlWidth }}>
            <div className="fd-ruler">
              {Array.from({ length: Math.ceil(tlWidth / (pps * 2)) + 1 }, (_, i) => (
                <span key={i} style={{ left: i * 2 * pps }}>
                  {i * 2}s
                </span>
              ))}
            </div>
            <div className="fd-track" style={{ height: lanes.n * LANE_H + 12 }}>
              {cards.map((c) => (
                <div
                  key={c.id}
                  className={"fd-block" + (c.id === selId ? " is-on" : "")}
                  style={{ left: c.start * pps, width: Math.max(30, (c.end - c.start) * pps), top: (lanes.laneOf.get(c.id) ?? 0) * LANE_H + 8 }}
                  onPointerDown={(e) => onBlockDown(e, c, "move")}
                  onPointerMove={onBlockMove}
                  onPointerUp={onBlockUp}
                  title="拖动整块移动;拖右缘调时长;点选编辑"
                >
                  {byKind(c.kind)?.name ?? c.kind}
                  <span className="fd-block-trim" onPointerDown={(e) => onBlockDown(e, c, "trim")} title="拖动调整时长" />
                </div>
              ))}
              {!cards.length && <div className="fd-track-empty">空轨道 —— 从左侧卡片库拖卡进来,或导入 JSON</div>}
            </div>
            {tlDropTime !== null && (
              <div className="fd-drop-line" style={{ left: tlDropTime * pps }}>
                <i>{tlDropTime.toFixed(1)}s</i>
              </div>
            )}
            <div
              className="fd-ph"
              style={{ left: now * pps }}
              onPointerDown={onPhDown}
              onPointerMove={onPhMove}
              onPointerUp={onPhUp}
              onPointerCancel={onPhUp}
              title="左右拖动擦洗预览;点击轨道任意处跳转"
            />
          </div>
        </div>
      </div>
    </>
  );
}
