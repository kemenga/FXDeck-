/* 顶栏:品牌 + 草稿 + 工程动作(剪映式:动作集中右上)。状态全在 App,这里只收回调 */
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
  progress,
  drafts,
  draftId,
  onSwitchDraft,
  onNewDraft,
  onRenameDraft,
  onDeleteDraft,
  aiOn,
  onToggleAi,
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
  progress: { frame: number; total: number } | null;
  drafts: { id: string; name: string; updatedAt: number }[];
  draftId: string;
  onSwitchDraft: (id: string) => void;
  onNewDraft: () => void;
  onRenameDraft: () => void;
  onDeleteDraft: () => void;
  aiOn: boolean;
  onToggleAi: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <header className="fd-top">
      <div className="fd-brand">
        FX<span>DECK</span>
        <i>动效卡座 · v0.1</i>
      </div>
      {/* 草稿:一个草稿 = 一个视频的处理现场,可多开随切 */}
      <select className="fd-draftsel" value={draftId} onChange={(e) => onSwitchDraft(e.target.value)} title="切换草稿(每个草稿是一份独立的编排 + 垫底视频现场)">
        {drafts.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <button title="新建草稿" onClick={onNewDraft}>
        📄＋
      </button>
      <button title="重命名当前草稿" onClick={onRenameDraft} disabled={!draftId}>
        ✎
      </button>
      <button title="删除当前草稿" onClick={onDeleteDraft} disabled={!draftId}>
        🗑
      </button>
      <span className="fd-flex" />
      <button onClick={() => fileRef.current?.click()}>📥 导入 JSON</button>
      <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => onImportJson(e.target.files?.[0] ?? null)} />
      <button onClick={onLoadDemo}>🎬 示例</button>
      <button className={aiOn ? "is-on" : ""} onClick={onToggleAi} title="和编程代理聊天改卡片">
        🤖 AI
      </button>
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
        {busy ? (progress && progress.total > 0 ? `🎬 ${progress.frame}/${progress.total} 帧` : "导出中…") : "🎬 导出成片"}
      </button>
    </header>
  );
}
