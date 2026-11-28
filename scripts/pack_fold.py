"""Pack an ordered, triangulated FOLD clip into a buildless browser asset."""
import argparse
import base64
import json
import math
import re
import struct
import textwrap
from pathlib import Path


def read_frames(paths):
    """Accept separate snapshots, or one root frame with root-inheriting children."""
    frames = []
    for path in paths:
        root = json.loads(path.read_text(encoding="utf-8-sig"))
        children = root.pop("file_frames", [])
        if children and len(paths) != 1:
            raise ValueError("Pass a single frame bundle or a series of individual snapshots")
        frames.append(root)
        for frame in children:
            if frame.get("frame_parent", 0) != 0 or "vertices_coords" not in frame:
                raise ValueError("Bundle frames must provide positions and use the root topology")
            frames.append(dict(root, **frame) if frame.get("frame_inherit") else frame)
    if len(frames) < 2:
        raise ValueError("At least two poses are needed, starting with the flat sheet")
    return frames


def positions(frame):
    result = []
    for p in frame["vertices_coords"]:
        if len(p) not in (2, 3) or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in p):
            raise ValueError("Expected finite 2D or 3D vertices")
        result.append((*p, 0) if len(p) == 2 else tuple(p))
    if len(result) < 3:
        raise ValueError("The flat sheet needs at least three vertices")
    return result


def faces_of(frame, count):
    faces = frame["faces_vertices"]
    for f in faces:
        if (len(f) != 3 or len(set(f)) != 3 or
                any(type(i) is not int or i < 0 or i >= count for i in f)):
            raise ValueError("Export triangulated faces with valid zero-based vertex indices")
    signature = {tuple(sorted(f)) for f in faces}
    if not signature or len(signature) != len(faces):
        raise ValueError("Empty or duplicate triangles")
    return signature


def encode(frames):
    flat = positions(frames[0])
    count = len(flat)
    lo = [min(p[i] for p in flat) for i in range(3)]
    span = [max(p[i] for p in flat) - lo[i] for i in range(3)]
    normal = span.index(min(span))
    # Preserve handedness for XY, XZ and YZ authoring planes respectively.
    x, y, sign = {2: (0, 1, 1), 1: (0, 2, -1), 0: (1, 2, 1)}[normal]
    side = max(span)
    if side == 0 or span[normal] > side * .0001 or abs(span[x]-span[y]) > side * .01:
        raise ValueError("Pose 0 must be an axis-aligned square, on XY, XZ or YZ")
    center = [low + extent/2 for low, extent in zip(lo, span)]
    topology = faces_of(frames[0], count)
    triangles = []
    covered_area = 0
    flat_grid = [(round((p[x]-center[x])*20000/span[x]), round((p[y]-center[y])*20000/span[y])) for p in flat]
    for a, b, c in frames[0]["faces_vertices"]:
        ax, ay = flat[a][x], flat[a][y]
        area = (flat[b][x]-ax)*(flat[c][y]-ay) - (flat[b][y]-ay)*(flat[c][x]-ax)
        (u,v),(u1,v1),(u2,v2) = (flat_grid[i] for i in (a,b,c))
        if abs(area) < side*side*1e-10 or (u1-u)*(v2-v) == (u2-u)*(v1-v):
            raise ValueError("Degenerate UV triangle in pose 0")
        covered_area += abs(area)/2
        triangles.append([a, b, c] if area > 0 else [a, c, b])
    if abs(covered_area/(span[x]*span[y])-1) > .002:
        raise ValueError("Flat triangle areas must cover the square paper")
    assignments = frames[0].get("edges_assignment", [])
    edges = frames[0].get("edges_vertices", [])
    if assignments and len(edges) != len(assignments):
        raise ValueError("Edge and assignment counts differ")
    scores = []
    for edge, kind in zip(edges, assignments):
        if len(edge) != 2 or any(type(i) is not int or i < 0 or i >= count for i in edge):
            raise ValueError("Invalid edge indices")
        a, b = edge
        if kind in ("M", "V") and math.dist(flat[a], flat[b]) >= .28 * side:
            scores.append([a, b])
    binary = bytearray()
    for index, frame in enumerate(frames):
        vertices = positions(frame)
        if len(vertices) != count or faces_of(frame, count) != topology:
            raise ValueError(f"Topology or vertex count changed in pose {index}")
        for p in vertices:
            xyz = ((p[x]-center[x])*2/span[x], (p[y]-center[y])*2/span[y],
                   sign*(p[normal]-center[normal])*2/side)
            sample = [round(n*10000) for n in xyz]
            if any(n < -32768 or n > 32767 for n in sample):
                raise ValueError(f"Pose {index} exceeds the signed 16-bit range")
            binary.extend(struct.pack("<hhh", *sample))
    return count, triangles, scores, base64.b64encode(binary).decode("ascii")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", type=Path, help="Frame bundle or flat.fold followed by poses in playback order")
    parser.add_argument("--name", default="CraneClip", help="JavaScript clip constant, e.g. BoatClip")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    if args.out.resolve() in {path.resolve() for path in args.inputs}:
        parser.error("Choose an output different from the source FOLD files")
    if not re.fullmatch(r"[A-Z][A-Za-z0-9]*Clip", args.name):
        parser.error("--name must be a capitalized identifier ending in Clip")
    try:
        frames = read_frames(args.inputs)
        count, triangles, scores, payload = encode(frames)
    except (ValueError, KeyError, OSError, TypeError) as error:
        parser.exit(2, f"Cannot pack clip: {error}\n")
    compact = lambda value: json.dumps(value, separators=(",", ":"))
    parts = ",\n".join("    '"+line+"'" for line in textwrap.wrap(payload, 112))
    result = (f"/* Generated by scripts/pack_fold.py. XYZ = little-endian int16 / 10000.\n"
              f" * Model sources and license information: see THIRD-PARTY-NOTICES.txt. */\n"
              f"export const {args.name} = {{\n  vertexCount: {count},\n  poseCount: {len(frames)},\n"
              f"  scores: {compact(scores)},\n  triangles: {compact(triangles)},\n"
              f"  positions: [\n{parts}\n  ].join('')\n}};\n")
    with args.out.open("w", encoding="utf-8", newline="\n") as output:
        output.write(result)
    print(f"{args.out}: {count} vertices, {len(triangles)} triangles, {len(frames)} poses, {len(scores)} visible scores")


if __name__ == "__main__":
    main()
