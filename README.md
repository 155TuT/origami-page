# 折间 · Fold Journal

用 Astro、TypeScript 和 Markdown 构建的静态个人博客。首页展示最新手记，「文章」位于 `/archives/`，按日期从新到旧列出全部文章。每篇正文都有独立的 `/archives/<slug>/`，可直接打开、刷新和分享。分类和标签页由文章内容生成。[可编辑的页面层级思维导图](docs/page-map.md)

## 本地运行

Node.js 22.23.4 或更新版本。

```sh
npm ci
npm run dev
```

`npm run check` 执行类型检查，`npm run build` 生成 `dist/`，`npm run preview` 通过 HTTP 预览构建结果。发布时将 `dist/` 放到静态托管，保留各目录的 `index.html`，让缺失路径返回 404。可在构建前设置 `SITE_URL`（站点源，例如 `https://your-domain.example`）来生成 canonical，以 `BASE_PATH`（例如 `/journal/`）指定部署子目录。

## 调整纸纹和背景浮层

固定桌面的再生纸由三种颜色组成。在设计变量中修改 `--bg-surface`（纸底）、`--bg-strong-fiber`（深色纤维）和 `--bg-lite-fiber`（浅色纤维）即可换色。中央内容纸面单独使用 `--surface`。[设计变量](src/styles/tokens.css)

第一次打开博客时，浏览器生成两张可平铺的纸纹，把实际位图和配方版本存进 `localStorage`，键名为 `fold-journal:desk-texture`。刷新、重新打开或直接进入文章时，页面在首帧前读取这份缓存。切换主题沿用同一张纸纹。清除该缓存或更换配方版本后，下次访问会重新生成。本地存储不可写时会尝试 `sessionStorage`。

默认每块 384 × 384 px 纸纹含 850 条深色短纤维和 1,570 条浅色纤维。修改密度、种子或噪声时，在生成器内更新默认配方和缓存版本。仓库另附两张同配方的 WebP，供禁用脚本等情况使用。在装有 Node.js 和 Pillow 的环境运行以下命令即可重新导出。[浏览器生成器](src/scripts/desk-texture.cjs)

```sh
python tools/generate-paper.py
```

竹林等带透明通道的纹样可以叠在纸纹上方。在项目根目录的 `.env.local` 填写图片地址，重启开发服务或重新构建。本地图片放在 `public/`，路径会自动补齐部署子目录。线上图片可填写完整的 HTTPS 地址。假设纹样保存为 `public/art/bamboo.webp`，配置如下。

```dotenv
PUBLIC_DESK_IMAGE_URL=art/bamboo.webp
```

留空时显示再生纸。浮层默认以 35% 不透明度铺满桌面，可用 `--bg-overlay-opacity`、`--bg-overlay-size`、`--bg-overlay-repeat` 控制浓淡、尺寸和平铺。完整的图层和缓存约定见 [项目 VI](docs/vi-design.md#再生纸纹与透明纹样)。

## 写一篇文章

在 `src/content/posts/` 添加一个以英文短横线命名的 Markdown 文件。文件名决定永久链接，日期决定首页顺序和相邻文章。例如 `a-sheet-of-paper.md` 会发布到 `/archives/a-sheet-of-paper/`。分类页位于 `/archives/categories/<分类>/`，标签页位于 `/tags/<标签>/`。旧书签 `/posts/<slug>/` 和 `/categories/<分类>/` 会转到对应的新地址。

```markdown
---
title: 一张纸的尺寸
description: 在不同尺寸的纸上比较同一道折痕。
date: 2026-11-18
category: 折纸手记
tags: [纸艺, 观察]
ruling: ruled
---

## 对齐纸边

这里写正文。
```

`ruling` 可选 `ruled`（横线纸）或 `grid`（方格纸），默认横线纸。可选的 `art` 为 `crane` 或 `river`。二、三级标题生成目录。加入新分类或标签时，对应的文章列表也会生成。

## 阅读与换页

- 页眉的「阅读设置」提供深色模式、减少动态效果和并行取文与收纸。三项选择保存在浏览器中。首次访问时，配色跟随系统，折纸为完整速度，并行默认关闭。
- 首页、文章、标签、关于各有一个折纸入口，放在顶栏文字左侧。当前内容收回所属入口，ClientRouter 交换文档，下一页从自己的入口展开。文章和分类属于「文章」，标签详情属于标签。返回和前进时同样按页面归属取图标。
- 默认先取文，再收纸。并行模式同时取文与收纸，两项完成后交换正文。原始时间轨单程 1160 毫秒，完整收展约 2.32 秒。
- 中央纸面占视口宽度的 60%，整张纸面均可滚动。原生滚动条与纸面等高，从不透明顶栏下沿延伸到视口底边。四边等宽的留白属于内容容器，上下留白随正文滚动。短页版权靠底，长文滚到末尾可见。窄屏保留纸面比例并改用单栏。
- 折纸模型在第一次需要动效时下载。各页面共用一个动效层，长文只取当前可视纸面，最多缓存两张大纸纹。首轮使用 Canvas 2D，空闲时可以准备 WebGL2，并在相同尺寸、纸纹和收展方向下比较绘制表现。开启减少动态效果或画布不可用时，直接显示目标页。
- Astro ClientRouter 管理导航和页面元数据。博客按浏览器历史条目保存纸面的阅读位置，支持前进、后退和刷新。目录锚点、在新标签页打开和禁用 JavaScript 阅读使用普通链接。

四个入口暂用同一只赤陶色纸鹤。`src/lib/sections.ts` 配置各栏目图标，导航停靠图和飞行末段读取同一张图。折面的三维姿态来自 `src/lib/fold/crane-data.js`。修改 `--crane-paper` 或 `--crane-shadow` 后，使用下文导航回归所用的 Playwright 和本机 Chrome 运行 `node tools/render-crane.cjs`，同步生成导航图标与文章插图。

需要复查换页时，可在生产预览运行期间执行 `node tools/check-navigation.cjs`。此开发工具使用可选的 `playwright` 包和本机 Chrome，设置 `ORIGAMI_BROWSER=edge` 可改用本机 Edge，`ORIGAMI_URL` 可指向其他预览地址。它会人为延迟目标文章，检查取文与收展的顺序，再验证前进后退、滚动恢复、桌面与窄屏的四边留白和版权位置。

## 设计规范与组件库

[项目 VI](docs/vi-design.md) 收录浅色与深色样张、配色、字体与字重、纸面尺寸、折叠规则和组件用法。页面从 [Astro 组件库](src/components/ui/index.ts) 导入界面，样式共用 [设计变量](src/styles/tokens.css)。版权区的闽 ICP 和公安备案号目前为占位，正式信息在 [PaperFooter](src/components/ui/PaperFooter.astro) 中维护。界面改动遵循根目录的 [AGENTS.md](AGENTS.md)。

## 实现位置

| 路径 | 用途 |
| --- | --- |
| `src/content.config.ts`、`src/content/posts/` | 文章约束和示例 Markdown |
| `src/pages/`、`src/layouts/Site.astro` | 首页、文章、分类、标签、关于及 404 |
| `docs/page-map.md`、`src/lib/sections.ts` | 可编辑的页面层级、一级栏目与图标配置 |
| `src/components/ui/`、`src/styles/tokens.css` | 博客组件库与 VI 设计变量 |
| `src/scripts/desk-texture.cjs` | 再生纸配方、首屏生成和浏览器存储 |
| `src/assets/paper/`、`tools/generate-paper.py` | 同配方导出的静态后备遮罩及导出工具 |
| `src/scripts/navigation.ts` | 路由生命周期、导航取消、偏好和键盘焦点 |
| `src/lib/fold/` | 原纸鹤模型、独立收展时间轨、2D 与按需 WebGL2 绘制 |
| `public/art/` | 从同一模型和河岸绘图生成的静态插图，支持无脚本阅读 |
| `models/crane/`、`tools/` | 折痕、原始姿态、模型烘焙和打包工具 |

最初的两篇互切实验保存在 [prototype](prototype/index.html)，可在项目根目录用静态 HTTP 服务器访问 `/prototype/`。博客构建只发布 Astro 页面。原实验的[渲染实测](docs/渲染回退与博客集成.md)、[模型说明](docs/实现与多图标扩展.md)和[慢放录像](fold-preview.mp4)保留供对照。纸鹤折痕来源见[第三方署名](THIRD-PARTY-NOTICES.txt)。
