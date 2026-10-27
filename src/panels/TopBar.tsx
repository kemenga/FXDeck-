/* 顶栏:品牌 + 工程动作(剪映式:动作集中右上)。状态全在 App,这里只收回调 */
import { useRef } from "react";

export function TopBar({
  onImportJson,
  onImportVideo,
  onLoadDemo,
  onExportJson,
  hasDoc,
  videoUrl,
  onRemoveVideo,
  onExportMov,
  onExportFinal,
  busy,
}: {
  onImportJson: (f: File | null) => void;
  onImportVideo: (f: File | null) => void;
  onLoadDemo: () => void;
  onExportJson: () => void;
  hasDoc: boolean;
  videoUrl: string | null;
  onRemoveVideo: () => void;
  onExportMov: () => void;
  onExportFinal: () => void;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <header className="fd-top">
      <div className="fd-brand">
        FX<span>DECK</span>
        <i>动效卡座 · v0.1</i>
      </div>
      <span className="fd-flex" />
      <button onClick={() => fileRef.current?.click()}>📥 导入 JSON</button>
      <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => onImportJson(e.target.files?.[0] ?? null)} />
      <button onClick={onLoadDemo}>🎬 示例</button>
      <button onClick={onExportJson} disabled={!hasDoc}>
        📤 存 JSON
      </button>
      <label className="fd-btn-file">
        🎞 垫底视频
        <input
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            onImportVideo(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </label>
      {videoUrl ? <button onClick={onRemoveVideo}>✕</button> : null}
      <button onClick={onExportMov} disabled={busy}>
        ⬆ 导出透明层
      </button>
      <button
        className="fd-primary"
        onClick={onExportFinal}
        disabled={busy || !videoUrl}
        title={videoUrl ? "口播原片 + 动效层 + 原声,一条 MP4" : "先导入垫底视频"}
      >
        {busy ? "导出中…" : "🎬 导出成片"}
      </button>
    </header>
  );
}
