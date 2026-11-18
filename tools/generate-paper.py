"""Bake two seamless, tintable paper masks. Requires NumPy and Pillow."""

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


SIZE = 384
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "assets" / "paper"


def value_noise(rng, cells):
    """Interpolate a periodic lattice so the last pixel leads into the first."""
    lattice = rng.standard_normal((cells, cells))
    coords = np.arange(SIZE) * cells / SIZE
    low = coords.astype(int)
    high = (low + 1) % cells
    t = coords - low
    t = t * t * (3 - 2 * t)
    rows = lattice[:, low] * (1 - t) + lattice[:, high] * t
    field = rows[low] * (1 - t[:, None]) + rows[high] * t[:, None]
    return (field - field.mean()) / field.std()


def wrapped_offsets(center, reach):
    if center < reach:
        return (0, SIZE)
    if center > SIZE - reach:
        return (0, -SIZE)
    return (0,)


def strands(rng, count, mean_length):
    scale = 3
    mask = Image.new("L", (SIZE * scale, SIZE * scale))
    draw = ImageDraw.Draw(mask)
    for _ in range(count):
        x, y = rng.uniform(0, SIZE, 2)
        length = 1.2 + min(5 * mean_length, rng.exponential(mean_length))
        angle = rng.uniform(0, math.tau)
        dx, dy = math.cos(angle), math.sin(angle)
        bend = length * rng.uniform(-0.19, 0.19)
        width = max(1, round(scale * rng.uniform(0.35, 1.05)))
        ink = int(rng.uniform(32, 130))
        points = []
        for t in (0, 0.25, 0.5, 0.75, 1):
            along = length * (t - 0.5)
            across = 4 * t * (1 - t) * bend
            points.append((x + dx * along - dy * across, y + dy * along + dx * across))
        # Draw the continuation of a crossing strand on the opposite tile edge.
        for ox in wrapped_offsets(x, length + 2):
            for oy in wrapped_offsets(y, length + 2):
                line = [((px + ox) * scale, (py + oy) * scale) for px, py in points]
                draw.line(line, fill=ink, width=width)
                draw.line(line[1:4], fill=ink, width=width + 1)
    return np.asarray(mask.resize((SIZE, SIZE), Image.Resampling.BOX)) / 255


def save_mask(name, grain, fibers):
    alpha = 1 - (1 - np.clip(grain, 0, 1)) * (1 - fibers)
    # Quantizing coverage keeps random fine grain compact in lossless WebP.
    alpha = np.uint8(np.round(np.round(alpha * 20) * 255 / 20))
    tile = Image.new("RGBA", (SIZE, SIZE), "white")
    tile.putalpha(Image.fromarray(alpha))
    path = OUTPUT / f"fiber-{name}.webp"
    tile.save(path, lossless=True, method=6)
    print(f"{path.name}: {path.stat().st_size:,} bytes")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=73421)
    parser.add_argument("--strong-count", type=int, default=850,
                        help="number of dark strands per 384 px tile (default: 850)")
    args = parser.parse_args()
    if args.strong_count < 0:
        parser.error("--strong-count must be non-negative")
    rng = np.random.default_rng(args.seed)
    # Dark-fiber density can change independently of the pale fibers.
    lite_rng = np.random.default_rng(np.random.SeedSequence([args.seed, 1]))
    pulp = (0.10 * value_noise(rng, 6) + 0.18 * value_noise(rng, 24)
            + 0.42 * value_noise(rng, 78) + 0.76 * rng.standard_normal((SIZE, SIZE)))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Reserve dark pigment for the tail of the noise and short inclusions.
    save_mask("strong", (-pulp - 0.45) * 0.065, 0.65 * strands(rng, args.strong_count, 3.1))
    save_mask("lite", pulp * 0.11, 0.72 * strands(lite_rng, 1570, 4.2))


if __name__ == "__main__":
    main()
