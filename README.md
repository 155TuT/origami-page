# 折间 · Fold Journal

用 Astro、TypeScript 和 Markdown 构建的静态个人站。顶栏有首页、作品集、文章、影集和关于我。作品、文章和整本影集共用标签、搜索和 RSS，各自有可分享的正式地址。页脚的「关于本站」指向作品集中的「折间」项目。[可编辑的页面层级图](docs/page-map.md)

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

在 `src/content/posts/` 添加 Markdown 文件，文件名决定永久链接，日期决定列表和相邻文章顺序。例如 `a-sheet-of-paper.md` 发布到 `/archives/a-sheet-of-paper/`。已发布文章的 `/posts/<slug>/` 旧书签指向正式地址。`draft` 为草稿分区保留。

```markdown
---
title: 一张纸的尺寸
description: 在不同尺寸的纸上比较同一道折痕。
date: 2026-11-18
tags: [纸艺, 观察]
ruling: ruled
---

## 对齐纸边

这里写正文。
```

`ruling` 可选 `ruled`（横线纸）或 `grid`（方格纸），默认横线纸。二、三级标题生成目录。六篇原示例保存在 `src/content/posts/draft/`，在本机开发服务的 `/archives/draft/` 阅读。将定稿移至 `src/content/posts/` 即可发布。生产构建只为公开内容生成页面、标签、搜索结果、订阅条目和旧址跳转。

用 `$…$` 写行内公式，用独立成行的 `$$` 包裹公式块，构建时生成 MathML。

## 作品、影集与个人资料

- 在 `src/content/works/` 添加带标题、摘要、日期和标签的 Markdown。站点自身的案例在 `/works/fold-journal/`，页脚与简历可直接引用。
- 在 `src/content/albums/` 发布影集，使用 `photos` 数组按观看顺序填写每张照片的 `src`、`alt` 与可选的 `caption`。`cover` 可指定单独的封面，默认取第一张照片。公开照片可放进 `public/`。每册拥有独立地址 `/albums/<slug>/`。
- 首页和网页简历共用 `src/lib/profile.ts`。在此填写公开资料、经历和邮箱，也可用 `PUBLIC_CONTACT_EMAIL` 设置邮箱。访客通过静态页面阅读。
- 友链名录在 `src/data/friends.json`。每条填写分组 `group`（`friends` 或 `reading`）、站名 `name`、主页 `url`、推荐语 `note` 与手选文章 `picks`（每篇含 `title`、`url`）。用 `feed` 指定 RSS/Atom 地址，也可以用 `latest` 手填最新文章及可选日期 `date`。`npm run sync:friends` 从对方的订阅源同步最新一篇文章，构建时也会同步。`src/data/friend-updates.json` 保存成功结果。保留此快照即可在后续构建遇到源站离线时继续展示。
- 正式部署时将 `SITE_URL` 设为站点源地址。`/feed.xml` 在每次构建时收录已发布的作品、文章和影集，并使用含部署前缀的绝对链接。

## 阅读与换页

- 页眉的「阅读设置」提供深色模式、减少动态效果和并行取文与收纸。三项选择保存在浏览器中。首次访问时，配色跟随系统，折纸为完整速度，并行默认关闭。
- 首页、作品集、文章、影集、关于我各有一个折纸入口。当前栏目显示线稿，其余入口在线稿上覆盖实心图。跨栏目时，纸面折回原入口并与线稿重合，新内容从目标图标的位置展开。
- 同栏目内直接换内容。全站标签、搜索、友链与 404 共用无选中项的顶栏，进出这些页面均直接切换。前进、后退遵循相同的栏目判断。
- 跨栏目时默认先取文，再收纸。并行模式同时取文与收纸，两项完成后交换正文。单程 1160 毫秒，完整收展约 2.32 秒。
- 中央纸面占视口宽度的 60%，整张纸面均可滚动。原生滚动条与纸面等高，从不透明顶栏下沿延伸到视口底边。四边等宽的留白属于内容容器，上下留白随正文滚动。短页版权靠底，长文滚到末尾可见。窄屏保留纸面比例并改用单栏。
- 折纸模型在第一次需要动效时下载。各页面共用一个动效层，长文只取当前可视纸面，最多缓存两张大纸纹。首轮使用 Canvas 2D，空闲时可以准备 WebGL2，并在相同尺寸、纸纹和收展方向下比较绘制表现。开启减少动态效果或画布不可用时，直接显示目标页。
- Astro ClientRouter 管理导航和页面元数据。博客按浏览器历史条目保存纸面的阅读位置，支持前进、后退和刷新。目录锚点、在新标签页打开和禁用 JavaScript 阅读使用普通链接。

五个入口共用同一只赤陶色纸鹤，每个栏目可以单独配置实心图 `icon` 和线稿 `outline`。线稿保留外缘和可见折边，按最终折姿预先生成。浏览器直接显示 SVG，换主题时用 CSS 着色。修改纸色、造型或线宽后，使用下文相同的 Playwright 与本机 Chrome 运行 `node tools/render-crane.cjs`，同步导出实心图、线稿和文章插图。加 `--benchmark` 可复测提取与显示开销。[栏目配置](src/lib/sections.ts) · [通用可见边提取](tools/fold-outline.mjs) · [停靠规则与性能实测](docs/vi-design.md#导航线稿与停靠)

需要复查换页时，可在生产预览运行期间执行 `node tools/check-navigation.cjs`。此开发工具使用可选的 `playwright` 包和本机 Chrome，设置 `ORIGAMI_BROWSER=edge` 可改用本机 Edge，`ORIGAMI_URL` 可指向其他预览地址。回归覆盖背景缓存、导航线稿与实心图交接、跨栏目收展、同栏目直达、锚点和历史滚动恢复，以及桌面和窄屏下的纸边与版权位置。

## 设计规范与组件库

[项目 VI](docs/vi-design.md) 收录浅色与深色样张、配色、字体与字重、纸面尺寸、折叠规则和组件用法。页面从 [Astro 组件库](src/components/ui/index.ts) 导入界面，样式共用 [设计变量](src/styles/tokens.css)。版权区的闽 ICP 和公安备案号目前为占位，正式信息在 [PaperFooter](src/components/ui/PaperFooter.astro) 中维护。界面改动遵循根目录的 [AGENTS.md](AGENTS.md)。

## 实现位置

| 路径 | 用途 |
| --- | --- |
| `src/content.config.ts`、`src/content/` | 已发布作品、文章、影集与本地文章草稿 |
| `src/pages/`、`src/layouts/Site.astro` | 五个主栏目、辅助页面、RSS 与 404 |
| `docs/page-map.md`、`src/lib/sections.ts` | 可编辑的页面层级、一级栏目与图标配置 |
| `src/components/ui/`、`src/styles/tokens.css` | 博客组件库与 VI 设计变量 |
| `src/scripts/desk-texture.cjs` | 再生纸配方、首屏生成和浏览器存储 |
| `src/assets/paper/`、`tools/generate-paper.py` | 同配方导出的静态后备遮罩及导出工具 |
| `src/scripts/navigation.ts` | 路由生命周期、导航取消、偏好和键盘焦点 |
| `src/lib/fold/` | 原纸鹤模型、独立收展时间轨、2D 与按需 WebGL2 绘制 |
| `public/art/` | 从同一模型和河岸绘图生成的静态插图，支持无脚本阅读 |
| `models/crane/`、`tools/` | 折痕、原始姿态、模型烘焙和打包工具 |

最初的两篇互切实验保存在 [prototype](prototype/index.html)，可在项目根目录用静态 HTTP 服务器访问 `/prototype/`。博客构建只发布 Astro 页面。原实验的[渲染实测](docs/渲染回退与博客集成.md)和[模型说明](docs/实现与多图标扩展.md)保留供对照。纸鹤折痕来源见[第三方署名](THIRD-PARTY-NOTICES.txt)。
