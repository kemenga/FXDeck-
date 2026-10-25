/* 卡片动效预览弹窗:点卡片库先看动效再决定加不加 */
import { useEffect, useRef, useState } from "react";
import { byKind } from "./registry";
import { Stage } from "./Stage";

/* 各卡预览循环时长(秒):够把主动画演完一轮 */
const PREVIEW_DUR: Record<string, number> = {
  stepFlow: 13,
  terminalCard: 7,
  captionBar: 7,
};

/** 卡片动效预览:默认参数跑一遍,循环播放;重放=重挂;加到播放头=落进时间轴 */
export function CardPreview({ kind, onClose, onAdd }: { kind: string; onClose: () => void; onAdd: () => void }) {
  const def = byKind(kind)!;
  const loopDur = PREVIEW_DUR[kind] ?? 6;
  const [t, setT] = useState(0);
  const [tok, setTok] = useState(0);
  // onClose/onAdd 每次渲染都是新函数;放进 effect 依赖会导致时钟反复重置(动画冻结),用 ref 隔离
  const cbRef = useRef({ onClose, onAdd });
  cbRef.current = { onClose, onAdd };
  useEffect(() => {
    // 本地循环时钟:播到 loopDur 归零重播。只在本弹窗存活期间跑
    let raf = 0;
    let t0 = performance.now();
    const tick = (tm: number) => {
      const el = (tm - t0) / 1000;
      if (el >= loopDur) { t0 = tm; setT(0); }
      else setT(el);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => { if (e.code === "Escape") cbRef.current.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, [tok, loopDur]);
  const card = { id: "preview", kind, start: 0, end: loopDur, params: { ...def.defaults } };
  return (
    <div
      className="fd-pv-mask"
      onClick={onClose}
      // 关键布局内联一份:dev 服务器缓存 stale 丢过这段 CSS(实测),内联保证弹窗永远居中可用
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.64)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="fd-pv" onClick={(e) => e.stopPropagation()} style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 14, overflow: "hidden" }}>
        <div className="fd-pv-head">
          <b>{def.name}</b>
          <span>{def.desc}</span>
          <button onClick={onClose} title="关闭(Esc)">✕</button>
        </div>
        <div className="fd-pv-stage" style={{ position: "relative", height: "min(52vw, 500px)", background: "#0b0d10" }}>
          {/* key 换 = 整卡重挂,动画从头跑 */}
          <Stage key={tok} cards={[card]} now={t} />
        </div>
        <div className="fd-pv-foot">
          <span className="fd-pv-time">{t.toFixed(1)} / {loopDur.toFixed(0)}s · 循环</span>
          <button onClick={() => { setT(0); setTok((x) => x + 1); }}>↻ 重放</button>
          <span className="fd-flex" />
          <button onClick={onClose}>取消</button>
          <button className="fd-primary" onClick={onAdd}>＋ 加到播放头</button>
        </div>
      </div>
    </div>
  );
}
