/* AI 助手聊天窗:挑一个终端编程代理(ZCode / Codex / Claude Code),聊天改卡片。
   后端 /api/ai/chat 起对应 CLI 的无头模式,NDJSON 事件流式推回:
   stdout 进气泡正文,stderr 当灰色诊断日志;结束事件带退出码 */
import { useEffect, useRef, useState } from "react";

type Engine = { id: string; name: string; ok: boolean; version: string; note: string };
type Msg = { role: "user" | "assistant"; text: string; logs: string; running: boolean };

export function AiChat({ onClose }: { onClose: () => void }) {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [engineId, setEngineId] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/ai/engines")
      .then((r) => r.json())
      .then((d) => {
        setEngines(d.engines ?? []);
        const first = (d.engines ?? []).find((e: Engine) => e.ok);
        if (first) setEngineId(first.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [msgs]);

  const patchLast = (fn: (m: Msg) => Msg) => setMsgs((m) => (m.length ? [...m.slice(0, -1), fn(m[m.length - 1])] : m));

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || running || !engineId) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: prompt, logs: "", running: false }, { role: "assistant", text: "", logs: "", running: true }]);
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine: engineId, prompt }),
        signal: ac.signal,
      });
      // 200 = NDJSON 事件流,直接读;非 200 = 普通 JSON 错误(429 在跑/400 参数)
      if (r.status !== 200) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.error ?? `HTTP ${r.status}`);
      }
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: any;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.t === "out") patchLast((m) => ({ ...m, text: m.text + ev.line }));
          else if (ev.t === "err") patchLast((m) => ({ ...m, logs: m.logs + ev.line }));
          else if (ev.t === "exit")
            patchLast((m) => ({
              ...m,
              running: false,
              text: m.text + (ev.code !== 0 ? `\n\n[进程异常退出,码 ${ev.code}]` : ""),
            }));
        }
      }
    } catch (e) {
      patchLast((m) => ({ ...m, logs: m.logs + `\n[请求失败] ${e}` }));
    } finally {
      setRunning(false);
      abortRef.current = null;
      setMsgs((m) => m.map((x) => (x.running ? { ...x, running: false } : x)));
    }
  };

  const stop = () => {
    fetch("/api/ai/stop", { method: "POST" }).catch(() => {});
    abortRef.current?.abort();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fd-ai">
      <div className="fd-ai-head">
        <b>🤖 AI 助手</b>
        <select value={engineId} onChange={(e) => setEngineId(e.target.value)} title="选编程代理">
          {engines.map((e) => (
            <option key={e.id} value={e.id} disabled={!e.ok}>
              {e.name}
              {e.ok ? ` · ${e.version}` : " · 不可用"}
            </option>
          ))}
          {!engines.length && <option>探测中…</option>}
        </select>
        <span className="fd-flex" />
        <button onClick={onClose} title="关闭">
          ✕
        </button>
      </div>
      {engines.some((e) => !e.ok) && (
        <div className="fd-ai-missing">
          未检测到:
          {engines
            .filter((e) => !e.ok)
            .map((e) => `${e.name}(${e.note})`)
            .join("、")}
        </div>
      )}
      <div className="fd-ai-msgs" ref={scrollRef}>
        {!msgs.length && (
          <div className="fd-ai-empty">
            跟编程代理聊,直接改卡片源码。比如:
            <br />
            「给印章卡加个旋转入场参数」
            <br />
            「把 dotMatrix 的点亮动画放慢一倍」
            <br />
            「新增一张『进度条对比』卡」
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="fd-ai-user">
              {m.text}
            </div>
          ) : (
            <div key={i} className={"fd-ai-bot" + (m.running ? " is-running" : "")}>
              {m.text ? <pre>{m.text}</pre> : m.running ? <span className="fd-ai-dot">思考中…</span> : null}
              {m.logs ? <pre className="fd-ai-log">{m.logs}</pre> : null}
            </div>
          ),
        )}
      </div>
      <div className="fd-ai-input">
        <textarea
          rows={2}
          value={input}
          placeholder="描述要改的动效…(Enter 发送,Shift+Enter 换行)"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        {running ? (
          <button className="fd-ai-stop" onClick={stop}>
            ⏹ 停止
          </button>
        ) : (
          <button className="fd-ai-send" onClick={send} disabled={!input.trim() || !engineId}>
            发送
          </button>
        )}
      </div>
    </div>
  );
}
