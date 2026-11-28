# 折间功能图标

八枚图形取自 Phosphor 作者维护的 `@phosphor-icons/core`，固定到 v2.0.8 的 Regular 版本。每个用途对应一个名字，点击对照板中的图标可查看该枚 SVG 原稿。[官方仓库](https://github.com/phosphor-icons/core) · [固定版本的 Regular 目录](https://github.com/phosphor-icons/core/tree/v2.0.8/assets/regular) · [随附 MIT 许可](phosphor-LICENSE.txt)

| 场景 | 用途 | 上游名称 |
| --- | --- | --- |
| 顶栏 | 全站搜索 | magnifying-glass |
| 顶栏 | 阅读设置 | sliders-horizontal |
| 正文 | 本篇目录 | list-bullets |
| 文末 | 上一篇、下一篇 | arrow-left、arrow-right |
| 友链与项目 | 打开外部原文 | arrow-square-out |
| 个人介绍 | 邮件联系 | envelope-simple |
| 页脚 | RSS 订阅 | rss-simple |

阅读设置保留两条横轨和两个空心滑钮。前后篇采用成对的水平箭头，跳出本站的箭头带外框。信封与订阅各用简化版，减少 16 px 下相邻线条的密度。样张默认显示折间顶栏工具使用的 19 px，也可对照 16 和 24 px。

[sprite.svg](sprite.svg) 中的八个 symbol 保留官方的 `0 0 256 256` 画框及路径，使用 `currentColor` 随纸面主题着色。离线样张用 [sprite.js](sprite.js) 内联同一套 symbol，以支持双击 HTML 预览。四个栏目的模型单独在[折纸选型页](../folds.html)中试选。
