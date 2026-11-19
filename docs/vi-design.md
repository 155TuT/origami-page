# 折间 · 视觉识别与组件规范

折间是一本关于折纸、设计、代码和散步的个人手记。桌面托住纸张，正文、插图和版权排在同一张纸上。字号、线条和留白区分阅读层次，换页时的纸鹤指向文章所属栏目。

颜色、字体、字重和尺寸以 [CSS 设计变量](../src/styles/tokens.css) 为准。页面从 [Astro 组件库](../src/components/ui/index.ts) 取用界面。本文参考了 [PebblePile 的 VI 说明](https://github.com/155TuT/PebblePile/blob/main/docs/vi-design.md) 将视觉角色、对应组件和验证方法放在一起的做法。

![浅色首页，原浆纸纹围住暖白内容纸面，封面与顶栏共用赤陶色纸鹤](vi/home-light.webp)

## 标志与插图

站标由中文「折间」和斜体英文 *Fold Journal* 组成，两者的可见字底对齐。桌面字号分别为 30 和 18 px，双行顶栏中缩为 24 和 15 px。站标左边与纸张外沿对齐，点击回到首页。

主导航的四个入口是「首页、文章、标签、关于」。图标位于文字左侧。当前栏目使用墨色文字与一条 2 px 的赤陶色下划线。正文和分类属于「文章」，标签详情属于「标签」。[页面层级思维导图](page-map.md)

插图使用细方格、定位十字、中英文图注和有替代文本的图像。封面图与标题并排时用竖线分隔，单栏时改用横线。文章内插图四边有细框。纸鹤与河岸两幅图均使用静态资源。[插图组件](../src/components/ui/Plate.astro)

## 配色与表面

桌面用带杂纤的原浆纸色，中央内容纸面用更浅的暖白，正文用浓褐墨色。赤陶色用于纸鹤、栏目下划线和文字链接。深色主题把桌面压到深褐，正文用暖白，链接转为浅陶色。

| 设计变量 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `--bg-surface` | `#DBC1A5` | `#302821` | 再生纸桌面的纸浆底色 |
| `--bg-strong-fiber` | `#94765B` | `#201912` | 掺入纸浆的深色短纤维 |
| `--bg-lite-fiber` | `#F5E4CC` | `#715F4E` | 浅色纤维及细颗粒 |
| `--base` | `#F1E7D8` | `#2A231E` | 不透明顶栏、封面叠纸边 |
| `--surface` | `#F8F2E8` | `#372E28` | 内容纸面、弹层、标签底色和展开时的平纸 |
| `--ink` | `#352B23` | `#F1E7D9` | 正文、标题、主操作底色 |
| `--muted` | `#655444` | `#CBB9A5` | 摘要、图注、未选导航、版权与备案 |
| `--faint` | `#75604E` | `#BBA58F` | 日期、篇数、目录编号 |
| `--accent` | `#874630` | `#E6AE91` | 链接、当前栏目下划线、焦点、打开的开关 |
| `--accent-ink` | `#FFF4E7` | `#3F241A` | 强调色底上的文字或开关圆点 |
| `--line` | `#D6C8B5` | `#58493D` | 列表行、侧栏与版权分隔线 |
| `--line-dark` | `#A18A72` | `#8B7461` | 标题分隔线、封面边界、滚动条 |
| `--plate` | `#E9DCC7` | `#473A30` | 插图底色，网格与标线取 `--plot-grid`、`--plot-line` |
| `--wash` | `#EDE2D1` | `#41352B` | 行内代码与关闭状态的开关 |
| `--crane-paper` / `--crane-shadow` | `#DF9671` / `#643321` | 同浅色 | 纸鹤受光面与背光面，静态插图和折叠模型共用 |
| `--fold-shadow` | `#90745A` | `#1C1612` | 内容纸刚抬起时的折面阴影 |

纸边和列表使用 1 px 实线。封面的错位纸边用 `--shadow-cover`，中央纸张用 `--shadow-sheet`，浮起的阅读设置用 `--shadow-panel`。主操作圆角 2 px，设置面板为 4 px。正文页通过标题、细线和空白分区。

根元素的 `data-theme` 切换整套配色。收纸时，折面从当前主题的 `--surface` 逐渐过渡到纸鹤的赤陶色，展开时沿原路径回到纸色。Canvas 2D 和 WebGL2 共用两端的颜色。横线、方格、折痕和高光分别使用 `--fold-rule`、`--fold-grid`、`--fold-score`、`--fold-highlight`。[纸张材质与模型](../src/lib/fold/paper.js)

### 再生纸纹与透明纹样

每块 384 × 384 px 的纸纹混合了 850 条深色短纤维、1,570 条浅色纤维与细颗粒噪声。纤维方向随机，穿过边缘的纤维从对边接续。大尺度色差保持轻微，使整张纸的颜色均匀，近看仍能辨出纸浆中夹杂的短纤维。种子 73421 使浏览器与静态后备图能复现同一张纸。[纸纹生成与缓存](../src/scripts/desk-texture.cjs)

首次打开且缺少有效缓存时，浏览器生成深浅两张透明度位图，并将两张 PNG 和配方版本一起存入 `localStorage` 的 `fold-journal:desk-texture`。刷新或直接打开文章时，文档头部在解析正文之前同步读取缓存，为首帧提供同一张纸纹。站内换页保留桌面节点和承载纹理的样式表。明暗主题共用两张遮罩，由 CSS 变量实时着色。

本地存储不可写时优先使用标签页的 `sessionStorage`。没有可读存储、禁用 JavaScript 或画布不可用且缺少缓存时，桌面使用同一配方导出的静态 WebP。调整纤维密度或噪声后，更新生成器的配方版本，运行 `python tools/generate-paper.py` 导出后备图，并更新本页样张。[后备图导出工具](../tools/generate-paper.py)

图层从下往上依次为桌面底色、深纤维、浅纤维和透明纹样，纸面与顶栏位于纹样上方。默认只显示纸质。接入竹林等透明图时，在构建环境中设置 `PUBLIC_DESK_IMAGE_URL`，例如素材存为 `public/art/bamboo.webp` 时填 `art/bamboo.webp`。也可以在主题中设置 `--bg-overlay-image`。浮层默认居中铺满，不透明度为 35%。下例将小幅纹样调整为 320 px 宽，降低浓度后重复铺排。[桌面组件](../src/components/ui/DeskBackdrop.astro)

```css
:root {
  --bg-overlay-size: 320px auto;
  --bg-overlay-repeat: repeat;
  --bg-overlay-opacity: .18;
}
```

## 字体与字重

| 文字角色 | 字体变量 | 字号、字重与行高 |
| --- | --- | --- |
| 封面标题 | `--serif` | 29–78 px，700，行高 1.12 |
| 内页与文章标题 | `--serif` | 28–59 px，700，行高 1.2 |
| 栏目标题、文章列表标题 | `--serif` | 栏目 26 px、列表 20–26 px，650。单栏分别为 23、21 px |
| 正文与正文小标题 | `--serif` | 正文 17 px，单栏 16 px，400，行高 1.95。二、三级标题为 25、21 px，700 |
| 导航、操作与说明 | `--sans` | 常规 400，导航和文字链接 550，主操作和眉题 600。说明与操作常用 12–14 px |
| 日期、篇数与代码 | `--mono` | 日期 12 px 并使用等宽数字，篇数 11 px，代码块 13 px |
| 英文站标、图注英文 | `--latin-serif` | Georgia 斜体。英文图注 14 px |

中文标题与正文优先 Noto Serif SC，依次回退到宋体类字体。界面使用 DM Sans 配系统中文无衬线字体，日期和代码优先 IBM Plex Mono。站点使用读者设备上可用的字形。以上字重对应 `--weight-regular / medium / semibold / heading / bold`，新增角色在设计变量里命名。

## 纸面、版心与版权

- **纸面外框**宽 `60vw`，水平居中。上沿贴合不透明顶栏底边，下沿贴合视口底边。顶栏通常高 75 px，视口宽度不超过 900 px 时分两行，高 88 px。
- **版心四边**共用 `--paper-inset`，随视口取 `clamp(10px, 2.4vw, 48px)`，支持 CSS 取整的浏览器按整像素对齐。1440 px 宽时四边为 35 px，390 px 宽时为 10 px。上下留白位于正文与版权共用的容器内，随内容卷入、卷出。滚到开头可见正文上方的留白，滚到末尾可见版权下方的留白。
- **滚动区**是整张 `main#content`。原生滚动条贴右侧纸边，轨道从顶栏底部一直到视口底部。阅读中段的内容可以到达纸面的上下边缘。目录跳转使用同一间距将目标段落留在易读的位置。[纸面组件](../src/components/ui/Paper.astro)
- **纸内排版**以 4、8、12、16、20、24、32 px 为常用间距。首页封面与文章列表、正文与版权之间使用 `--section-gap`。视口宽度不超过 1084 px 时主栏、侧栏和封面插图依次纵向排列，文章目录随内容排在后面。
- **版权区**通过一条细线与正文分隔，左侧显示构建年份与站名，右侧放备案信息。短页靠近纸面下边，长页随正文滚到末尾出现。窄屏可分行，仍对齐正文左右边界。当前备案项为「闽ICP备（待填写）」和「闽公网安备（待填写）」，正式信息统一在 [PaperFooter](../src/components/ui/PaperFooter.astro) 更新。

![深色标签页，版权和备案在短页底部，与正文左右对齐](vi/tags-dark.webp)

## 组件选用

组件通过 `src/components/ui/index.ts` 导出。页面负责取数和组合组件，布局根据 URL 确定所属栏目。组件的样式、变体和断点放在对应的 `.astro` 文件中。

| 用途 | 组件 | 用法 |
| --- | --- | --- |
| 站点外框 | `DeskBackdrop`、`SiteHeader`、`Paper`、`FoldStage` | 由 `Site` 统一装配。页面可传纸纹 `ruling`，纸面自带 `PaperFooter`。404 使用 `current={null}` |
| 阅读偏好 | `ReadingSettings`、`SettingSwitch` | 使用原生展开面板与带标签的开关。设置项沿用 `theme`、`reduce`、`parallel` |
| 分栏与旁注 | `ContentColumns`、`Sidebar`、`JournalAside`、`TableOfContents` | 正文进默认插槽，侧栏进 `aside` 插槽。文章传 Markdown 标题生成二、三级目录 |
| 标题 | `PageHeading`、`SectionHeading` | 内页使用标题、可选眉题与说明。眉题可通过 `eyebrowHref` 链接到上一级，分区标题可附文字操作 |
| 链接与操作 | `ActionLink`、`ActionRow` | 普通文字链接使用默认变体，主要阅读入口使用 `variant="primary"`。可选箭头属于装饰，操作含义由可见文字给出 |
| 封面、插图与日期 | `FeaturedPost`、`Plate`、`PostDate` | 封面接收一篇文章。插图支持 `cover`、`article` 两种变体。日期用 `time` 元素同时保留标准值与印刷格式 |
| 文章与索引 | `PostList`、`PostArticle`、`Prose`、`TagList`、`PostNeighbors` | 首页、文章、分类和标签详情共用列表。文章把 Markdown 正文传给 `PostArticle`，自定义长文可用 `Prose`。索引标签带篇数，文末标签用紧凑的 `article` 变体 |

文章列表页直接组合标题、文章列表和分类侧栏。

```astro
---
import Site from "../../layouts/Site.astro";
import { ContentColumns, JournalAside, PageHeading, PostList } from "../../components/ui";
import { allPosts } from "../../lib/blog";

const posts = await allPosts();
---
<Site title="文章">
  <ContentColumns>
    <PageHeading title="文章" description={`共 ${posts.length} 篇手记`} />
    <PostList posts={posts} />
    <JournalAside slot="aside" posts={posts} />
  </ContentColumns>
</Site>
```

## 动效、键盘与验证

折纸以整张可见纸面的外框为起点。当前页收回所属导航图标，下一页从自己的图标展开，每个方向 1160 ms。正文和版权跟随平纸淡出与恢复。选择「减少动态效果」后直接换页，返回与前进按历史条目恢复纸内位置。[折叠播放器](../src/lib/fold/player.ts) · [滚动恢复](../src/scripts/paper-scroll.ts)

用 Tab 可以进入「跳到正文」、导航、设置和纸面。键盘焦点使用 2 px 强调色轮廓。正文链接带下划线，导航以文字和下划线标出当前栏目，开关通过圆点位置与选中状态表达变化。文章、目录、版权和普通链接都随静态 HTML 输出。

修改版心或组件后，运行 `npm run check` 和 `npm run build`。在生产预览中运行 [导航回归](../tools/check-navigation.cjs)，检查四边距离、长短页版权位置、导航收展、目录锚点与历史恢复。

本版在 Windows 的 Chrome 157 和 Edge 157 上通过上述回归，保留了浏览器原生滚动条。明暗样张取自 1440 × 900 的生产页面。窄屏通过 390 × 844 和 320 × 568 的浏览器视口验证。

纸纹回归使用独立的浏览器上下文。首次访问检查两张遮罩已生成并写入存储，刷新及站内翻页检查生成次数为零，并核对两层桌面纹理确实取自缓存。布局回归同时测量纸面外缘、完整滚动高度、正文首行和版权末行的间距。
