/* FXDeck 编辑台 · 剪映式布局:
   顶栏(品牌/工程动作) → 左图标栏+面板(卡片库/已加卡片) → 中央播放器+走带条
   → 右检查器(分区参数) → 底部时间轴(工具条 + 刻度 + 可拖拽色块) */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CARDS, byKind } from "./registry";
import { newCard, parseDoc, serializeDoc, type Doc, type DocCard } from "./doc";
import { Stage } from "./Stage";
import { CardPreview } from "./CardPreview";
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
  const fileRef = useRef<HTMLInputElement | null>(null);
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

  /* 时间轴色块拖拽:主体水平拖 = 平移起止(时长不变);右缘手柄拖 = 调 end(trim,最小 0.3s) */
  const drag = useRef<{ id: string; x0: number; start: number; end: number; mode: "move" | "trim" } | null>(null);
  const onBlockDown = (e: React.PointerEvent, c: DocCard, mode: "move" | "trim") => {
    e.stopPropagation();
    setSelId(c.id);
    drag.current = { id: c.id, x0: e.clientX, start: c.start, end: c.end, mode };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onBlockMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.round(((e.clientX - d.x0) / pps) * 10) / 10;
    if (d.mode === "trim") {
      patchSel({ id: d.id, end: Math.max(d.start + 0.3, d.end + dt) } as Partial<DocCard>);
      return;
    }
    const ns = Math.max(0, d.start + dt);
    patchSel({ id: d.id, start: ns, end: ns + (d.end - d.start) } as Partial<DocCard>);
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
    if (playing) setPlaying(false);
  };
  const onPhMove = (e: React.PointerEvent) => {
    const d = phDrag.current;
    if (!d) return;
    const t = d.t0 + (e.clientX - d.x0) / pps;
    seek(dur > 0 ? Math.min(Math.max(0, t), dur) : Math.max(0, t));
  };
  const onPhUp = (e: React.PointerEvent) => {
    const d = phDrag.current;
    phDrag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* 合成事件没有活动指针 */
    }
    if (d?.wasPlaying) setPlaying(true);
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

  const contentCtrls = sel ? (byKind(sel.kind)?.ctrls ?? []).filter((c) => !["pos", "acc", "offX", "offY"].includes(c.k)) : [];
  const kinds = useMemo(() => CARDS.map((c) => ({ kind: c.kind, name: c.name, desc: c.desc })), []);
  /* 卡片库搜索:按名称/描述/kind 过滤(大小写不敏感) */
  const libKinds = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    if (!q) return kinds;
    return kinds.filter((k) => k.name.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q) || k.kind.toLowerCase().includes(q));
  }, [kinds, libQuery]);
  const tlWidth = Math.max(1200, dur * pps + 400);

  /* 卡片库拖放:时间轴悬停的落点指示(秒),null = 不在拖入 */
  const [tlDropTime, setTlDropTime] = useState<number | null>(null);
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
  const LANE_H = 50;

  return (
    <div className="fd-app">
      {/* 顶栏:品牌 + 工程动作(剪映式:动作集中右上) */}
      <header className="fd-top">
        <div className="fd-brand">
          FX<span>DECK</span>
          <i>动效卡座 · v0.1</i>
        </div>
        <span className="fd-flex" />
        <button onClick={() => fileRef.current?.click()}>📥 导入 JSON</button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => importJson(e.target.files?.[0] ?? null)} />
        <button onClick={loadDemo}>🎬 示例</button>
        <button onClick={exportJson} disabled={!doc}>
          📤 存 JSON
        </button>
        <label className="fd-btn-file">
          🎞 垫底视频
          <input
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              handleVideo(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </label>
        {videoUrl ? (
          <button
            onClick={() => {
              setVideoUrl(null);
              setVideoServerSide(false);
              setVideoDur(0);
            }}
          >
            ✕
          </button>
        ) : null}
        <button onClick={exportMov} disabled={busy}>
          ⬆ 导出透明层
        </button>
        <button
          className="fd-primary"
          onClick={exportFinal}
          disabled={busy || !videoUrl}
          title={videoUrl ? "口播原片 + 动效层 + 原声,一条 MP4" : "先导入垫底视频"}
        >
          {busy ? "导出中…" : "🎬 导出成片"}
        </button>
      </header>

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
                    onDragEnd={() => setTlDropTime(null)}
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

        {/* 右:检查器(分区) */}
        <aside className="fd-inspector">
          {!sel ? (
            <div className="fd-empty">
              选中卡片编辑参数
              <br />
              画布点卡,或左侧列表选
            </div>
          ) : (
            <>
              <div className="fd-insp-head">
                <b>{byKind(sel.kind)?.name}</b>
                <select
                  value={sel.kind}
                  title="换卡(文字重填)"
                  onChange={(e) => patchSel({ kind: e.target.value, params: { ...byKind(e.target.value)!.defaults } })}
                >
                  {kinds.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fd-sec">
                <span>内容</span>
              </div>
              <div className="fd-ctrls">
                {contentCtrls.map((ct) => (
                  <label key={ct.k} className="fd-ctrl">
                    <span>{ct.label}</span>
                    {ct.type === "text" && <input value={sel.params[ct.k] ?? ""} onChange={(e) => patchParam(ct.k, e.target.value)} />}
                    {ct.type === "textarea" && (
                      <textarea rows={ct.rows ?? 3} value={sel.params[ct.k] ?? ""} onChange={(e) => patchParam(ct.k, e.target.value)} />
                    )}
                    {ct.type === "select" && (
                      <select value={sel.params[ct.k] ?? ""} onChange={(e) => patchParam(ct.k, e.target.value)}>
                        {ct.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {ct.type === "range" && (
                      <>
                        <input
                          type="range"
                          min={ct.min}
                          max={ct.max}
                          step={ct.step}
                          value={sel.params[ct.k] ?? ct.min}
                          onChange={(e) => patchParam(ct.k, +e.target.value)}
                        />
                        <output>
                          {String(sel.params[ct.k] ?? "")}
                          {ct.unit ?? ""}
                        </output>
                      </>
                    )}
                  </label>
                ))}
              </div>
              <div className="fd-sec">
                <span>时间</span>
              </div>
              <div className="fd-time-row">
                <label>
                  开始
                  <input
                    type="number"
                    step="0.1"
                    value={sel.start}
                    onChange={(e) => {
                      const v = +e.target.value;
                      if (v < sel.end) patchSel({ start: v });
                    }}
                  />
                </label>
                <label>
                  结束
                  <input
                    type="number"
                    step="0.1"
                    value={sel.end}
                    onChange={(e) => {
                      const v = +e.target.value;
                      if (v > sel.start) patchSel({ end: v });
                    }}
                  />
                </label>
              </div>
              <div className="fd-sec">
                <span>位置与强调</span>
              </div>
              <div className="fd-ctrls">
                {(byKind(sel.kind)?.ctrls ?? [])
                  .filter((c) => ["pos", "acc", "offX", "offY"].includes(c.k))
                  .map((ct) => (
                    <label key={ct.k} className="fd-ctrl">
                      <span>{ct.label}</span>
                      {ct.type === "select" && (
                        <select value={sel.params[ct.k] ?? ""} onChange={(e) => patchParam(ct.k, e.target.value)}>
                          {ct.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {ct.type === "range" && (
                        <>
                          <input
                            type="range"
                            min={ct.min}
                            max={ct.max}
                            step={ct.step}
                            value={sel.params[ct.k] ?? ct.min}
                            onChange={(e) => patchParam(ct.k, +e.target.value)}
                          />
                          <output>
                            {String(sel.params[ct.k] ?? "")}
                            {ct.unit ?? ""}
                          </output>
                        </>
                      )}
                    </label>
                  ))}
              </div>
              <button className="fd-del" onClick={() => removeCard(sel.id)}>
                🗑 删除这张卡
              </button>
            </>
          )}
        </aside>
      </div>

      {/* 底部:时间轴工具条 + 刻度 + 轨道 */}
      <div className="fd-tlbar">
        <span className="fd-tl-title">时间轴</span>
        <button title="撤销(Ctrl+Z)" disabled={histLen.u === 0} onClick={undo}>
          ↶
        </button>
        <button title="重做(Ctrl+Shift+Z)" disabled={histLen.r === 0} onClick={redo}>
          ↷
        </button>
        <button title="缩小" onClick={() => setPps((p) => Math.max(24, p - 16))}>
          −
        </button>
        <input type="range" min={24} max={240} value={pps} onChange={(e) => setPps(+e.target.value)} />
        <button title="放大" onClick={() => setPps((p) => Math.min(240, p + 16))}>
          ＋
        </button>
        <span className="fd-zoom-val">{pps}px/s</span>
        <span className="fd-flex" />
        <button disabled={!sel} onClick={() => sel && removeCard(sel.id)}>
          🗑 删除选中
        </button>
      </div>
      <div className="fd-timeline">
        <div
          className="fd-tl-scroll"
          onPointerDown={(e) => {
            const el = e.currentTarget as HTMLElement;
            const r = el.getBoundingClientRect();
            seek((e.clientX - r.left + el.scrollLeft) / pps);
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
            if (byKind(kind)) addCard(kind, tlDropT(e));
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
