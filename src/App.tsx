/* FXDeck 编辑台 · 剪映式布局:
   顶栏(品牌/工程动作) → 左图标栏+面板(卡片库/已加卡片) → 中央播放器+走带条
   → 右检查器(分区参数) → 底部时间轴(工具条 + 刻度 + 可拖拽色块) */
import { useEffect, useMemo, useRef, useState } from "react";
import { CARDS, byKind } from "./registry";
import { newCard, parseDoc, serializeDoc, type Doc, type DocCard } from "./doc";
import { Stage } from "./Stage";
import { CardPreview } from "./CardPreview";
import { CardThumb } from "./CardThumb";
import { AiChat } from "./AiChat";
import { fmtTime } from "./core/anim";

/* 无编排时的稳定空数组:让依赖 cards 的 useMemo/Hooks 不因空态重渲 */
const EMPTY_CARDS: DocCard[] = [];

/* ── 草稿:一个草稿 = 一个视频的完整处理现场(编排 + 垫底视频 + 播放头)──
   列表元信息在 fxdeckDrafts,每份现场存 fxdeckDraft.<id>,上次打开记在 fxdeckDraftCurrent;
   老版单存档 fxdeckAutosave 首次挂载时迁移成「草稿 1」 */
type DraftMeta = { id: string; name: string; updatedAt: number };
const DRAFT_LIST_KEY = "fxdeckDrafts";
const DRAFT_CURRENT_KEY = "fxdeckDraftCurrent";
const LEGACY_AUTOSAVE_KEY = "fxdeckAutosave";
const draftKey = (id: string) => `fxdeckDraft.${id}`;

export default function App() {
  const [doc, setDoc] = useState<Doc | null>(null);
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
  const [aiOpen, setAiOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [draftId, setDraftId] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nowRef = useRef(0);
  const docRef = useRef<Doc | null>(null);
  // 每次提交后同步最新时间/编排到 ref:快捷键、撤销栈等非渲染路径要读「现在」,
  // 又不该触发重渲。commit/undo/redo/import 会同步写 docRef,这里是兜底
  useEffect(() => {
    nowRef.current = now;
    docRef.current = doc;
  });

  /* ── 撤销/重做:doc 快照栈 ──
     所有编辑走 commit():基于 docRef 同步算出下一个 doc、记完历史再 setDoc ——
     记账不放进 setState updater(updater 在渲染期才跑,StrictMode 还会双调用,
     按钮状态会慢一拍,实际踩过);docRef 的同步写保证连续编辑不丢更新 */
  const history = useRef<{ past: Doc[]; future: Doc[] }>({ past: [], future: [] });
  const histTag = useRef<{ tag: string | null; at: number }>({ tag: null, at: 0 });
  const [histLens, setHistLens] = useState({ p: 0, f: 0 });
  const syncHist = () => setHistLens({ p: history.current.past.length, f: history.current.future.length });
  const pushHistory = (d: Doc, tag?: string) => {
    const h = history.current;
    if (h.past[h.past.length - 1] === d) return;
    const t = Date.now();
    if (!(tag && histTag.current.tag === tag && t - histTag.current.at < 800)) {
      h.past.push(d);
      if (h.past.length > 60) h.past.shift();
      h.future.length = 0;
    }
    histTag.current = { tag: tag ?? null, at: t };
  };
  /** 会改编排的编辑统一入口 */
  const commit = (updater: (d: Doc) => Doc, tag?: string) => {
    const d = docRef.current;
    if (!d) return;
    const next = updater(d);
    if (next === d) return;
    pushHistory(d, tag);
    docRef.current = next;
    setDoc(next);
    syncHist();
  };
  const resetHistory = () => {
    history.current = { past: [], future: [] };
    histTag.current = { tag: null, at: 0 };
    syncHist();
  };
  const undo = () => {
    const h = history.current;
    const d = docRef.current;
    if (!d || !h.past.length) return;
    const prev = h.past.pop()!;
    h.future.push(d);
    docRef.current = prev;
    setDoc(prev);
    histTag.current = { tag: null, at: 0 };
    syncHist();
  };
  const redo = () => {
    const h = history.current;
    const d = docRef.current;
    if (!d || !h.future.length) return;
    const next = h.future.pop()!;
    h.past.push(d);
    docRef.current = next;
    setDoc(next);
    histTag.current = { tag: null, at: 0 };
    syncHist();
  };

  /** 把某份草稿现场上屏:编排/垫底视频/播放头;换工程清撤销栈与选中 */
  const loadDraft = (id: string) => {
    let saved: any = null;
    try {
      saved = JSON.parse(localStorage.getItem(draftKey(id)) ?? "null");
    } catch {
      /* 坏档按空草稿处理 */
    }
    const nextDoc = saved?.doc?.cards?.length ? (saved.doc as Doc) : null;
    const vid = saved?.videoServerSide && typeof saved.videoUrl === "string" && saved.videoUrl.startsWith("/_media/") ? saved.videoUrl : null;
    docRef.current = nextDoc;
    setDoc(nextDoc);
    resetHistory();
    setSelId(null);
    setVideoUrl(vid);
    setVideoServerSide(!!vid);
    setVideoDur(0); // 换了视频,时长等 onLoadedMetadata 重报
    setPlaying(false);
    seek(saved?.now ?? 0);
  };

  /** 立刻把当前现场落盘(切换草稿/关页时用,不等防抖) */
  const saveDraft = (id: string) => {
    try {
      localStorage.setItem(
        draftKey(id),
        JSON.stringify({ doc: docRef.current, videoUrl: videoServerSide ? videoUrl : undefined, videoServerSide, now: nowRef.current }),
      );
    } catch {
      /* 存不了就算了 */
    }
  };

  /** 草稿操作:切换 / 新建 / 重命名 / 删除 */
  const switchDraft = (id: string) => {
    if (!id || id === draftId) return;
    saveDraft(draftId);
    localStorage.setItem(DRAFT_CURRENT_KEY, id);
    setDraftId(id);
    loadDraft(id);
  };
  const newDraft = () => {
    saveDraft(draftId);
    const fresh: DraftMeta = { id: `d${Date.now()}`, name: `草稿 ${drafts.length + 1}`, updatedAt: Date.now() };
    const list = [...drafts, fresh];
    localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list));
    localStorage.setItem(DRAFT_CURRENT_KEY, fresh.id);
    setDrafts(list);
    setDraftId(fresh.id);
    loadDraft(fresh.id); // 无现场 = 空草稿
  };
  const renameDraft = () => {
    const cur = drafts.find((d) => d.id === draftId);
    if (!cur) return;
    const name = prompt("草稿名称", cur.name)?.trim();
    if (!name || name === cur.name) return;
    const list = drafts.map((d) => (d.id === cur.id ? { ...d, name } : d));
    localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list));
    setDrafts(list);
  };
  const deleteDraft = () => {
    const cur = drafts.find((d) => d.id === draftId);
    if (!cur) return;
    if (!confirm(`删除草稿「${cur.name}」?\n编排与播放头不可恢复(垫底视频文件仍留在服务器)`)) return;
    localStorage.removeItem(draftKey(cur.id));
    let list = drafts.filter((d) => d.id !== cur.id);
    if (!list.length) list = [{ id: `d${Date.now()}`, name: "草稿 1", updatedAt: Date.now() }]; // 最后一张删完补一张空草稿
    localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list));
    const next = list[0];
    localStorage.setItem(DRAFT_CURRENT_KEY, next.id);
    setDrafts(list);
    setDraftId(next.id);
    loadDraft(next.id);
  };

  /* 自动存档:当前草稿的任何变化 600ms 后落盘。now 也在依赖里 —— 播放中计时器
     一直被重置不打紧,停播/停擦洗 600ms 后才真写,顺带把播放头存进现场 */
  useEffect(() => {
    if (!draftId) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(draftId), JSON.stringify({ doc, videoUrl: videoServerSide ? videoUrl : undefined, videoServerSide, now }));
        setDrafts((list) => {
          const next = list.map((d) => (d.id === draftId ? { ...d, updatedAt: Date.now() } : d));
          localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(next));
          return next;
        });
      } catch {
        /* 存不了就算了 */
      }
    }, 600);
    return () => clearTimeout(id);
  }, [doc, videoUrl, videoServerSide, now, draftId]);

  /* 关页/切后台前把播放头等现场同步落盘(防抖等不到) */
  useEffect(() => {
    const flush = () => draftId && saveDraft(draftId);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveDraft 只读 ref 与当下 state
  }, [draftId, videoUrl, videoServerSide]);

  /* 当前草稿名跟到页签标题,多草稿切换时一眼可辨 */
  useEffect(() => {
    const cur = drafts.find((d) => d.id === draftId);
    document.title = cur ? `${cur.name} · FXDeck` : "FXDeck";
  }, [drafts, draftId]);

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

  /* 挂载:恢复草稿列表与上次打开的草稿;老版单存档迁移成「草稿 1」 */
  useEffect(() => {
    try {
      let list: DraftMeta[] = JSON.parse(localStorage.getItem(DRAFT_LIST_KEY) ?? "[]");
      const legacy = localStorage.getItem(LEGACY_AUTOSAVE_KEY);
      if (!list.length) {
        list = [{ id: `d${Date.now()}`, name: "草稿 1", updatedAt: Date.now() }];
        if (legacy) localStorage.setItem(draftKey(list[0].id), legacy);
      }
      if (legacy) localStorage.removeItem(LEGACY_AUTOSAVE_KEY);
      localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list));
      const cur = list.find((d) => d.id === localStorage.getItem(DRAFT_CURRENT_KEY)) ?? list[0];
      localStorage.setItem(DRAFT_CURRENT_KEY, cur.id);
      /* eslint-disable react-hooks/set-state-in-effect -- 挂载时一次性恢复草稿 */
      setDrafts(list);
      setDraftId(cur.id);
      loadDraft(cur.id);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* 坏档直接忽略 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 挂载时一次性恢复;loadDraft 只碰 ref 与 setter
  }, []);

  const seek = (t: number) => {
    const tt = Math.max(0, t);
    setNow(tt);
    if (videoRef.current) videoRef.current.currentTime = tt;
  };

  /* 快捷键:空格播放 / Del 删卡 / ←→ 步进 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if ((e.metaKey || e.ctrlKey) && (e.code === "KeyZ" || e.code === "KeyY")) {
        e.preventDefault();
        if (e.code === "KeyY" || e.shiftKey) redo();
        else undo();
      } else if ((e.code === "Delete" || e.code === "Backspace") && selId) {
        e.preventDefault();
        commit((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== selId) }));
        setSelId(null);
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        seek(nowRef.current + (e.code === "ArrowLeft" ? -0.5 : 0.5));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- undo/redo/commit 只碰 ref 与稳定 setter,闭包不陈旧
  }, [selId]);

  const importJson = async (f: File | null) => {
    if (!f) return;
    const r = parseDoc(await f.text());
    if (!r.doc) {
      alert(`导入失败:${r.error}`);
      return;
    }
    if (r.dropped?.length) alert(`跳过 ${r.dropped.map((d) => `${d.kind}×${d.n}`).join(", ")} —— 不是本库的卡或时间非法`);
    docRef.current = r.doc;
    setDoc(r.doc);
    resetHistory();
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
    docRef.current = r.doc;
    setDoc(r.doc);
    resetHistory();
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
    if (docRef.current) {
      commit((d) => ({ ...d, cards: [...d.cards, card].sort((a, b) => a.start - b.start) }));
    } else {
      const fresh: Doc = { fmt: "fxdeck/1", theme: "dark", cards: [card] };
      docRef.current = fresh;
      setDoc(fresh);
      resetHistory();
    }
    setSelId(card.id);
    setLeftView("list");
    if (at !== undefined) seek(start + 0.05);
  };

  /** 画面拖放落卡:pos 按落点区域推定,时间落在当前播放头 */
  const dropOnStage = (kind: string, pos: string) => {
    addCard(kind, undefined, { pos });
  };

  const removeCard = (id: string) => {
    commit((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }));
    setSelId((s) => (s === id ? null : s));
  };

  const patchSel = (patch: Partial<DocCard>, tag?: string) => {
    if (!selId) return;
    commit((d) => ({ ...d, cards: d.cards.map((c) => (c.id === selId ? { ...c, ...patch } : c)) }), tag);
  };
  const patchParam = (k: string, v: any) => {
    if (!selId) return;
    commit((d) => ({ ...d, cards: d.cards.map((c) => (c.id === selId ? { ...c, params: { ...c.params, [k]: v } } : c)) }), `param:${selId}:${k}`);
  };

  /* 时间轴色块拖拽:水平拖 = 移动起止(时长不变) */
  const drag = useRef<{ id: string; x0: number; start: number; end: number } | null>(null);
  const onBlockDown = (e: React.PointerEvent, c: DocCard) => {
    e.stopPropagation();
    setSelId(c.id);
    drag.current = { id: c.id, x0: e.clientX, start: c.start, end: c.end };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onBlockMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.round(((e.clientX - d.x0) / pps) * 10) / 10;
    const ns = Math.max(0, d.start + dt);
    patchSel({ id: d.id, start: ns, end: ns + (d.end - d.start) } as Partial<DocCard>, `drag:${d.id}`);
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

  /* ── 导出:POST 受理后立即返回,进度走 /api/status 轮询(长任务不再挂一条易断的连接),
        结果在右下状态条里展示,可中途取消;刷新页面会自动重连回在跑的任务 ── */
  const [expProg, setExpProg] = useState<{ frame: number; total: number; stage: string } | null>(null);
  const [expResult, setExpResult] = useState<{
    ok: boolean;
    mov?: string;
    final?: string;
    dir?: string;
    frames?: number;
    blank?: number;
    error?: string;
  } | null>(null);

  const pollExport = async (): Promise<NonNullable<typeof expResult>> => {
    let fails = 0;
    for (;;) {
      await new Promise((r) => setTimeout(r, 400));
      let s: any;
      try {
        s = await (await fetch("/api/status")).json();
        fails = 0;
      } catch {
        if (++fails >= 10) return { ok: false, error: "进度查询连续失败,dev 服务可能已停" };
        continue;
      }
      if (s.running) {
        setExpProg({ frame: s.frame, total: s.total, stage: s.stage });
        continue;
      }
      return s.result ?? { ok: false, error: "导出异常结束" };
    }
  };

  const runExport = async (final: boolean) => {
    if (!doc || !doc.cards.length) {
      alert("时间轴上还没有卡片");
      return;
    }
    if (final) {
      if (!videoUrl) {
        alert("成片需要口播原片:先点「🎞 垫底视频」导入");
        return;
      }
      if (!videoServerSide) {
        alert("当前垫底视频是临时模式(服务落盘失败过),请重新导入一次再导成片");
        return;
      }
    }
    if (busy) return;
    setBusy(true);
    setExpResult(null);
    setExpProg({ frame: 0, total: 0, stage: "render" });
    const end = Math.max(...doc.cards.map((c) => c.end));
    const renderDur = final && videoDur > 0 ? Math.min(end + 0.4, videoDur) : end + 0.4;
    try {
      const r = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, fps: 30000 / 1001, duration: renderDur, final, video: final ? videoUrl : undefined }),
      });
      const d = await r.json();
      if (!d.ok) {
        setExpResult({ ok: false, error: d.error ?? `HTTP ${r.status}` });
        return;
      }
      setExpResult(await pollExport());
    } catch (e) {
      setExpResult({ ok: false, error: String(e) });
    } finally {
      setBusy(false);
      setExpProg(null);
    }
  };

  const exportMov = () => runExport(false);
  const exportFinal = () => runExport(true);

  const cancelExport = async () => {
    try {
      await fetch("/api/cancel", { method: "POST" });
    } catch {
      /* 服务不在就算了 */
    }
  };

  /* 刷新重连:挂载时若服务端还有任务在跑,接管进度继续显示 */
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => {
        if (s?.running) {
          setBusy(true);
          setExpProg({ frame: s.frame, total: s.total, stage: s.stage });
          pollExport().then((result) => {
            setExpResult(result);
            setBusy(false);
            setExpProg(null);
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时重连一次
  }, []);

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
        // 草稿还是默认名时,拿视频文件名当草稿名,切草稿列表一眼能认
        setDrafts((list) => {
          const cur = list.find((x) => x.id === draftId);
          if (!cur || !/^草稿 \d+$/.test(cur.name)) return list;
          const next = list.map((x) => (x.id === draftId ? { ...x, name: file.name.replace(/\.[^.]+$/, "") } : x));
          localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(next));
          return next;
        });
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
        {/* 草稿:一个草稿 = 一个视频的处理现场,可多开随切 */}
        <select className="fd-draftsel" value={draftId} onChange={(e) => switchDraft(e.target.value)} title="切换草稿(每个草稿是一份独立的编排 + 垫底视频现场)">
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button title="新建草稿" onClick={newDraft}>
          📄＋
        </button>
        <button title="重命名当前草稿" onClick={renameDraft} disabled={!draftId}>
          ✎
        </button>
        <button title="删除当前草稿" onClick={deleteDraft} disabled={!draftId}>
          🗑
        </button>
        <span className="fd-flex" />
        <button onClick={() => fileRef.current?.click()}>📥 导入 JSON</button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => importJson(e.target.files?.[0] ?? null)} />
        <button onClick={loadDemo}>🎬 示例</button>
        <button onClick={() => setAiOpen((v) => !v)} title="和编程代理聊天改卡片">
          🤖 AI
        </button>
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
              <div className="fd-lib">
                {kinds.map((k, i) => (
                  /* div 而非 button:button 在 grid 里不随内容长高,缩略图会被压扁(实测) */
                  <div
                    key={k.kind}
                    className="fd-libcard"
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", k.kind);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => setTlDropTime(null)}
                    onClick={() => setPreviewKind(k.kind)}
                    onKeyDown={(e) => {
                      if (e.code === "Enter") setPreviewKind(k.kind);
                    }}
                    title="拖到时间轴任意时刻,或拖到画面按区域落位;点击预览动效"
                  >
                    <CardThumb kind={k.kind} phase={i * 0.9} />
                    <b>{k.name}</b>
                    <i>{k.desc}</i>
                  </div>
                ))}
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
              commit((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, params: { ...c.params, offX, offY } } : c)) }), `move:${id}`)
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
        <button title="缩小" onClick={() => setPps((p) => Math.max(24, p - 16))}>
          −
        </button>
        <input type="range" min={24} max={240} value={pps} onChange={(e) => setPps(+e.target.value)} />
        <button title="放大" onClick={() => setPps((p) => Math.min(240, p + 16))}>
          ＋
        </button>
        <span className="fd-zoom-val">{pps}px/s</span>
        <span className="fd-flex" />
        <button title="撤销(Cmd+Z)" disabled={!histLens.p} onClick={undo}>
          ↩ 撤销
        </button>
        <button title="重做(Cmd+Shift+Z)" disabled={!histLens.f} onClick={redo}>
          ↪ 重做
        </button>
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
                  onPointerDown={(e) => onBlockDown(e, c)}
                  onPointerMove={onBlockMove}
                  onPointerUp={onBlockUp}
                  title="拖动整块移动;点选编辑"
                >
                  {byKind(c.kind)?.name ?? c.kind}
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
      {/* AI 助手聊天窗:终端编程代理挂进编辑台,聊天改卡片源码 */}
      {aiOpen && <AiChat onClose={() => setAiOpen(false)} />}
      {/* 导出状态条:渲染/合成进度可取消,完成后展示产物路径 */}
      {(expProg || expResult) && (
        <div className="fd-exp-status">
          {expProg ? (
            <>
              <b>⬆ 导出中</b>
              <span className="fd-exp-stage">
                {expProg.stage === "render"
                  ? "逐帧渲染"
                  : expProg.stage === "mov"
                    ? "合成 MOV"
                    : expProg.stage === "webm"
                      ? "合成 WebM"
                      : expProg.stage === "final"
                        ? "合成成片"
                        : expProg.stage}
              </span>
              <div className="fd-exp-bar">
                <i style={{ width: expProg.total ? `${Math.round((expProg.frame / expProg.total) * 100)}%` : "4%" }} />
              </div>
              <span className="fd-exp-num">{expProg.total ? `${expProg.frame}/${expProg.total}` : "…"}</span>
              <button onClick={cancelExport}>取消</button>
            </>
          ) : (
            <>
              <b className={expResult?.ok ? "is-ok" : expResult?.error === "已手动取消" ? "" : "is-err"}>
                {expResult?.ok ? "✅ 导出完成" : expResult?.error === "已手动取消" ? "⏹ 已取消导出" : "❌ 导出失败"}
              </b>
              <span className="fd-exp-detail">
                {expResult?.ok
                  ? `${expResult.final ?? expResult.mov ?? ""} · ${expResult.frames} 帧${expResult.blank ? ` · 空帧复用 ${expResult.blank}` : ""}`
                  : String(expResult?.error ?? "").slice(-200)}
              </span>
              <button onClick={() => setExpResult(null)} title="关闭">
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
