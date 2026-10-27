/* doc.ts 单元测试:编排 JSON 的解析/序列化/新建卡 */
import { describe, it, expect } from "vitest";
import { parseDoc, serializeDoc, newCard } from "./doc";

describe("parseDoc", () => {
  it("合法编排:默认值合并、按 start 排序", () => {
    const r = parseDoc(
      JSON.stringify({
        fmt: "fxdeck/1",
        theme: "dark",
        cards: [
          { id: "c2", kind: "hookText", start: 5, end: 9, params: { text: "后半" } },
          { id: "c1", kind: "hookText", start: 1, end: 4, params: { text: "前半" } },
        ],
      }),
    );
    expect(r.doc).not.toBeNull();
    expect(r.doc!.cards.map((c) => c.id)).toEqual(["c1", "c2"]); // 排序生效
    expect(r.doc!.cards[0].params.text).toBe("前半");
    expect(r.doc!.cards[0].params.staggerMs).toBe(70); // 未覆盖的字段补默认值
    expect(r.doc!.cards[0].params.pos).toBe("center");
    expect(r.dropped).toEqual([]);
  });

  it("未知 kind 与非法时间被丢弃,并报告 dropped", () => {
    const r = parseDoc(
      JSON.stringify({
        fmt: "fxdeck/1",
        cards: [
          { id: "c1", kind: "hookText", start: 0, end: 2 },
          { id: "c2", kind: "不存在", start: 0, end: 2 },
          { id: "c3", kind: "bigNumber", start: 5, end: 3 }, // end <= start
          { id: "c4", kind: "bigNumber", start: "x", end: 9 },
        ],
      }),
    );
    expect(r.doc!.cards.map((c) => c.id)).toEqual(["c1"]);
    expect(r.dropped).toEqual([
      { kind: "不存在", n: 1 },
      { kind: "bigNumber", n: 2 },
    ]);
  });

  it("缺 id 自动编号", () => {
    const r = parseDoc(JSON.stringify({ cards: [{ kind: "hookText", start: 0, end: 1 }] }));
    expect(r.doc!.cards[0].id).toBe("card-1");
  });

  it("非法 JSON 报错", () => {
    const r = parseDoc("{oops");
    expect(r.doc).toBeNull();
    expect(r.error).toContain("不是合法 JSON");
  });

  it("缺 cards 数组报错", () => {
    const r = parseDoc(JSON.stringify({ fmt: "fxdeck/1" }));
    expect(r.doc).toBeNull();
    expect(r.error).toContain("cards");
  });
});

describe("serializeDoc", () => {
  it("与 parseDoc 往返一致", () => {
    const doc = parseDoc(
      JSON.stringify({ cards: [{ id: "c1", kind: "quoteCard", start: 2, end: 6, params: { quote: "a|b" } }] }),
    ).doc!;
    const round = parseDoc(serializeDoc(doc)).doc!;
    expect(round).toEqual(doc);
  });
});

describe("newCard", () => {
  it("id 从现有编号之后取,避开占用", () => {
    expect(newCard("hookText", 0, []).id).toBe("c1");
    expect(newCard("hookText", 0, ["c1", "c2"]).id).toBe("c3");
  });

  it("常驻卡默认 12s,其余 5s", () => {
    expect(newCard("captionBar", 3, []).end).toBe(15);
    expect(newCard("stepFlow", 3, []).end).toBe(15);
    expect(newCard("hookText", 3, []).end).toBe(8);
  });

  it("参数来自卡片默认值", () => {
    const c = newCard("markerText", 0, []);
    expect(c.params.text).toBe("这一句就是重点");
    expect(c.params.acc).toBe("amber"); // markerText 默认琥珀(划重点语义)
  });
});
