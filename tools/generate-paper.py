"""Export the browser's recycled-paper masks as lossless fallback WebPs (Node and Pillow)."""

import argparse
import json
import math
from pathlib import Path
import subprocess

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / "src/scripts/desk-texture.cjs"
OUTPUT = ROOT / "src/assets/paper"
EXPORT = """
const { generateMasks } = require(process.argv[1]);
const { strong, lite } = generateMasks(JSON.parse(process.argv[2]));
process.stdout.write(strong);
process.stdout.write(lite);
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--strong-count", type=int, help="dark strands per tile (VI default: 850)")
    args = parser.parse_args()
    options = {}
    if args.seed is not None:
        options["seed"] = args.seed
    if args.strong_count is not None:
        if args.strong_count < 0:
            parser.error("--strong-count must be non-negative")
        options["strongCount"] = args.strong_count
    channels = subprocess.run(
        ["node", "--input-type=commonjs", "-e", EXPORT, str(RECIPE), json.dumps(options)],
        check=True, stdout=subprocess.PIPE,
    ).stdout
    area = len(channels) // 2
    size = math.isqrt(area)
    if size == 0 or 2 * size * size != len(channels):
        raise ValueError("Expected two square alpha masks from the browser recipe")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, alpha in [("strong", channels[:area]), ("lite", channels[area:])]:
        tile = Image.new("RGBA", (size, size))
        tile.putalpha(Image.frombytes("L", tile.size, alpha))
        path = OUTPUT / f"fiber-{name}.webp"
        tile.save(path, lossless=True, method=6)
        print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
