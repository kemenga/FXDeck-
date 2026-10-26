---
name: fxdeck-orchestrator
description: FXDeck 动效编排——用户提供 SRT 字幕时,根据内容和时间自动生成 FXDeck 可直接导入的编排 JSON。触发词:FXDeck编排、生成fxdeck、给这期配动效。
---

# FXDeck 编排:SRT → FXDeck JSON

把口播字幕编排成动效卡时间轴,输出 JSON,用户在 FXDeck(`H:\jianying\fxdeck`,`npm run dev`,http://localhost:5188)里「导入 JSON」即可预览微调,再「导出透明 MOV」拖进剪映置顶轨道。

## 规则

1. **时间必须来自 SRT 真实时间戳**,不许编。`start`/`end` 单位秒,`end > start`。
2. **段落制**:先把稿子按语义分 3-6 段,每段一个论点;段内元素踩着台词进场,段尾一起退场。禁止逐句平铺。
3. **密度**:每分钟 6-12 张卡;相邻两张卡 kind 不同;开头 0-5 秒必须有一张钩子卡(hookText)。
4. **数字上数据卡**:一出现数字/金额/比例就用 bigNumber / barRank,不要用文字卡复述。
5. **有常驻层**:captionBar(原片没烧录字幕时)或 stepFlow(教程/流程类)从 0 拉到片尾。
6. **落位避人**:口播人物在画面中间,pos 用 left/right 交替;center 只给钩子和结尾。
7. **一段一色**:同段卡 acc 一致;全片语义制:数据=cyan,提醒/转变=amber,否定/风险=rose。不确定就全片 cyan。
8. **卡内节奏用 SRT 推算**:逐条间隔 stepMs ≈ (段落总时长×1000)÷条数,再减 10%。
9. **文字提炼**:禁止把 SRT 原句整句搬上卡,提炼成 ≤10 字的词块。

## 卡片库(只能用这些 kind)

| kind          | 用途                           | 关键参数                                                   |
| ------------- | ------------------------------ | ---------------------------------------------------------- |
| hookText      | 开场钩子/金句定格              | text(\|分行,_强调_), staggerMs                             |
| quoteCard     | 金句卡+署名(可当来源行)        | quote(\|分行), author                                      |
| captionBar    | 底部字幕条(常驻)               | lines(每行 `起-止 文本`)                                   |
| pinList       | 要点钉板,逐条钉住              | title, items(/分隔), stepMs                                |
| tickList      | 打勾清单                       | title, items(/分隔), stepMs                                |
| stepFlow      | 横向步骤链(常驻)               | steps(/分隔), stepMs                                       |
| bigNumber     | 巨号滚动数字                   | kicker, value, unit, note                                  |
| barRank       | 横条排名                       | title, rows(`名,值`\|分隔), suffix                         |
| versusCard    | VS 对比卡,胜者高亮             | aTitle,aSub,bTitle,bSub,winner(a/b/none)                   |
| termCard      | 术语卡:英文+术语+定义          | en, term, def                                              |
| punchPill     | 金句药丸,单句弹出              | text                                                       |
| progressRing  | 进度环:百分比生长              | kicker, value(0-100), unit, label                          |
| terminalCard  | 终端打字卡                     | title, lines(每行,`$`命令/`✓`成功/`✗`失败/`#`注释), stepMs |
| statStrip     | 多指标条:2-3个数字并排         | items(每条 `标签,数值,单位`,\|分隔)                        |
| arrowFlow     | 箭头链:管线/流转图             | items(/分隔), stepMs                                       |
| markerText    | 荧光笔:色块扫过划重点          | text, kicker                                               |
| chatBubbles   | 对话气泡:我 vs AI(`>` 开头=AI) | lines(每行一条), stepMs                                    |
| growthCurve   | 增长曲线:折线自绘+峰值计数     | kicker, points(`标签,数值`\|分隔), unit                    |
| stampBadge    | 印章:盖判定(亲测可用)          | text, sub, shape(round/rect)                               |
| chapterBar    | 章节条:全片常驻导航            | chapters(每章 `名称 起始秒` / 分隔)                        |
| countdownRing | 倒计时环:悬念倒数,环收缩       | seconds(秒), label;卡时长=倒计时长                         |
| chapterNum    | 章节序号:大号序号转场锚点      | num, kicker, title                                         |
| triCompare    | 三联对比:三列横评,高亮列描边   | cols(`名称,小注`\|分隔×3), highlight(0/1/2/-1)             |
| skillList     | 等宽清单:技术感 checklist      | kicker, count, lines(每行一条)                             |
| danmaku       | 评论弹幕:白底气泡模拟观众评论  | lines(每行一条,`>` 开头=右侧), stepMs                      |
| dotMatrix     | 点阵矩阵:噪点按占比点亮(隐喻)  | kicker, ratio(0-100), note, cols, rows                     |
| sketchCircle  | 手绘圈注:马克笔椭圆描画圈重点  | text, kicker                                               |
| ctaBubble     | CTA 气泡:实底白勾行动号召      | text, sub                                                  |
| tileGrid      | 图表瓷片:微图表矩阵逐格弹出    | kicker, rows(1-3), cols(2-5)                               |

所有卡通用参数:pos(left/right/top/bottom/center)、acc(cyan/amber/rose)、offX/offY(微调 px)。

## 输出格式(只输出 JSON,存为 <视频名>-fxdeck.json)

```json
{
  "fmt": "fxdeck/1",
  "theme": "dark",
  "cards": [
    {
      "id": "c1",
      "kind": "hookText",
      "start": 0.4,
      "end": 4.2,
      "params": { "text": "一条视频|*三个*钩子", "staggerMs": 70, "pos": "center", "acc": "cyan", "offX": 0, "offY": 0 }
    }
  ]
}
```

params 只写需要覆盖的字段,缺省自动用默认值。id 用 c1、c2… 递增。

## 交付

生成后附一张段落表(起止秒/段意/用了哪些卡),存 JSON,提醒:「FXDeck 点 📥 导入 JSON 预览;点卡片改参数;⬇ 导出透明 MOV 拖进剪映顶层」。
