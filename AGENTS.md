# 折间协作约定

本文件适用于整个仓库。凡涉及界面或样式的工作，包括新增页面、调整现有组件、配色、排版、插图和动效，都必须遵循 [项目 VI](docs/vi-design.md)，并复用 [项目组件库](src/components/ui/index.ts)。

## 修改界面

1. 先按 VI 确定文字角色、表面和交互状态，从 [设计变量](src/styles/tokens.css) 取用配色、字体、字号、字重、间距、圆角与阴影。颜色使用语义变量，并检查浅色、深色两套主题。
2. 页面通过 `src/components/ui` 导入组件，用属性和插槽组织内容。新页面使用 `Site` 布局，共用站标、顶栏、纸面、版权和折叠舞台。
3. 现有组件能表达的界面直接复用。需要新变体时扩展原组件的属性与作用域样式。确需新增组件时放在 `src/components/ui/`，从 `index.ts` 导出，并在 VI 的组件表写明用途。全局基础样式由 `src/styles/global.css` 管理。
4. 调整视觉规则时，同步修改 VI、设计变量和使用它的组件。站标、导航、日期、标签、文章标题、按钮和备案信息各有统一入口，页面中避免重复定义。

## 页面层级

- 调整栏目或新增页面前先看[可编辑的页面层级图](docs/page-map.md)，按图安排页面、链接和导航归属。同步维护图、README 与 [一级栏目配置](src/lib/sections.ts)。文章列表用 `/archives/`，正文和分类都在该分支内，页面文字统一用「文章」。

## 纸面与换页

- 桌面材质统一由 `DeskBackdrop` 组合。底纸与深浅纤维分别取 `--bg-surface`、`--bg-strong-fiber`、`--bg-lite-fiber`。每块 384 × 384 px 的纸纹使用 850 条深色短纤维，竹林等透明纹样放在纤维上方的浮层。
- 文档头部从浏览器存储恢复两张纸纹，缺少有效缓存时才生成。站内换页保留桌面及其样式表。调整 `src/scripts/desk-texture.cjs` 中的配方时更新缓存版本，用 `python tools/generate-paper.py` 导出同配方的静态后备图，并同步 VI 和样张。换色直接使用设计变量。
- 顶栏与桌面固定在视口，中央纸面保持 60% 视口宽度。整张 `main#content` 是唯一纵向滚动区，原生轨道上接顶栏下沿、下达视口底部。四边共用 `--paper-inset`，上下留白由正文与版权的共同容器承载，随内容滚动。
- 正文与版权都放在 `Paper` 里面。短页版权靠底，长页版权接在内容末尾。真实备案号和链接在 `PaperFooter` 中统一更新。
- 折纸始终测量 `.paper-slot` 的完整外框。保留 `data-fold-paper`、`data-ruling`、`data-fold-dock` 与现有栏目映射。修改纸面或导航时，同时检查收展、减少动态效果、键盘焦点、目录锚点和历史滚动恢复。
- 折面从当前主题的 `--surface` 过渡到纸鹤用色。修改 `--crane-paper` 或 `--crane-shadow` 后运行 `node tools/render-crane.cjs`，使导航图标、静态插图和动画末帧使用同一套纸色。

## 验证

运行 `npm run check`、`npm run build`。布局与换页改动还需在生产预览中执行 `node tools/check-navigation.cjs`。桌面与窄屏分别查看首页、长文和短页，检查明暗主题、四边留白、页脚换行与折纸停靠。运行条件见 [README](README.md)。
