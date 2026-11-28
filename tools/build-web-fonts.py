"""Build the production web fonts from the five original TTFs listed below.

Run: python tools/build-web-fonts.py /path/to/originals
Requires FontTools with its WOFF2 (Brotli) dependencies. The generated files
are checked in; normal Astro builds do not require Python or network access.
Supply the original latinmodern-math.otf alongside the TTFs to rebuild into
an empty directory. Otherwise the checked-in, unmodified OTF is reused.
"""

import argparse
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
from pathlib import Path
from shutil import copyfile

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "src/assets/fonts"
STYLESHEET = ROOT / "src/styles/fonts.css"
ORIGINALS = {
    "Huiwen-MinchoGBK-Regular.ttf": "e0aecfc380b80842eb3498526fa5cb402caf376eece52567f750948e46a545d3",
    "IMFeENrm28P.ttf": "fe9705bbde51af802719246d4608d08d37bde956ab99d9a590da996a5221a24c",
    "IMFeENit28P.ttf": "47cd75dce54b1f2e0831359d22d5e688f519d68ae45706b664fd310fd0e3ccf7",
    "Inconsolata[wdth,wght].ttf": "23ded25b447074d00659392bf9b1123d89df55cb07b0ad9bfef3366d199b5fcb",
    "NotoSerifSC[wght].ttf": "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9",
}


def css_ranges(points):
    ranges = []
    for cp in sorted(points):
        if ranges and cp == ranges[-1][1] + 1:
            ranges[-1][1] = cp
        else:
            ranges.append([cp, cp])
    return ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in ranges)


def face(family, filename, style="normal", points=None):
    rules = [
        f'  font-family: "{family}";',
        f'  src: url("../assets/fonts/{filename}") format("{"opentype" if filename.endswith(".otf") else "woff2"}");',
        f"  font-style: {style};",
        "  font-weight: 400;",
        "  font-display: swap;",
    ]
    if points is not None:
        rules.append(f"  unicode-range: {css_ranges(points)};")
    return "@font-face {\n" + "\n".join(rules) + "\n}"


def save_woff(task):
    source, filename, points, axes = task
    with TTFont(source, recalcTimestamp=False) as font:
        if points is not None:
            options = subset.Options()
            options.name_IDs = ["*"]
            options.layout_features = ["*"]
            selectors = [cp for table in font["cmap"].tables if table.format == 14
                         for cp in table.uvsDict]
            sub = subset.Subsetter(options=options)
            sub.populate(unicodes=[*points, *selectors])
            sub.subset(font)
        if axes:
            instantiateVariableFont(font, axes, inplace=True)

        # Give derivatives distinct internal names while preserving the
        # original copyright, designer and licence records.
        internal = "Fold Journal " + filename.removesuffix(".woff2")
        ps = internal.replace(" ", "")
        for record in font["name"].names:
            if record.nameID in (1, 3, 4, 6, 16, 18, 21, 25):
                record.string = (ps if record.nameID in (3, 6, 25) else internal).encode(record.getEncoding())
        font.flavor = "woff2"
        font.save(DEST / filename)


def codepoints(paths):
    return {ord(char) for path in paths for char in path.read_text(encoding="utf-8")}


def chinese_parts(font, home, articles):
    rest = set(font.getBestCmap())
    for label, corpus in (("home", home), ("articles", articles)):
        points = rest & corpus
        if points:
            yield label, points
            rest -= points
    # Keep all remaining encoded characters available to future posts,
    # with no large catch-all request for an uncommon name or glyph.
    ordered = sorted(rest)
    for start in range(0, len(ordered), 1024):
        yield f"{start // 1024:02}", ordered[start:start + 1024]


def build(originals):
    for name, digest in ORIGINALS.items():
        if sha256((originals / name).read_bytes()).hexdigest() != digest:
            raise ValueError(f"Unexpected source font: {name}")

    home = codepoints(ROOT / "src" / name for name in (
        "pages/index.astro", "lib/profile.ts", "lib/sections.ts", "layouts/Site.astro",
        "components/ui/SiteHeader.astro", "components/ui/FoldDock.astro",
        "components/ui/PaperFooter.astro", "components/ui/ReadingSettings.astro",
    ))
    digits = range(0x30, 0x3A)
    home.update(digits)
    articles = codepoints(p for p in (ROOT / "src").rglob("*")
                          if p.suffix in {".astro", ".md", ".ts", ".json"})
    DEST.mkdir(parents=True, exist_ok=True)
    math = originals / "latinmodern-math.otf"
    math_output = DEST / "latinmodern-math.otf"
    if not math.exists():
        math = math_output
    if sha256(math.read_bytes()).hexdigest() != "6075562b771f8b82f0c179e363389684f2dd09de30038269e2628e504bd7be0f":
        raise ValueError("Expected the unmodified Latin Modern Math 1.959 OTF")
    if math.resolve() != math_output.resolve():
        copyfile(math, math_output)
    css = ["/* Generated by tools/build-web-fonts.py. */"]
    tasks = []
    for name, family, filename, style, axes in (
        ("IMFeENrm28P.ttf", "IM FELL English", "fell-regular.woff2", "normal", {}),
        ("IMFeENit28P.ttf", "IM FELL English", "fell-italic.woff2", "italic", {}),
        ("Inconsolata[wdth,wght].ttf", "Inconsolata", "inconsolata.woff2", "normal", {"wdth": 100, "wght": 400}),
    ):
        tasks.append((originals / name, filename, None, axes))
        css.append(face(family, filename, style))

    for name, family, slug, axes in (
        ("Huiwen-MinchoGBK-Regular.ttf", "Huiwen Mincho GBK", "huiwen", {}),
        ("NotoSerifSC[wght].ttf", "Noto Serif SC", "noto-sc", {"wght": 400}),
    ):
        with TTFont(originals / name, lazy=True) as font:
            cmap = font.getBestCmap().keys()
            common_faces = []
            for label, points in chinese_parts(font, home, articles):
                filename = f"{slug}-{label}.woff2"
                if label in ("home", "articles"):
                    common_faces.append(face(family, filename, points=points))
                else:
                    # Overlap the common shards in CSS only. Listing them last
                    # gives them precedence and avoids repeating thousands of
                    # single-character holes in the rare shards' descriptors.
                    first, last = points[0], points[-1]
                    coverage = (cp for cp in cmap if first <= cp <= last)
                    css.append(face(family, filename, points=coverage))
                tasks.append((originals / name, filename, points, axes))
            css.extend(common_faces)

    with ProcessPoolExecutor(max_workers=4) as pool:
        for _ in pool.map(save_woff, tasks):
            pass
    css.append(face("Huiwen Figures", "huiwen-home.woff2", points=digits))
    css.append(face("Latin Modern Math", "latinmodern-math.otf"))
    STYLESHEET.write_text("\n\n".join(css) + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("originals", type=Path)
    build(parser.parse_args().originals)
