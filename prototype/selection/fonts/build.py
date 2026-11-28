"""Build the selection board's small WOFF2 samples with FontTools and Brotli."""

import argparse
from hashlib import sha256
from pathlib import Path
import re

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


HERE = Path(__file__).resolve().parent

# Source hashes refer to the unpacked original fonts. See README.md for download links.
SPECIMENS = (
    ("letterpress", "Huiwen-MinchoGBK-Regular.ttf", "e0aecfc380b80842eb3498526fa5cb402caf376eece52567f750948e46a545d3"),
    ("ud", "TRWUDMincho-Regular.ttf", "8586170e42a22ed4270c628d4be8770a62eca9f7313ffc3764f49a2f1668df87"),
    ("heritage", "I.Ming-8.10.ttf", "cba13b75b050d671b611d0063147262e421e14359ad4530948b070f56111f0f3"),
    ("huiwen-fangsong", "Huiwen-Fangsong.ttf", "dd9569785a0596056cbd49e565be6952629e1b0f71c5b820c6db94d78866631a"),
    ("garamond-roman", "EBGaramond[wght].ttf", "ef9512f92f6d579e5dc75af59a5a4b1b8b47d2eda89e00b954d44520e5369027"),
    ("garamond-italic", "EBGaramond-Italic[wght].ttf", "bba2c4499c93c9612b90b9825d32b07da52fce2fe57562a1eb6b833553f93c4e"),
    ("cardo-roman", "Cardo-Regular.ttf", "bcb81f376f1c3892c7026dabf2beafbd1a7ee8ae95d132ee7d4ff7d7c3988261"),
    ("cardo-italic", "Cardo-Italic.ttf", "52c51cfde3a827dd9428511c4a968699952b8a917c5f0e97be782cbfa1880f9c"),
    ("caslon-roman", "LibreCaslonText[wght].ttf", "c11809dbfd5445886293d89b32bfc2584075c80e77750cf1c284113e36b8b3f4"),
    ("caslon-italic", "LibreCaslonText-Italic[wght].ttf", "60ca1a3aade61c8c381800ca85b9b2f0fb341d89ebe065e12cd6ec2ee2e53e54"),
    ("fell-roman", "IMFeENrm28P.ttf", "fe9705bbde51af802719246d4608d08d37bde956ab99d9a590da996a5221a24c"),
    ("fell-italic", "IMFeENit28P.ttf", "47cd75dce54b1f2e0831359d22d5e688f519d68ae45706b664fd310fd0e3ccf7"),
)

TECHNICAL = (
    ("tech-dejavu", "DejaVuSansMono.ttf", "b4a6c3e4faab8773f4ff761d56451646409f29abedd68f05d38c2df667d3c582"),
    ("plex-mono", "IBMPlexMono-Regular.ttf", "6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46"),
    ("tech-inconsolata", "Inconsolata[wdth,wght].ttf", "23ded25b447074d00659392bf9b1123d89df55cb07b0ad9bfef3366d199b5fcb"),
    ("tech-fangsong", "InsomniaFangSong-Book.ttf", "4526d0b43be59840c9eaa12f73a5fb906e2bb8f9ec3edaa878b9e99b30a40126"),
    ("tech-song", "NotoSerifSC[wght].ttf", "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9"),
)
ASCII = "".join(chr(cp) for cp in range(32, 127))
CODE_SYMBOLS = ASCII + "αβγδθλμπστφωΓΔΣΠΩ→←↔⇒−≤≥≠×÷±∞√∑·"
FIGURE_FACES = {"letterpress": "huiwen", "garamond-roman": "garamond", "caslon-roman": "caslon"}


def open_original(directory, filename, expected):
    path = directory / filename
    if sha256(path.read_bytes()).hexdigest() != expected:
        raise ValueError(f"{filename} differs from the researched release")
    return TTFont(path)


def save_subset(font, key, family_suffix, corpus, axes=None):
    options = subset.Options()
    options.name_IDs = ["*"]
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=corpus)
    subsetter.subset(font)
    if axes:
        font = instantiateVariableFont(font, axes)

    # Give the modified faces their own internal name. Keep copyright,
    # designer, trademark and license metadata from the upstream font.
    names = font["name"]
    family = "Fold Specimen " + family_suffix
    styles = {record.nameID: record.toUnicode() for record in names.names
              if record.nameID in (2, 17) and record.langID == 0x409}
    style = "Regular" if axes else styles.get(17, styles.get(2, "Regular"))
    postscript = family.replace(" ", "") + "-" + style.replace(" ", "")
    replacements = {1: family, 2: style, 3: postscript, 4: family + " " + style, 6: postscript,
                    16: family, 17: style, 18: family + " " + style, 21: family, 25: family.replace(" ", "")}
    for record in names.names:
        if record.nameID in replacements:
            record.string = replacements[record.nameID].encode(record.getEncoding())
    if "CFF " in font:
        cff = font["CFF "].cff
        cff.fontNames[0] = postscript
        top = cff.topDictIndex[0]
        top.FamilyName = family
        top.FullName = family + " " + style
        for index, fd in enumerate(getattr(top, "FDArray", [])):
            if hasattr(fd, "FontName"):
                fd.FontName = f"{postscript}-{index}"
    font.recalcTimestamp = False
    font.flavor = "woff2"
    font.save(HERE / (key + ".woff2"))


def build_specimens(originals):
    script = (HERE.parent / "type-specimen.js").read_text(encoding="utf-8")
    # These are the strings rendered with the candidate fonts. The notes use the UI face.
    article = re.search(r'<article class="type-sheet"[^>]*>(.*?)</article>', script, re.S).group(1)
    glyph = re.search(r'<div class="type-glyph"[^>]*>.*?<p>(.*?)</p>', script, re.S).group(1)
    common_line = re.search(r'const commonLine = "(.+)";', script).group(1)
    technical = (HERE.parent / "technical.md").read_text(encoding="utf-8") + "沿纸边折回折线长度"
    sample = re.sub(r"<[^>]+>", "", article + glyph) + common_line + technical
    required = {ord(ch) for ch in sample if ord(ch) >= 0x3000}
    gb_chars = {ord(ch) for lead in range(0xB0, 0xF8) for trail in range(0xA1, 0xFF)
                for ch in bytes([lead, trail]).decode("gb2312", errors="ignore")}
    for key, filename, expected in SPECIMENS:
        font = open_original(originals, filename, expected)
        corpus = ASCII
        if not key.endswith(("-roman", "-italic")):
            cmap = font.getBestCmap().keys()
            missing = sorted(required - cmap)
            if missing:
                raise ValueError(f"{filename} lacks sample characters {list(map(chr, missing))}")
            print(f"{key}: {len(gb_chars & cmap)} / {len(gb_chars)} GB 2312 Han characters")
            corpus += sample
        save_subset(font, key, key.replace("-", " ").title(), corpus)
        if key in FIGURE_FACES:
            family = FIGURE_FACES[key]
            digits = open_original(originals, filename, expected)
            weight = {"wght": 400} if "fvar" in digits else None
            save_subset(digits, "figures-" + family, "Figures " + family.title(), "0123456789", weight)

    chinese_sample = "".join(sorted({ch for ch in technical if ord(ch) >= 0x3000}))
    for key, filename, expected in TECHNICAL:
        font = open_original(originals, filename, expected)
        cmap = font.getBestCmap()
        axes = {"wght": 400, "wdth": 100} if key == "tech-inconsolata" else None
        if key == "tech-song":
            axes = {"wght": 400}
        family = "Numerals" if key == "plex-mono" else key.replace("-", " ").title()
        if key in ("tech-song", "tech-fangsong"):
            missing = [ch for ch in chinese_sample if ord(ch) not in cmap]
            if missing:
                raise ValueError(f"{filename} lacks technical sample characters {missing}")
            print(f"{key}: {len(gb_chars & cmap.keys())} / {len(gb_chars)} GB 2312 Han characters")
            save_subset(font, key, family, chinese_sample, axes)
        else:
            widths = {font["hmtx"][cmap[ord(ch)]][0] for ch in ASCII}
            if len(widths) != 1:
                raise ValueError(f"{filename} has varying ASCII advances")
            print(f"{key}: one ASCII cell = {widths.pop()} / {font['head'].unitsPerEm} em")
            save_subset(font, key, family, CODE_SYMBOLS, axes)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--specimens-from", required=True, type=Path, metavar="DIR",
                        help="directory containing the original research fonts")
    build_specimens(parser.parse_args().specimens_from)
