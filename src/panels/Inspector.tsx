/* 右检查器:选中卡片的分区参数编辑(内容/时间/位置与强调)。状态全在 App,这里只收回调 */
import { byKind } from "../registry";
import type { Ctrl } from "../core/types";
import type { DocCard } from "../doc";

export function Inspector({
  sel,
  kinds,
  onPatchSel,
  onPatchParam,
  onRemoveCard,
}: {
  sel: DocCard | null;
  kinds: { kind: string; name: string; desc: string }[];
  onPatchSel: (patch: Partial<DocCard>) => void;
  onPatchParam: (k: string, v: any) => void;
  onRemoveCard: (id: string) => void;
}) {
  if (!sel)
    return (
      <aside className="fd-inspector">
        <div className="fd-empty">
          选中卡片编辑参数
          <br />
          画布点卡,或左侧列表选
        </div>
      </aside>
    );
  const contentCtrls: Ctrl[] = (byKind(sel.kind)?.ctrls ?? []).filter((c) => !["pos", "acc", "offX", "offY"].includes(c.k));
  return (
    <aside className="fd-inspector">
      <div className="fd-insp-head">
        <b>{byKind(sel.kind)?.name}</b>
        <select value={sel.kind} title="换卡(文字重填)" onChange={(e) => onPatchSel({ kind: e.target.value, params: { ...byKind(e.target.value)!.defaults } })}>
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
            {ct.type === "text" && <input value={sel.params[ct.k] ?? ""} onChange={(e) => onPatchParam(ct.k, e.target.value)} />}
            {ct.type === "textarea" && <textarea rows={ct.rows ?? 3} value={sel.params[ct.k] ?? ""} onChange={(e) => onPatchParam(ct.k, e.target.value)} />}
            {ct.type === "select" && (
              <select value={sel.params[ct.k] ?? ""} onChange={(e) => onPatchParam(ct.k, e.target.value)}>
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
                  onChange={(e) => onPatchParam(ct.k, +e.target.value)}
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
              if (v < sel.end) onPatchSel({ start: v });
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
              if (v > sel.start) onPatchSel({ end: v });
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
                <select value={sel.params[ct.k] ?? ""} onChange={(e) => onPatchParam(ct.k, e.target.value)}>
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
                    onChange={(e) => onPatchParam(ct.k, +e.target.value)}
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
      <button className="fd-del" onClick={() => onRemoveCard(sel.id)}>
        🗑 删除这张卡
      </button>
    </aside>
  );
}
