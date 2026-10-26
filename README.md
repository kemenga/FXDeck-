# FXDeck · 动效卡座

给口播视频配动效卡片的编辑台:把 20 种动效卡(钩子大字、数据卡、清单、章节条…)排到时间轴上,
预览即导出 —— 无头浏览器逐帧截图 + ffmpeg 合成**透明 MOV**(拖进剪映置顶轨道)或直接出**成片 MP4**。

## 快速开始

```bash
npm install        # Node >= 22
npm run dev        # http://localhost:5188
```

### 一次性环境依赖

| 依赖               | 说明                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ffmpeg**         | 需在 PATH 里(合成 MOV/MP4 用)。`ffmpeg -version` 能出版本号即可                                                                                                                                                                    |
| **无头浏览器内核** | puppeteer 用。规范位置 `~/.cache/puppeteer/`,缺失时装一次:<br>`npx puppeteer browsers install chrome`<br>`npx puppeteer browsers install chrome-headless-shell`(导出实际用的是它)<br>内核放在别处时设 `PUPPETEER_CACHE_DIR` 指过去 |

## 使用流程

1. 拿到口播稿的 SRT → 用 `skill/SKILL.md` 里的编排技能(AI 按字幕时间生成)产出 `<视频名>-fxdeck.json`
2. 卡片库支持**拖拽放置**:拖到时间轴任意时刻落卡(悬停有落点指示线),拖到画面按落点区域自动定 pos(左/右/上/下/中);也可点击卡片先预览动效再加到播放头,点卡片改参数、拖色块调时间
3. **⬆ 导出透明层**:出 `overlay.mov`(ProRes 4444 带 alpha),拖进剪映置顶轨道
   **🎬 导出成片**:需先导入「垫底视频」,直接出 `final.mp4`(口播 + 动效 + 原声)

编辑内容自动存 localStorage(600ms 防抖),刷新/误关自动恢复;垫底视频落盘在服务器,刷新不丢。

## 命令

| 命令                | 作用                                                  |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | 起编辑台(端口 5188,含上传/导出中间件)                 |
| `npm run build`     | 打包前端(本项目以 dev server 工作流为主,build 用得少) |
| `npm run typecheck` | tsc 类型检查                                          |
| `npm run lint`      | ESLint 检查                                           |
| `npm run format`    | Prettier 格式化全库                                   |

## 目录结构

```
src/
  App.tsx          # 编辑台主界面(剪映式布局,状态都在这)
  CardPreview.tsx  # 卡片动效预览弹窗
  Stage.tsx        # 1920×1080 舞台,编辑台与导出共用(预览即导出的保证)
  ExportView.tsx   # ?export=1 时挂载的逐帧渲染视图
  doc.ts           # 编排 JSON 的解析/序列化/默认值
  registry.ts      # 卡片注册表(加新卡在这里登记)
  core/            # 类型系统(types.ts)+ 缓动纯函数(anim.ts)
  cards/           # 一卡一文件,文件名 = kind 名;shared.ts 放共享工具
server/
  media.ts         # dev 中间件:垫底视频上传落盘 → public/_media/
  export.ts        # dev 中间件:导出任务调度(起 scripts/export.mjs,报进度)
scripts/
  export.mjs       # 无头渲染:puppeteer 逐帧截图(带 alpha)→ ffmpeg 合成
skill/
  SKILL.md         # AI 编排技能:SRT → FXDeck JSON 的生成规则(可复制到技能目录)
public/
  fonts/           # DeckSans 字体(OFL 许可)
  _media/          # 垫底视频落盘处(用户数据,不入库)
exports/           # 每次导出一个时间戳目录(产物,不入库)
```

## 加一张新卡

1. `src/cards/<kind>.tsx` 新建文件,默认导出一个 `CardDef`(参考现有卡片,纯渲染、无状态,动画全由 `t` 驱动)
2. `src/registry.ts` import 它,加进 `CARDS` 数组
3. 卡片库、检查器、预览、导出全线自动生效

## 版本库约定

- `node_modules/ dist/ exports/ public/_media/ chrome/ *.log` 均不入库(见 `.gitignore`)
- 提交信息中文一句话说清「做了什么」,一次提交一件事
