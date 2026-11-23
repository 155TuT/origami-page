"""Build the comparison board's OFL font subsets with FontTools and Brotli."""

from concurrent.futures import ThreadPoolExecutor
from functools import partial
from hashlib import sha256
from pathlib import Path
from tempfile import gettempdir
from urllib.parse import quote
from urllib.request import urlopen
import sys

from fontTools import subset
from fontTools.ttLib import TTFont


HERE = Path(__file__).resolve().parent
GOOGLE = "https://raw.githubusercontent.com/google/fonts/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/"
WENKAI = "https://raw.githubusercontent.com/lxgw/LxgwWenKai/e52e0e1e9f561f1caa2e14c8154d3a1accee834a/"
SOURCES = (
    ("noto-serif", GOOGLE + "notoserifsc/", "NotoSerifSC[wght].ttf"),
    ("wenkai-regular", WENKAI, "fonts/TTF/LXGWWenKai-Regular.ttf"),
    ("wenkai-medium", WENKAI, "fonts/TTF/LXGWWenKai-Medium.ttf"),
    ("noto-sans", GOOGLE + "notosanssc/", "NotoSansSC[wght].ttf"),
    ("lora", GOOGLE + "lora/", "Lora-Italic[wght].ttf"),
    ("crimson", GOOGLE + "crimsonpro/", "CrimsonPro-Italic[wght].ttf"),
    ("source-serif", GOOGLE + "sourceserif4/", "SourceSerif4-Italic[opsz,wght].ttf"),
    ("dm-sans", GOOGLE + "dmsans/", "DMSans[opsz,wght].ttf"),
    ("plex-mono", GOOGLE + "ibmplexmono/", "IBMPlexMono-Regular.ttf"),
)
SUBSET_FAMILIES = {
    "noto-serif": "Text A", "wenkai-regular": "Text B", "wenkai-medium": "Text B",
    "noto-sans": "Text C", "lora": "Italic A", "crimson": "Italic B",
    "source-serif": "Italic C", "dm-sans": "Interface", "plex-mono": "Numerals",
}


def make_font(source, corpus, download_only):
    key, base, filename = source
    cache = Path(gettempdir()) / "fold-journal-specimen-fonts"
    cache.mkdir(exist_ok=True)
    url = base + quote(filename)
    original = cache / (sha256(url.encode()).hexdigest()[:12] + ".ttf")
    if not original.exists():
        with urlopen(url, timeout=120) as response:
            original.write_bytes(response.read())
    # Both WenKai weights share one upstream license.
    license_name = "wenkai" if base == WENKAI else key
    license_file = HERE / (license_name + "-OFL.txt")
    if key != "wenkai-medium" and not license_file.exists():
        with urlopen(base + "OFL.txt", timeout=45) as response:
            license_file.write_bytes(response.read())
    if download_only:
        return

    font = TTFont(original)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=corpus)
    subsetter.subset(font)

    # Give the modified faces their own internal name. Keep copyright,
    # designer, trademark and license metadata from the upstream font.
    names = font["name"]
    family = "Fold Specimen " + SUBSET_FAMILIES[key]
    styles = {record.nameID: record.toUnicode() for record in names.names
              if record.nameID in (2, 17) and record.langID == 0x409}
    style = styles.get(17, styles.get(2, "Regular"))
    if key == "wenkai-medium":
        style = "Medium"
    postscript = family.replace(" ", "") + "-" + style.replace(" ", "")
    replacements = {1: family, 2: style, 3: postscript, 4: family + " " + style, 6: postscript,
                    16: family, 17: style, 18: family + " " + style, 21: family, 25: family.replace(" ", "")}
    for record in names.names:
        if record.nameID in replacements:
            record.string = replacements[record.nameID].encode(record.getEncoding())
    font.flavor = "woff2"
    font.save(HERE / (key + ".woff2"))


if __name__ == "__main__":
    download_only = "--download-only" in sys.argv
    corpus = "".join(chr(cp) for cp in range(32, 127))
    if not download_only:
        for name in ("index.html", "selection.js"):
            corpus += (HERE.parent / name).read_text(encoding="utf-8")
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(partial(make_font, corpus=corpus, download_only=download_only), SOURCES))
