/* 钩子大字:逐字从虚焦浮出,强调段换色 */
import { COMMON_CTRLS, type CardDef } from "../core/types";
import { easeOut3 } from "../core/anim";

const def: CardDef<any> = {
  kind: "hookText",
  name: "钩子大字",
  desc: "开场钩子/金句定格。| 分行,*星号* 段强调变色,逐字浮现",
  defaults: { text: "你是不是|也遇到过*这种事*", staggerMs: 70, pos: "center", acc: "cyan", offX: 0, offY: 0 },
  ctrls: [
    { k: "text", label: "文字(| 分行,*强调*)", type: "textarea", rows: 2 },
    { k: "staggerMs", label: "逐字间隔", type: "range", min: 20, max: 300, step: 10, unit: "ms" },
    ...COMMON_CTRLS,
  ],
  render: ({ p, t }) => {
    const step = Math.max(0.02, (Number(p.staggerMs) || 70) / 1000);
    return (
      <div style={{ textAlign: "center", maxWidth: 1500, fontFamily: "var(--deck-font)" }}>
        {String(p.text || "")
          .split("|")
          .map((line, li) => (
            <div key={li} style={{ display: "block" }}>
              {(() => {
                let idx = 0;
                return String(line)
                  .split("*")
                  .map((part, si) => {
                    const hot = si % 2 === 1;
                    const start = idx;
                    idx += Array.from(part).length;
                    return Array.from(part).map((c, ci) => {
                      const i = start + ci;
                      const pr = easeOut3((t - (0.15 + i * step)) / 0.5);
                      const blur = (1 - pr) * 9;
                      return (
                        <span
                          key={`${si}-${ci}`}
                          style={{
                            display: "inline-block",
                            whiteSpace: "pre",
                            fontSize: 86,
                            fontWeight: 900,
                            lineHeight: 1.32,
                            color: hot ? "var(--acc)" : "#f4f7fa",
                            opacity: pr,
                            transform: `translateY(${((1 - pr) * 26).toFixed(1)}px)`,
                            filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined,
                            textShadow: "0 8px 40px rgba(0,0,0,.4)",
                          }}
                        >
                          {c}
                        </span>
                      );
                    });
                  });
              })()}
            </div>
          ))}
      </div>
    );
  },
};

export default def;
