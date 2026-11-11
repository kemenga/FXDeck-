/* FXDeck 编辑台 · 剪映式布局:
   顶栏(品牌/草稿/工程动作) → 左图标栏+面板(卡片库/已加卡片) → 中央播放器+走带条
   → 右检查器(分区参数,panels/Inspector) → 底部时间轴(panels/Timeline)
   草稿系统/AI 助手/卡片缩略图/异步导出进度为本地线特性,合并自并行开发两侧 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CARDS, byKind } from "./registry";
import { newCard, parseDoc, serializeDoc, type Doc, type DocCard } from "./doc";
import { Stage } from "./Stage";
import { CardPreview } from "./CardPreview";
import { CardThumb } from "./CardThumb";
import { AiChat } from "./AiChat";
import { TopBar } from "./panels/TopBar";
import { Inspector } from "./panels/Inspector";
import { Timeline } from "./panels/Timeline";
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
  const [aiOpen, setAiOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [draftId, setDraftId] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nowRef = useRef(0);
  const docRef = useRef<Doc | null>(null);
  // 每次提交后同步最新时间/编排到 ref:快捷键、撤销栈等非渲染路径要读「现在」,
  // 又不该触发重渲。setDoc/undo/redo/import 会同步写 docRef,这里是兜底
  useEffect(() => {
    nowRef.current = now;
    docRef.current = doc;
  });

  /* ── 撤销/重做:编辑历史栈。setDoc 在改前把快照压入 undo 栈;
     800ms 内的连发(拖色块/拖滑杆逐帧触发)合并为一步,栈深上限 50;
     docRef 同步写保证连续编辑不丢更新;换工程(草稿/导入/示例)走 resetDoc 清栈 */
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

  /** 换工程语义:直接换编排并清空撤销栈(草稿切换/导入/示例),undo 不跨工程回跳 */
  const resetDoc = (next: Doc | null) => {
    undoRef.current = [];
    redoRef.current = [];
    lastEditRef.current = 0;
    docRef.current = next;
    setDocState(next);
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
    resetDoc(nextDoc);
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

  /* 最近一次导出结果:顶栏下方常驻条展示,路径可一键复制(替代打断式 alert) */
  const [lastExport, setLastExport] = useState<{ label: string; path: string; frames: number } | null>(null);

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

  /* 快捷键:空格播放 / Del 删卡 / ←→ 步进 / Alt+←→ 微调选中卡 / Ctrl+D 复制卡 / Ctrl+Z 撤销 / Ctrl+Shift+Z 重做 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyZ" || e.code === "KeyY")) {
        e.preventDefault();
        if (e.code === "KeyY" || e.shiftKey) redo();
        else undo();
      } else if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if ((e.code === "Delete" || e.code === "Backspace") && selId) {
        e.preventDefault();
        setDoc((d) => (d ? { ...d, cards: d.cards.filter((c) => c.id !== selId) } : d));
        setSelId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyD" && selId) {
        // 复制选中卡:新卡紧贴原卡尾部,参数全带,自动选中(新 id 由 updater 内取号)
        e.preventDefault();
        let newId = "";
        setDoc((d) => {
          if (!d) return d;
          const src = d.cards.find((c) => c.id === selId);
          if (!src) return d;
          let n = d.cards.length + 1;
          while (d.cards.some((c) => c.id === `c${n}`)) n++;
          newId = `c${n}`;
          const dur = src.end - src.start;
          const copy: DocCard = { ...src, id: newId, start: src.end, end: src.end + dur, params: { ...src.params } };
          return { ...d, cards: [...d.cards, copy].sort((a, b) => a.start - b.start) };
        });
        if (newId) setSelId(newId);
      } else if (e.altKey && (e.code === "ArrowLeft" || e.code === "ArrowRight") && selId) {
        // 微调选中卡:整体平移 ±0.1s(时长不变),与 trim 手柄/检查器输入互补
        e.preventDefault();
        const dt = e.code === "ArrowLeft" ? -0.1 : 0.1;
        setDoc((d) =>
          d
            ? {
                ...d,
                cards: d.cards.map((c) => (c.id === selId ? { ...c, start: Math.max(0, c.start + dt), end: Math.max(0.3, c.end + dt) } : c)),
              }
            : d,
        );
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
    resetDoc(r.doc); // 换了工程,旧历史作废
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
    resetDoc(r.doc);
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
      setDoc((d) => (d ? { ...d, cards: [...d.cards, card].sort((a, b) => a.start - b.start) } : d));
    } else {
      const fresh: Doc = { fmt: "fxdeck/1", theme: "dark", cards: [card] };
      resetDoc(fresh);
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

  /* ── 导出:POST 受理后立即返回,进度走 /api/status 轮询(长任务不再挂一条易断的连接)。
        进度画在右下状态条(阶段/取消),成功结果走顶栏下常驻结果条(路径可复制);
        刷新页面会自动重连回在跑的任务 ── */
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
      const result = await pollExport();
      if (result.ok) {
        setLastExport({ label: final ? "成片" : "透明层", path: result.final ?? result.mov ?? "", frames: result.frames ?? 0 });
      } else {
        setExpResult(result);
      }
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
            if (result.ok) {
              setLastExport({ label: s.stage === "final" ? "成片" : "透明层", path: result.final ?? result.mov ?? "", frames: result.frames ?? 0 });
            } else {
              setExpResult(result);
            }
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

  const kinds = useMemo(() => CARDS.map((c) => ({ kind: c.kind, name: c.name, desc: c.desc })), []);
  /* 卡片库搜索:按名称/描述/kind 过滤(大小写不敏感) */
  const libKinds = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    if (!q) return kinds;
    return kinds.filter((k) => k.name.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q) || k.kind.toLowerCase().includes(q));
  }, [kinds, libQuery]);

  return (
    <div className="fd-app">
      {/* 顶栏:品牌/草稿/工程动作(状态全在 App,面板只收回调) */}
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
        progress={expProg ? { frame: expProg.frame, total: expProg.total } : null}
        drafts={drafts}
        draftId={draftId}
        onSwitchDraft={switchDraft}
        onNewDraft={newDraft}
        onRenameDraft={renameDraft}
        onDeleteDraft={deleteDraft}
        aiOn={aiOpen}
        onToggleAi={() => setAiOpen((v) => !v)}
      />

      {lastExport && (
        <div className="fd-export-note">
          <span className="fd-note-badge">✅ {lastExport.label}已导出</span>
          <code>{lastExport.path}</code>
          <i>{lastExport.frames} 帧</i>
          <span className="fd-flex" />
          <button title="复制完整路径" onClick={() => navigator.clipboard?.writeText(lastExport.path).catch(() => {})}>
            复制路径
          </button>
          <button title="关闭" onClick={() => setLastExport(null)}>
            ✕
          </button>
        </div>
      )}

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
                {libKinds.map((k, i) => (
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
      {/* AI 助手聊天窗:终端编程代理挂进编辑台,聊天改卡片源码 */}
      {aiOpen && <AiChat onClose={() => setAiOpen(false)} />}
      {/* 导出状态条:渲染/合成进度可取消,失败/取消在此展示;成功走顶栏下结果条 */}
      {(expProg || (expResult && !expResult.ok)) && (
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
              <b className={expResult?.error === "已手动取消" ? "" : "is-err"}>{expResult?.error === "已手动取消" ? "⏹ 已取消导出" : "❌ 导出失败"}</b>
              <span className="fd-exp-detail">{String(expResult?.error ?? "").slice(-200)}</span>
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
