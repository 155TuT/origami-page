# 栏目折纸模型

栏目配置里的 `model` 同时用作模型目录名与发布目录名。从下表可找到折痕、可编辑的姿态帧和烘焙输入。

| 栏目 | 模型 | 折痕与造型 | 姿态 |
| --- | --- | --- | --- |
| 首页 | 千纸鹤 | [传统纸鹤折痕原图](crane/creases.svg) | [纸面与折叠帧](crane/poses.fold) |
| 作品集 | 四角王冠 | [造型源](crown/model.mjs) · [折边](crown/creases.fold) | [纸面与折叠帧](crown/poses.fold) |
| 文章 | 报纸船 | [造型源](paper-boat/model.mjs) · [折边](paper-boat/creases.fold) | [纸面与折叠帧](paper-boat/poses.fold) |
| 影集 | 川崎玫瑰 | [造型源](kawasaki-rose/model.mjs) · [折边](kawasaki-rose/creases.fold) | [纸面与折叠帧](kawasaki-rose/poses.fold) |

纸鹤使用 Origami Simulator 的平面折痕和已选定的 33 帧姿态。王冠、船和玫瑰的 `model.mjs` 定义终姿的三维纸面及折边，`creases.fold` 记录该终姿的纸边、折边和面内辅助边。这三款的导航动作分为平纸合拢、折包成形两段，每段 33 帧，在折包处更换面网。它们记录的是站点的换页动作。单纸王冠按折纸王子教程中的四角、前脊及两侧叠边重建。[纸鹤原图](https://github.com/amandaghassaei/OrigamiSimulator/blob/main/assets/Origami/flat_crane.svg) · [四角王冠视频](https://www.youtube.com/watch?v=P4gDGANNtBo) · [报纸船折法](https://webspace.science.uu.nl/~bodla101/d.origami/traditional/boat.html) · [川崎玫瑰图鉴](https://www.asahipress.com/origami/kawasakirose/)

## 重建发布资产

在项目根目录运行 `npm run bake:folds`。离线工具使用 Node.js、Python 3、本机 Chrome 和 Node 可解析的 `playwright`。网站的普通生产构建直接读取已提交的烘焙产物。

1. 从造型源与[收展动作](section-poses.mjs)采样王冠、船和玫瑰的姿态，输出对应的 FOLD 文件，再连同纸鹤的姿态一起打包。若已手工编辑 FOLD 帧，用 `npm run bake:folds -- --from-poses` 直接打包并导出静态图。
2. 播放器使用 [src/lib/fold/generated/](../src/lib/fold/generated/) 中的压缩顶点，在相邻姿态之间插值。运行时坐标以万分之一纸面单位保存为小端序的 16 位有符号整数。
3. [静态导出器](../scripts/render-folds.cjs)调用同一播放器几何，取最后一帧的投影、面序与颜色，在 39 × 32 px 画框里导出 4 倍分辨率的 `solid.png`。可见边工具按同一帧的遮挡裁出 `outline.svg`，两张图共用中心点与透明边距。

顶栏只取 [public/art/folds/](../public/art/folds/) 下对应模型的实心图和线稿。正文取 [public/art/illustrations/](../public/art/illustrations/) 中的插图。更新离线选型板时，在上述烘焙完成后另行运行 `node prototype/selection/render-fold-poses.mjs`。
