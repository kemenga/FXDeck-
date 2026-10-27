/* 卡片库动效缩略图:迷你 Stage 循环播放默认参数动效 —— 与预览弹窗/导出同一条渲染管线,
   所见即所得。省性能两板斧:滚进视口才动(IntersectionObserver),时钟节流 ~15fps
   (缩略图看动效足够,全库同开也不拖累编辑台) */
import { useEffect, useRef, useState } from "react";
import { byKind } from "./registry";
import { PREVIEW_DUR } from "./CardPreview";
import { Stage } from "./Stage";

export function CardThumb({ kind, phase }: { kind: string; phase: number }) {
  const def = byKind(kind)!;
  const loopDur = PREVIEW_DUR[kind] ?? 6;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  // 错峰起步:整面缩略图别齐刷刷同一拍
  const [t, setT] = useState(phase % loopDur);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    let last = performance.now();
    let raf = 0;
    const tick = (tm: number) => {
      if (tm - last >= 66) {
        last = tm;
        setT((x) => (x + 0.066 >= loopDur ? 0 : x + 0.066));
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [visible, loopDur]);
  const card = { id: "thumb", kind, start: 0, end: loopDur, params: { ...def.defaults } };
  return (
    // 高度内联保底:缩略图尺寸是组件关键约束,不赌外部样式表的加载时序(dev 缓存丢过 CSS,实际踩过)
    <div
      ref={wrapRef}
      className="fd-thumb"
      style={{ position: "relative", height: 118, flexShrink: 0, borderRadius: 7, overflow: "hidden", background: "#0b0d10", pointerEvents: "none" }}
      aria-hidden
    >
      <Stage cards={[card]} now={t} />
    </div>
  );
}
