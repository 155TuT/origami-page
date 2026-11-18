# 折间 · Fold Journal

用 Astro、TypeScript 和 Markdown 构建的静态个人博客。首页展示最新手记，归档按年份列出文章，栏目和标签索引由文章自动生成。每篇文章都有独立的 `/posts/<slug>/`，其 HTML 包含完整正文，可直接打开、刷新和分享。

## 本地运行

Node.js 22.23.4 或更新版本。

```sh
npm ci
npm run dev
```

`npm run check` 执行类型检查，`npm run build` 生成 `dist/`，`npm run preview` 通过 HTTP 预览构建结果。发布时将 `dist/` 放到静态托管，保留各目录的 `index.html`，让缺失路径返回 404。可在构建前设置 `SITE_URL`（站点源，例如 `https://your-domain.example`）来生成 canonical，以 `BASE_PATH`（例如 `/journal/`）指定部署子目录。

## 更换桌面背景图

在项目根目录的 `.env.local` 中设置图片地址，然后重启开发服务或重新构建。线上图片可填写完整的 HTTPS 链接。本地图片放进 `public/`，填写相对于该目录的路径，部署子目录会自动补齐。例如，`public/art/desk.webp` 对应以下配置。

```dotenv
PUBLIC_DESK_IMAGE_URL=art/desk.webp
```

留空时只显示原有点阵。图片以 35% 不透明度铺满固定背景，纸面和顶栏使用各自的不透明底色。

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
- 中央纸面占视口宽度的 60%，从顶栏下沿铺到视口底边。短页和长文共用这个折纸外框。只有纸面内部可纵向滚动，正文结束处没有页脚或额外滚动留白。窄屏保留纸面比例并改用单栏。
- 折纸模型在第一次需要动效时下载。各页面共用一个动效层，长文只取当前可视纸面，最多缓存两张大纸纹。首轮使用 Canvas 2D，空闲时可以准备 WebGL2，并在相同尺寸、纸纹和收展方向下比较绘制表现。开启减少动态效果或画布不可用时，直接显示目标页。
- Astro ClientRouter 管理导航和页面元数据。博客按浏览器历史条目保存纸面的阅读位置，支持前进、后退和刷新。目录锚点、在新标签页打开和禁用 JavaScript 阅读使用普通链接。

四个入口暂用原纸鹤占位。`src/lib/sections.ts` 分别配置每项的图标文件，导航停靠图和飞行末段读取同一张图。折面的三维姿态仍来自 `src/lib/fold/crane-data.js`。

需要复查换页时，可在生产预览运行期间执行 `node tools/check-navigation.cjs`。此开发工具使用可选的 `playwright` 包和本机 Chrome，可通过 `ORIGAMI_URL` 指向其他预览地址。它会人为延迟目标文章，检查取文与收展的先后关系、脚本重复加载、前进后退和滚动恢复。

## 实现位置

| 路径 | 用途 |
| --- | --- |
| `src/content.config.ts`、`src/content/posts/` | 文章约束和示例 Markdown |
| `src/pages/`、`src/layouts/Site.astro` | 首页、归档、标签、栏目、文章、关于及 404 |
| `src/scripts/navigation.ts` | 路由生命周期、导航取消、偏好和键盘焦点 |
| `src/lib/fold/` | 原纸鹤模型、独立收展时间轨、2D 与按需 WebGL2 绘制 |
| `public/art/` | 从同一模型和河岸绘图生成的静态插图，支持无脚本阅读 |
| `models/crane/`、`tools/` | 折痕、原始姿态、模型烘焙和打包工具 |

最初的两篇互切实验保存在 [prototype](prototype/index.html)，可在项目根目录用静态 HTTP 服务器访问 `/prototype/`。博客构建只发布 Astro 页面。原实验的[渲染实测](docs/渲染回退与博客集成.md)、[模型说明](docs/实现与多图标扩展.md)和[慢放录像](fold-preview.mp4)保留供对照。纸鹤折痕来源见[第三方署名](THIRD-PARTY-NOTICES.txt)。
