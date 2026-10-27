/* FXDeck 编辑台 · 剪映式布局:
   顶栏(品牌/工程动作) → 左图标栏+面板(卡片库/已加卡片) → 中央播放器+走带条
   → 右检查器(分区参数) → 底部时间轴(工具条 + 刻度 + 可拖拽色块) */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CARDS, byKind } from "./registry";
import { newCard, parseDoc, serializeDoc, type Doc, type DocCard } from "./doc";
import { Stage } from "./Stage";
import { CardPreview } from "./CardPreview";
import { TopBar } from "./panels/TopBar";
import { Inspector } from "./panels/Inspector";
import { Timeline } from "./panels/Timeline";
import { fmtTime } from "./core/anim";

/* 无编排时的稳定空数组:让依赖 cards 的 useMemo/Hooks 不因空态重渲 */
const EMPTY_CARDS: DocCard[] = [];

export default function App() {
  const [doc, setDocState] = useState<Doc | null>(null);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDur, setVideoDur] = useState(0);
  const [videoServerSide, setVideoServerSide] = useState(false); // 落盘过 = 导出成片可用
  const [pps, setPps] = useState(80); // 时间轴像素/秒
  const [busy, setBusy] = useState(false);
  const [leftView, setLeftView] = useState<"lib" | "list">("lib");
  const [previewKind, setPreviewKind] = useState<string | null>(null);
  const [libQuery, setLibQuery] = useState(""); // 卡片库搜索词
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nowRef = useRef(0);
  // 每次提交后同步最新时间到 ref:快捷键等非渲染路径要读「现在」,又不该触发重渲
  useEffect(() => {
    nowRef.current = now;
  });

  /* 撤销/重做:编辑历史栈。setDoc 在改前把快照压入 undo 栈;
     800ms 内的连发(拖色块/拖滑杆逐帧触发)合并为一步,栈深上限 50 */
  const docRef = useRef<Doc | null>(null);
  const undoRef = useRef<(Doc | null)[]>([]);
  const redoRef = useRef<(Doc | null)[]>([]);
  const lastEditRef = useRef(0);
  const [histLen, setHistLen] = useState({ u: 0, r: 0 });
  const syncHist = () =>
    setHistLen((p) => (p.u === undoRef.current.length && p.r === redoRef.current.length ? p : { u: undoRef.current.length, r: redoRef.current.length }));

  const setDoc = useCallback((updater: (d: Doc | null) => Doc | null) => {
    const prev = docRef.current;
    const next = updater(prev);
    if (next === prev) return;
    const now = Date.now();
    if (now - lastEditRef.current > 800) {
      undoRef.current.push(prev);
      if (undoRef.current.length > 50) undoRef.current.shift();
    }
    lastEditRef.current = now;
    redoRef.current = [];
    docRef.current = next;
    setDocState(next);
    syncHist();
  }, []);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev === undefined) return;
    if (docRef.current) redoRef.current.push(docRef.current);
    lastEditRef.current = 0; // 撤销本身不入栈,下一步编辑重新起一步
    docRef.current = prev;
    setDocState(prev);
    syncHist();
  }, []);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (next === undefined) return;
    if (docRef.current) {
      undoRef.current.push(docRef.current);
      if (undoRef.current.length > 50) undoRef.current.shift();
    }
    lastEditRef.current = 0;
    docRef.current = next;
    setDocState(next);
    syncHist();
  }, []);

  /* 自动存档:任何编辑后 600ms 落进 localStorage,刷新/误关自动恢复。
     只存服务器路径的垫底视频(blob 地址存了也是坏的);编排本体全量存 */
  const AUTOSAVE_KEY = "fxdeckAutosave";
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (!doc) {
          localStorage.removeItem(AUTOSAVE_KEY);
          return;
        }
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({
            doc,
            videoUrl: videoServerSide ? videoUrl : undefined,
            videoServerSide,
          }),
        );
      } catch {
        /* 隐私模式存不了就算了 */
      }
    }, 600);
    return () => clearTimeout(id);
  }, [doc, videoUrl, videoServerSide]);

  const cards = doc?.cards ?? EMPTY_CARDS;
  const sel = cards.find((c) => c.id === selId) ?? null;
  const dur = Math.max(0, ...cards.map((c) => c.end), videoDur);

  /* 播放时钟:有垫底视频跟视频走,否则自走 */
  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    let raf = 0;
    let last = performance.now();
    if (v) v.play().catch(() => setPlaying(false));
    const tick = (tm: number) => {
      if (v) {
        setNow(v.currentTime);
        if (v.ended) {
          setPlaying(false);
          return;
        }
      } else {
        const dt = (tm - last) / 1000;
        last = tm;
        setNow((x) => Math.min(dur, x + dt));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (v) v.pause();
    };
  }, [playing, dur, videoUrl]);

  useEffect(() => {
    // 播到片尾自停:自走时钟在 tick 里夹住了 now,这里补上「停播」这个状态转移
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载/播放尾部的正常状态收尾,不会级联
    if (playing && dur > 0 && now >= dur) setPlaying(false);
  }, [now, dur, playing]);

  /* 绑定垫底视频元素(Stage 里渲染的那个) */
  useEffect(() => {
    const el = document.querySelector<HTMLVideoElement>(".fd-backdrop");
    if (el) {
      videoRef.current = el;
      el.currentTime = nowRef.current;
    }
  }, [videoUrl]);

  /* 挂载恢复:上次自动存档的编排 + 垫底视频(服务器路径,刷新不丢) */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      /* eslint-disable react-hooks/set-state-in-effect -- 挂载时一次性恢复存档 */
      if (saved?.doc?.cards?.length) setDoc(() => saved.doc);
      if (saved?.videoServerSide && typeof saved.videoUrl === "string" && saved.videoUrl.startsWith("/_media/")) {
        setVideoUrl(saved.videoUrl);
        setVideoServerSide(true);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* 坏存档直接忽略 */
    }
  }, [setDoc]);

  const seek = (t: number) => {
    const tt = Math.max(0, t);
    setNow(tt);
    if (videoRef.current) videoRef.current.currentTime = tt;
  };

  /* 快捷键:空格播放 / Del 删卡 / ←→ 步进 / Ctrl+Z 撤销 / Ctrl+Shift+Z 重做 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") {
        e.preventDefault();
        redo();
      } else if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if ((e.code === "Delete" || e.code === "Backspace") && selId) {
        e.preventDefault();
        setDoc((d) => (d ? { ...d, cards: d.cards.filter((c) => c.id !== selId) } : d));
        setSelId(null);
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        seek(nowRef.current + (e.code === "ArrowLeft" ? -0.5 : 0.5));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selId, undo, redo, setDoc]);

  const importJson = async (f: File | null) => {
    if (!f) return;
    const r = parseDoc(await f.text());
    if (!r.doc) {
      alert(`导入失败:${r.error}`);
      return;
    }
    if (r.dropped?.length) alert(`跳过 ${r.dropped.map((d) => `${d.kind}×${d.n}`).join(", ")} —— 不是本库的卡或时间非法`);
    setDoc(() => r.doc);
    setSelId(r.doc.cards[0]?.id ?? null);
    setLeftView("list");
    seek(0);
  };

  const exportJson = () => {
    if (!doc) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([serializeDoc(doc)], { type: "application/json" }));
    a.download = "fxdeck.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const loadDemo = async () => {
    const r = parseDoc(await (await fetch("/demo.json")).text());
    if (!r.doc) return;
    setDoc(() => r.doc);
    setSelId(r.doc.cards[0]?.id ?? null);
    setLeftView("list");
    seek(1);
  };

  /** 加一张卡:at 缺省 = 当前播放头;paramPatch 覆盖默认参数(拖放落位用);
      指定了 at(时间轴拖放)时把播放头带过去,立刻能看到进场 */
  const addCard = (kind: string, at?: number, paramPatch?: Record<string, any>) => {
    const start = at ?? Math.round(now * 10) / 10;
    const card = newCard(
      kind,
      start,
      cards.map((c) => c.id),
    );
    if (paramPatch) card.params = { ...card.params, ...paramPatch };
    setDoc((d) => (d ? { ...d, cards: [...d.cards, card].sort((a, b) => a.start - b.start) } : { fmt: "fxdeck/1", theme: "dark", cards: [card] }));
    setSelId(card.id);
    setLeftView("list");
    if (at !== undefined) seek(start + 0.05);
  };

  /** 画面拖放落卡:pos 按落点区域推定,时间落在当前播放头 */
  const dropOnStage = (kind: string, pos: string) => {
    addCard(kind, undefined, { pos });
  };

  const removeCard = (id: string) => {
    setDoc((d) => (d ? { ...d, cards: d.cards.filter((c) => c.id !== id) } : d));
    setSelId((s) => (s === id ? null : s));
  };

  const patchSel = (patch: Partial<DocCard>) => {
    if (!selId) return;
    setDoc((d) => (d ? { ...d, cards: d.cards.map((c) => (c.id === selId ? { ...c, ...patch } : c)) } : d));
  };
  const patchParam = (k: string, v: any) => {
    if (!selId) return;
    setDoc((d) => (d ? { ...d, cards: d.cards.map((c) => (c.id === selId ? { ...c, params: { ...c.params, [k]: v } } : c)) } : d));
  };

  const exportMov = async () => {
    if (!doc || !doc.cards.length) {
      alert("时间轴上还没有卡片");
      return;
    }
    if (busy) return;
    setBusy(true);
    const end = Math.max(...doc.cards.map((c) => c.end));
    try {
      const r = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, fps: 30000 / 1001, duration: end + 0.4 }),
      });
      const d = await r.json();
      if (d.ok) alert(`✅ 透明层导出完成\n\n透明 MOV:${d.mov}\n帧目录:${d.dir}\n\n拖进剪映置顶轨道盖在原片上`);
      else alert(`导出失败:${d.error}`);
    } catch (e) {
      alert(`导出失败:${e}`);
    } finally {
      setBusy(false);
    }
  };

  /* 成片 = 垫底视频 + 动效层 + 原声,一次出可发布的 MP4。
     时长:卡结束与原片时长取小者(层播完就用 eof_action 保留原片,不白渲) */
  const exportFinal = async () => {
    if (!doc || !doc.cards.length) {
      alert("时间轴上还没有卡片");
      return;
    }
    if (!videoUrl) {
      alert("成片需要口播原片:先点「🎞 垫底视频」导入");
      return;
    }
    if (!videoServerSide) {
      alert("当前垫底视频是临时模式(服务落盘失败过),请重新导入一次再导成片");
      return;
    }
    if (busy) return;
    setBusy(true);
    const end = Math.max(...doc.cards.map((c) => c.end));
    const renderDur = videoDur > 0 ? Math.min(end + 0.4, videoDur) : end + 0.4;
    try {
      const r = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, fps: 30000 / 1001, duration: renderDur, final: true, video: videoUrl }),
      });
      const d = await r.json();
      if (d.ok) alert(`✅ 成片导出完成!\n\n${d.final}\n\n口播 + 动效 + 原声都在里面,可直接发布`);
      else alert(`导出失败:${d.error}`);
    } catch (e) {
      alert(`导出失败:${e}`);
    } finally {
      setBusy(false);
    }
  };

  /* 垫底视频导入:优先落盘到服务器(导出成片要读真实文件),失败退回临时 blob 模式 */
  const handleVideo = async (file: File | null) => {
    if (!file) return;
    setPlaying(false);
    try {
      const r = await fetch("/api/media", {
        method: "POST",
        headers: { "x-filename": encodeURIComponent(file.name) },
        body: file,
      });
      const d = await r.json();
      if (d?.ok && d.url) {
        setVideoUrl(d.url);
        setVideoServerSide(true);
        return;
      }
      alert(`视频落盘失败(${d?.error ?? `HTTP ${r.status}`}),退回临时模式:预览可用,但导出成片前需重新导入`);
    } catch {
      alert("视频落盘失败(服务未响应),退回临时模式:预览可用,但导出成片前需重新导入");
    }
    setVideoUrl(URL.createObjectURL(file));
  };

  const kinds = useMemo(() => CARDS.map((c) => ({ kind: c.kind, name: c.name, desc: c.desc })), []);
  /* 卡片库搜索:按名称/描述/kind 过滤(大小写不敏感) */
  const libKinds = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    if (!q) return kinds;
    return kinds.filter((k) => k.name.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q) || k.kind.toLowerCase().includes(q));
  }, [kinds, libQuery]);

  return (
    <div className="fd-app">
      <TopBar
        onImportJson={importJson}
        onImportVideo={handleVideo}
        onLoadDemo={loadDemo}
        onExportJson={exportJson}
        hasDoc={!!doc}
        videoUrl={videoUrl}
        onRemoveVideo={() => {
          setVideoUrl(null);
          setVideoServerSide(false);
          setVideoDur(0);
        }}
        onExportMov={exportMov}
        onExportFinal={exportFinal}
        busy={busy}
      />

      <div className="fd-body">
        {/* 左:图标栏 + 面板 */}
        <nav className="fd-rail">
          <button className={leftView === "lib" ? "is-on" : ""} title="卡片库" onClick={() => setLeftView("lib")}>
            ▦
          </button>
          <button className={leftView === "list" ? "is-on" : ""} title="已加卡片" onClick={() => setLeftView("list")}>
            ☰
          </button>
        </nav>
        <aside className="fd-left">
          {leftView === "lib" ? (
            <>
              <div className="fd-panel-title">
                卡片库<span>{CARDS.length}</span>
              </div>
              <input className="fd-lib-search" placeholder="搜卡片名/用途…" value={libQuery} onChange={(e) => setLibQuery(e.target.value)} />
              <div className="fd-lib">
                {libKinds.map((k) => (
                  <button
                    key={k.kind}
                    className="fd-libcard"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", k.kind);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => setPreviewKind(k.kind)}
                    title="拖到时间轴任意时刻,或拖到画面按区域落位;点击预览动效"
                  >
                    <b>{k.name}</b>
                    <i>{k.desc}</i>
                  </button>
                ))}
                {!libKinds.length && <div className="fd-lib-nomatch">没有匹配「{libQuery}」的卡片</div>}
              </div>
              <div className="fd-lib-hint">拖到时间轴/画面直接放置 · 点击卡片先预览动效</div>
            </>
          ) : (
            <>
              <div className="fd-panel-title">
                已加卡片<span>{cards.length}</span>
              </div>
              <div className="fd-list">
                {cards.map((c, i) => (
                  <button
                    key={c.id}
                    className={"fd-item" + (c.id === selId ? " is-on" : "")}
                    onClick={() => {
                      setSelId(c.id);
                      seek(c.start + 0.05);
                    }}
                  >
                    <b>{String(i + 1).padStart(2, "0")}</b>
                    <span>{byKind(c.kind)?.name ?? c.kind}</span>
                    <time>
                      {c.start.toFixed(1)}–{c.end.toFixed(1)}
                    </time>
                  </button>
                ))}
                {!cards.length && (
                  <div className="fd-empty">
                    还没有卡片
                    <br />
                    去「卡片库」加,或导入 JSON
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        {/* 中:播放器 + 走带条 */}
        <main className="fd-player">
          <Stage
            cards={cards}
            now={now}
            selId={selId}
            onPick={setSelId}
            onMove={(id, offX, offY) =>
              setDoc((d) => (d ? { ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, params: { ...c.params, offX, offY } } : c)) } : d))
            }
            videoUrl={videoUrl}
            videoMuted
            onVideoMeta={setVideoDur}
            onDropCard={dropOnStage}
          />
          <div className="fd-transport">
            <span className="fd-tc">
              {fmtTime(now)}
              <i> / {fmtTime(dur)}</i>
            </span>
            <span className="fd-flex" />
            <button title="后退 0.5s(←)" onClick={() => seek(now - 0.5)}>
              ⏮
            </button>
            <button className="fd-play" title="播放/暂停(空格)" onClick={() => setPlaying((p) => !p)}>
              {playing ? "⏸" : "▶"}
            </button>
            <button title="前进 0.5s(→)" onClick={() => seek(now + 0.5)}>
              ⏭
            </button>
            <span className="fd-flex" />
            <span className="fd-count">{cards.length} 卡</span>
          </div>
        </main>

        {/* 右:检查器(分区参数编辑在 panels/Inspector) */}
        <Inspector sel={sel} kinds={kinds} onPatchSel={patchSel} onPatchParam={patchParam} onRemoveCard={removeCard} />
      </div>

      {/* 底部:时间轴工具条 + 刻度 + 多轨色块 + 可擦洗播放头(在 panels/Timeline) */}
      <Timeline
        cards={cards}
        sel={sel}
        selId={selId}
        now={now}
        dur={dur}
        pps={pps}
        onPpsChange={setPps}
        histLen={histLen}
        onUndo={undo}
        onRedo={redo}
        onSeek={seek}
        onAddCard={addCard}
        onPatchSel={patchSel}
        onSetSelId={setSelId}
        onRemoveCard={removeCard}
        playing={playing}
        onPlayingChange={setPlaying}
      />
      {/* 卡片预览弹窗:点卡片库先看动效再决定加不加 */}
      {previewKind && (
        <CardPreview
          kind={previewKind}
          onClose={() => setPreviewKind(null)}
          onAdd={() => {
            addCard(previewKind);
            setPreviewKind(null);
          }}
        />
      )}
    </div>
  );
}
