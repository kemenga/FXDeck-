/* 导出视图:?export=1 时挂载。读 /api/job 拿编排,按注入时间逐帧渲染。
   页面背景透明,配合导出脚本的黑/白双底截图重构出带 alpha 的 PNG 序列 */
import { useEffect, useState } from "react";
import { Stage } from "./Stage";
import type { Doc } from "./doc";

export function ExportView() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    document.body.classList.add("fd-export");
    fetch("/api/job")
      .then((r) => r.json())
      .then((d) => { if (d?.doc) setDoc(d.doc); })
      .catch(() => {});
    // 常驻 rAF 循环:老 headless 的合成器没人请求帧就会休眠,之后的 DOM 更新
    // 永远到不了截图表面(实测:首帧之后全部拍到空白)。持续请求帧 = 表面永远新鲜
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    // 对时:无头浏览器逐帧调用;过一帧(状态必已提交并画出)再 resolve
    (window as any).__fxSeek = (t: number) =>
      new Promise<void>((res) => {
        setNow(t);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            res();
          });
        });
      });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!doc) return null;
  return (
    <div className="fd-export-root">
      <Stage cards={doc.cards} now={now} />
    </div>
  );
}
