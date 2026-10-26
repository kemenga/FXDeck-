# FXDeck 新机环境搭建

换一台电脑开发本项目的完整步骤。目标:clone 下来 10 分钟内能跑能导出。

## 一、必装软件(三样)

| 软件        | 版本要求                    | Windows 安装                                                                    | 验证命令          |
| ----------- | --------------------------- | ------------------------------------------------------------------------------- | ----------------- |
| **Node.js** | ≥ 22(项目 engines 硬性要求) | `winget install OpenJS.NodeJS.LTS` 或 [nodejs.org](https://nodejs.org) 下载 LTS | `node -v`         |
| **Git**     | 任意近期版本                | `winget install Git.Git`                                                        | `git --version`   |
| **ffmpeg**  | 任意近期版本(导出合成用)    | `winget install Gyan.FFmpeg`,装完**重开终端**                                   | `ffmpeg -version` |

> macOS:用 `brew install node git ffmpeg`;Linux:发行版包管理器对应安装。
> ffmpeg 装完如果验证命令找不到,检查它是否在 PATH 里(重开终端再试)。

## 二、获取代码并安装依赖

```bash
git clone https://github.com/kemenga/FXDeck-.git fxdeck
cd fxdeck
npm install
```

## 三、无头浏览器内核(导出功能必需)

预览不需要,但**导出透明层/成片**需要 puppeteer 的 chrome-headless-shell 内核,装一次:

```bash
npx puppeteer browsers install chrome-headless-shell
```

会装到用户缓存目录(`~/.cache/puppeteer/`,Windows 即 `C:\Users\<你>\.cache\puppeteer\`),约 150MB,所有项目共享、无需环境变量。

## 四、一键体检

不确定缺什么时,跑体检脚本,逐项检查并用人话告诉你缺啥装啥:

```bash
npm run check
```

全部 ✓ 之后 `npm run dev`,浏览器开 http://localhost:5188 即可。验证导出:点「🎬 示例」载入编排 → 「⬆ 导出透明层」,能出 `overlay.mov` 就是全通。

## 五、从旧电脑迁移工作数据(重要)

以下内容**不在 git 仓库里**,换机器要手动带:

| 数据      | 位置                            | 迁移方式                                                          |
| --------- | ------------------------------- | ----------------------------------------------------------------- |
| 编排 JSON | 各视频的 `<视频名>-fxdeck.json` | 旧机器编辑台「📤 存 JSON」导出的文件拷过去,新机器「📥 导入 JSON」 |
| 垫底视频  | 旧机器 `public/_media/*.mp4`    | 直接拷到新机器同目录(或在新机器重新导入一次,会自动落盘)           |
| 导出产物  | 旧机器 `exports/`               | 需要留存的成片(MOV/MP4)手动拷,中间 PNG 帧不用带                   |
| 自动存档  | 旧机器浏览器 localStorage       | **不跨机器**——编辑台内容以编排 JSON 为准,导入即可恢复             |

## 六、常见问题

- **`npm run dev` 报端口被占**:本项目固定用 5188(`strictPort`),查一下谁占了: `netstat -ano | findstr :5188`,或者临时改 `vite.config.ts` 里的端口
- **导出报「找不到无头浏览器内核」**:回到第三步装内核;内核装在非默认位置时设环境变量 `PUPPETEER_CACHE_DIR` 指过去
- **导出报 ffmpeg 相关错误**:ffmpeg 不在 PATH 或版本太老,回到第一张表
- **Windows 上导出渲染被拦截**:本项目的导出脚本已按 Windows 实测选型(chrome-headless-shell + GPU 合成路径),若报 crashpad 相关错误,把报错发出来排查,不要自行改 `headless: "shell"` 配置
- **Windows 换行符警告**:仓库已用 `.gitattributes` 统一 LF,检出时的 CRLF 警告可以无视
