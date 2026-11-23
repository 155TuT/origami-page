# 折间功能图标样张

图版把三套图标放在相同的尺寸和纸色上，比较搜索、阅读设置、订阅、打开外链、邮件和向右六种动作。四个一级栏目的实心折纸、线稿与收展动效由项目 VI 单独定义。

| 动作 | Lucide 1.78.0 | Tabler Outline 3.52.0 | Phosphor Regular 2.0.8 |
| --- | --- | --- | --- |
| 搜索 | search | search | magnifying-glass |
| 阅读设置 | sliders-horizontal | adjustments-horizontal | sliders-horizontal |
| RSS | rss | rss | rss-simple |
| 打开外链 | external-link | external-link | arrow-square-out |
| 邮件 | mail | mail | envelope-simple |
| 向右 | arrow-right | arrow-right | arrow-right |

**优先试用 Tabler Outline。** 阅读设置的空心圆钮呼应折间现有顶栏。搜索、邮件和外链共用圆头线，缩到工具栏尺寸后仍能辨认。入站时可以单独调整 24 单位画框上的描边粗细，与现有 19 px 工具按钮对齐。图版展示上游默认值，便于横向比较。

Lucide 同样使用 24 单位画框和 2 单位圆头描边。它把阅读设置的钮简化为短直线，适合想减少细节时采用。Phosphor Regular 用封闭的填充路径描绘曲线和圆点，图版等比缩放其 256 单位画框。要改变它的线条分量，可以采用同库的 Light 或 Bold 字重。

## 素材与许可

- Lucide 1.78.0 使用 ISC 许可。本组的 search、rss、external-link 和 arrow-right 也在上游列出的 Feather 衍生图标之内，附带 Feather 的 MIT 声明。[上游 SVG](https://github.com/lucide-icons/lucide/tree/1.78.0/icons) · [随附完整许可](lucide-LICENSE.txt)
- Tabler Outline 3.52.0 使用 MIT 许可，作者为 Paweł Kuna。[上游 SVG](https://github.com/tabler/tabler-icons/tree/v3.52.0/icons/outline) · [随附完整许可](tabler-LICENSE.txt)
- Phosphor Regular 2.0.8 使用 MIT 许可，版权归 Phosphor Icons。[上游 SVG](https://github.com/phosphor-icons/core/tree/v2.0.8/assets/regular) · [随附完整许可](phosphor-LICENSE.txt)

两个分发文件共用相同的 18 个 symbol。`sprite.svg` 可作静态 SVG 使用，`sprite.js` 为双击打开的本地图版内联同一份图形。每个 symbol 保留上游图形元素，继承调用处的 `currentColor`，并统一为 24 单位画框。
