# 折间 · Fold Journal

用 Astro、TypeScript 和 Markdown 构建的静态个人博客。首页展示最新手记，归档按年份列出文章，栏目和标签索引由文章自动生成。每篇文章都有独立的 `/posts/<slug>/`，其 HTML 包含完整正文，可直接打开、刷新和分享。

## 本地运行

Node.js 22.23.4 或更新版本。

```sh
npm ci
npm run dev
```

`npm run check` 执行类型检查，`npm run build` 生成 `dist/`，`npm run preview` 通过 HTTP 预览构建结果。发布时将 `dist/` 放到静态托管，保留各目录的 `index.html`，让缺失路径返回 404。可在构建前设置 `SITE_URL`（站点源，例如 `https://your-domain.example`）来生成 canonical，以 `BASE_PATH`（例如 `/journal/`）指定部署子目录。

## 调整纸纹和背景浮层

固定桌面的再生纸由三种颜色组成。在设计变量中修改 `--bg-surface`（纸底）、`--bg-strong-fiber`（深色纤维）和 `--bg-lite-fiber`（浅色纤维）即可换色。中央内容纸面单独使用 `--surface`。[设计变量](src/styles/tokens.css)

仓库自带两张可平铺的 WebP 遮罩，合计约 55 KiB。构建生成带内容指纹的文件名，浏览器按站点的 HTTP 缓存策略复用，首次访问即可显示纸纹。调整图样时，先准备 NumPy 和 Pillow，再运行以下命令。默认每块 384 × 384 px 纸纹含 850 条深色短纤维，改变 `--seed` 可得到另一种分布。

```sh
python tools/generate-paper.py --seed 73421 --strong-count 850
```

竹林等带透明通道的纹样可以叠在纸纹上方。在项目根目录的 `.env.local` 填写图片地址，重启开发服务或重新构建。本地图片放在 `public/`，路径会自动补齐部署子目录。线上图片可填写完整的 HTTPS 地址。假设纹样保存为 `public/art/bamboo.webp`，配置如下。

```dotenv
PUBLIC_DESK_IMAGE_URL=art/bamboo.webp
```

留空时显示再生纸。浮层默认以 35% 不透明度铺满桌面，可用 `--bg-overlay-opacity`、`--bg-overlay-size`、`--bg-overlay-repeat` 控制浓淡、尺寸和平铺。完整的图层和缓存约定见 [项目 VI](docs/vi-design.md#再生纸纹与透明纹样)。

## 写一篇文章

在 `src/content/posts/` 添加一个以英文短横线命名的 Markdown 文件。文件名决定永久链接，日期决定首页顺序和相邻文章。例如 `a-sheet-of-paper.md` 会发布到 `/posts/a-sheet-of-paper/`。

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

`ruling` 可选 `ruled`（横线纸）或 `grid`（方格纸），默认横线纸。可选的 `art` 为 `crane` 或 `river`。二、三级标题生成目录。加入新栏目或标签时，对应索引页也会生成。

## 阅读与换页

- 页眉的「阅读设置」提供深色模式、减少动态效果和并行取文与收纸。三项选择保存在浏览器中。首次访问时，配色跟随系统，折纸为完整速度，并行默认关闭。
- 首页、归档、标签、关于各有一个折纸入口，放在顶栏文字左侧。当前内容收回所属入口，ClientRouter 交换文档，下一页从自己的入口展开。文章和分类属于归档，标签详情属于标签。返回和前进时同样按页面归属取图标。
- 默认先取文，再收纸。并行模式同时取文与收纸，两项完成后交换正文。原始时间轨单程 1160 毫秒，完整收展约 2.32 秒。
- 中央纸面占视口宽度的 60%，从不透明顶栏下沿铺到视口底边。正文在四边等宽的版心内滚动，桌面和纸边保持原位。短页的版权区靠底，长文滚到末尾可见。窄屏保留纸面比例并改用单栏。
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
| `src/pages/`、`src/layouts/Site.astro` | 首页、归档、标签、栏目、文章、关于及 404 |
| `src/components/ui/`、`src/styles/tokens.css` | 博客组件库与 VI 设计变量 |
| `src/assets/paper/`、`tools/generate-paper.py` | 可换色的再生纸遮罩及其生成器 |
| `src/scripts/navigation.ts` | 路由生命周期、导航取消、偏好和键盘焦点 |
| `src/lib/fold/` | 原纸鹤模型、独立收展时间轨、2D 与按需 WebGL2 绘制 |
| `public/art/` | 从同一模型和河岸绘图生成的静态插图，支持无脚本阅读 |
| `models/crane/`、`tools/` | 折痕、原始姿态、模型烘焙和打包工具 |

最初的两篇互切实验保存在 [prototype](prototype/index.html)，可在项目根目录用静态 HTTP 服务器访问 `/prototype/`。博客构建只发布 Astro 页面。原实验的[渲染实测](docs/渲染回退与博客集成.md)、[模型说明](docs/实现与多图标扩展.md)和[慢放录像](fold-preview.mp4)保留供对照。纸鹤折痕来源见[第三方署名](THIRD-PARTY-NOTICES.txt)。
