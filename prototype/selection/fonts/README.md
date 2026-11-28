# 选型样张字库

对照页默认采用站点的正式字体。标题和正文的汉字、半角数字取汇文明朝体 GBK，西文字母取 IM FELL English，英文站标使用原版斜体。代码用 Inconsolata 配 Noto Serif SC Regular，公式用 Latin Modern Math，公式中的等宽变量与中文说明分别沿用代码的西文与中文字体。其他候选可以独立切换。此目录的 WOFF2 收录试排所需字符。[项目 VI](../../../docs/vi-design.md#字体与字重)

## 中文原版与许可

| 样张 | 实际采样文件 | 来源与许可 |
| --- | --- | --- |
| 汇文明朝体 GBK | 特里王，1.001，`Huiwen-MinchoGBK-Regular`。取自作者字体仓库「汇文明朝体」下载文件，西文修改测试版。 | [活字库](https://huozi.cool/) · [作者发布文及授权声明](https://huozi.cool/article/1780107027757.html) |
| 汇文仿宋 | 特里王，1.002，`Huiwen-Fangsong`。字样取自旧标准电码本使用的新华字模厂 59-4 仿宋。可在活字库「汇文系列」下载，按构建脚本中的英文文件名保存。 | [作者发布文](https://huozi.cool/article/1780107161300.html) · [作者字库与授权栏目](https://huozi.cool/) |
| TRW UD 明朝 | 特里王，1.070，`TRWUDMincho-Regular.ttf`。基于森泽 BIZ UD 明朝，作者另用屏显思源补字。NUR 包标签与字体内部名称表的版本不一致，样张按文件内部的 1.070 标注。 | [作者发布文](https://huozi.cool/article/1780107481576.html) · [固定的公开再分发文件](https://github.com/nix-community/nur-combined/blob/a92ca6f54425ac23f95f997d04312d1b682cf801/repos/DzmingLi/pkgs/TRWUDMincho/TRWUDMincho-Regular.ttf) · [OFL 1.1](ud-OFL.txt) |
| 一点明体 | 一点字坊，8.10，`I.Ming-8.10.ttf`。选推荐传承字形和侧排标点的标准版。 | [项目与原版](https://github.com/ichitenfont/I.Ming/tree/master/8.10) · [IPA Font License 1.0](IPA-LICENSE.md) |

特里王在汇文明朝体的发布文中允许免费显示、嵌入、转发和制作新字体，禁止单独出售字体文件。本站据此采样并改名。作者网站的授权栏目也将该字体列入可修改、可嵌入的一类。[汇文明朝体原始许可](https://huozi.cool/article/1780107027757.html)

汇文仿宋的授权另据活字库的「字体授权」栏目核对，页面在「免商可修改」下直接列出「汇文仿宋体」，并允许嵌入使用。原版字库署名 TerryWang，2022 年。样张保留作者版权和版本声明，抽取字符后改用独立内部名称。[作者公开授权配置](https://huozi.cool/api/license-config)

### 英文与界面字体

以下英文均来自 Google Fonts 固定修订，选择同一家族的正体与斜体。配置保留上游署名，修改过的字库使用独立的内部名称。

| 家族 | 字样来源与观察位置 | 原版及随附许可 |
| --- | --- | --- |
| EB Garamond | 低矮的小写字面、书名的斜体和站标 | [原版](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/ebgaramond) · [OFL 1.1](garamond-OFL.txt) |
| Cardo | David J. Perry 以威尼斯印刷家 Aldus Manutius 出版《De Aetna》时用的活字为蓝本。正体 1.0451、斜体 0.991。适合看长句字腔和墨色的均匀程度。 | [设计者说明](https://scholarsfonts.net/cardofnt.html) · [采样文件](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/cardo) · [OFL 1.1](cardo-OFL.txt) |
| Libre Caslon Text | 设计者从 1960 年代美国手绘 Caslon 教材取材，为网页正文优化。取 2.000 版正体和斜体的 400 字重，可在 14 px 观察饱满的小写字面。 | [设计者说明](https://github.com/impallari/Libre-Caslon-Text) · [采样文件](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/librecaslontext) · [OFL 1.1](caslon-OFL.txt) |
| IM FELL English | Igino Marini 将牛津收藏的 Fell 活字数字化。3.00 版正体和斜体均保留起伏的字缘，放大看墨印形状，缩回 17 px 看它与汇文字面的墨色。 | [字型背景](https://github.com/google/fonts/blob/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/imfellenglish/DESCRIPTION.en_us.html) · [采样文件](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/imfellenglish) · [OFL 1.1](fell-OFL.txt) |

对照板的顶栏、表单、图标名称和尺寸都复用正式站点的字体栈。西文字母使用 IM FELL English，汉字、日期和尺寸中的半角数字使用汇文明朝体 GBK。代码与数学公式的字库见下文。[正式字体声明](../../../src/styles/fonts.css)

### 标题与正文的半角数字

样张把 IM FELL English 正体的 H 放在十个数字旁作为高度参照。以基线为零，H 的顶缘为 1384/2048 em，约 0.676 em。A 的尖顶略高，为 0.701 em。下表取 400 字重，用 FontTools 测量数字轮廓顶缘到基线的距离。字号校准只作用于 U+0030–0039，小数点、单位和英文字母仍随正文西文排印。[数字试排](../index.html#figures)

| 数字方案 | 字形与宽度 | 原始顶缘 → 样张顶缘 |
| --- | --- | --- |
| 汇文明朝体 GBK（站点采用） | 原生齐线，十个半角数字均宽 0.5 em | 0.683–0.692 em，使用原字号 |
| EB Garamond | 启用 `lnum` 与 `pnum`，例如 1 宽 0.382 em、0 宽 0.506 em | 0.626–0.642 em × 107% → 0.670–0.687 em |
| Libre Caslon Text | 原生齐线、比例宽，1 宽 0.421 em、0 宽 0.634 em | 0.769–0.790 em × 87.5% → 0.673–0.691 em |
| 跟随正文西文 | 选 IM FELL English 时显示原生旧式数字，6、8 上伸，3、4、5、7、9 下伸。该正体无 `lnum` 替换 | 0.387–0.591 em，使用原字号 |

三个数字专用 WOFF2 均由上表所列原版提取，只映射十个半角数字。试排同时展示标题、正文、日期与图注中的数字。代码和公式各用独立字库。

### 技术段落的等宽西文与中文

等宽候选取常规字重和原生宽度。下表的字宽来自字体的水平度量表，1 em 是当前字号。逐字核验了从空格到波浪号的 95 个可打印 ASCII 字符，包括 `0O1lI`、括号与运算符。

| 西文样张 | 一个 ASCII 字符的宽度 | 原版及许可 |
| --- | --- | --- |
| DejaVu Sans Mono 2.37 | 1233/2048 em，约 0.6021 em。样张所用的希腊字母和箭头均有原生字形。 | [2.37 发行包内的 DejaVuSansMono.ttf](https://github.com/dejavu-fonts/dejavu-fonts/releases/tag/version_2_37) · [DejaVu 许可与署名](dejavu-LICENSE.txt) |
| IBM Plex Mono 2.3 | 600/1000 em。字面较宽，`π` 与单箭头有原生字形，`θ` 与 `Δ` 需要回退。 | [IBM 项目](https://github.com/IBM/plex) · [采样文件](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/ibmplexmono) · [OFL 1.1](plex-mono-OFL.txt) |
| Inconsolata 3.001 | 500/1000 em。取宽度轴 100、字重轴 400，字身紧凑。保留原版的箭头和不等号，`π θ Δ` 需要回退。 | [设计项目](https://github.com/googlefonts/Inconsolata) · [采样文件](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/inconsolata) · [OFL 1.1](inconsolata-OFL.txt) |

| 中文样张 | 代码注释与公式里的字形 | 原版及许可 |
| --- | --- | --- |
| 不寐仿宋 Book 0.102 | 以 HZ 宋朝和 GlyphWiki 字形数据绘制，笔锋细、横画微斜。原版收有 GB 2312 全部 6,763 个汉字，样张取 400 字重。 | [发行版及 Book 字库](https://github.com/InkPantherType/InsomniaFangsong/releases/tag/v0.102) · [X11 与上游署名](technical-fang-LICENSE.txt) |
| Noto Serif SC Regular 2.003 | 取 400 字重。横画平直，点画宽窄有规律，可作为技术注释的中性宋体参照。原版同样收全 GB 2312 汉字。 | [采样文件](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/notoserifsc) · [OFL 1.1](noto-serif-OFL.txt) |

两款技术中文都保留了样文与对照栏所需的汉字和中文标点。每个样文汉字原宽 1 em，因此同字号下，「折线长度」与 Inconsolata 的八位 ASCII 数字正好等宽，另外两款的八位数字会宽一些。技术西文的覆盖另抽查了希腊字母、箭头、比较与算术符号，下标、伸缩根号和求和式由数学字库排版。

### 公式字库

| 数学字库 | 文件与来源 |
| --- | --- |
| STIX Two Math 2.13 b171 | `stix-two-math.otf`。[STIX 原版](https://github.com/stipub/stixfonts/tree/v2.13b171/fonts/static_otf) · [OFL 1.1](stix-two-math-LICENSE.txt) |
| Latin Modern Math 1.959 | `latin-modern-math.otf`。[CTAN 发行版](https://ctan.org/pkg/lm-math) · [GUST Font License](latin-modern-math-LICENSE.txt) |

这两份 OTF 均随附完整原版，保留了 OpenType MATH 表中的数学轴、字距和伸缩字形配置。编辑 [Markdown 样文](../technical.md) 后，可在项目根目录运行 `node prototype/selection/render-technical.mjs` 再生成页面使用的渲染结果。

### 复算覆盖与重建字样

以 Python 的 `gb2312` 解码 16–87 区的有效双字节汉字，将得到的 6,763 个 Unicode 码位与原版字体的最佳 Unicode cmap 求交。汇文明朝体 GBK、一点明体各命中 6,763 字。汇文仿宋命中 6,762 字，缺单独的汉字笔画「丶」（U+4E36）。TRW 命中 6,732 字。该检查度量编码覆盖。字形是否符合个人习惯，可以用「纸、线、记」等字查看部件写法。

TRW 缺少的 31 个码位对应「佧、氽、坶、揞、揎、甙、囝、猸、庀、沲、彐、缍、缋、缏、楱、軎、搿、朊、膪、憝、肀、泶、砩、礤、钸、镙、窆、蟓、蠛、鳋、齄」。本页的站标、标题和样文本身均已逐字核过字库。

将表中原版文件按 [构建脚本](build.py) 的 `SPECIMENS` 与 `TECHNICAL` 表命名，放入一个临时目录，安装 FontTools 和 Brotli 后运行下列命令。脚本核验原版 SHA-256、中文覆盖与 ASCII 等宽度量，再从正文和技术 Markdown 中提取字符，重命名并生成离线 WOFF2。界面字库由同脚本的默认入口生成。

```sh
python prototype/selection/fonts/build.py --specimens-from "/path/to/original-fonts"
```

### IPA 字体还原

一点明体的样张衍生文件为 `heritage.woff2`，继续适用 IPA Font License 1.0。上表链接到一点字坊发行的完整字库，构建脚本包含样字提取和改名过程。

要在本页改用最初的 IPA 字体，可以下载并解压 [IPAmj 明朝](https://moji.or.jp/mojikiban/font/) 或 [IPAex 明朝](https://moji.or.jp/ipafont/ipafontdownload/)，将原始 `.ttf` 放入本目录。在 [type-specimen.css](../type-specimen.css) 中把 `fonts/heritage.woff2` 改成该 TTF 的相对路径。重开样张页即可使用原版。要还原到一点字坊发行的完整版，同样可将路径指向表中的原版 TTF。
