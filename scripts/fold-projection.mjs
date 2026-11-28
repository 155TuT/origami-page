import { readFile } from "node:fs/promises";

const rad = Math.PI / 180;
const yaw = -30 * rad;
function project([x, y, z], elevation) {
  const tilt = (90 - elevation) * rad;
  const u = x * Math.cos(yaw) - y * Math.sin(yaw),
    v = x * Math.sin(yaw) + y * Math.cos(yaw);
  return [u, v * Math.cos(tilt) - z * Math.sin(tilt), v * Math.sin(tilt) + z * Math.cos(tilt)];
}

function shade(vertices) {
  // Area-weighted polygon normal. A triangulation diagonal is not a new
  // fold and must not introduce two different colours on the same paper face.
  const n = [0, 0, 0];
  vertices.forEach((p, i) => {
    const q = vertices[(i + 1) % vertices.length];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  });
  const front = n[2] > 0;
  const length = Math.hypot(...n) * (front ? 1 : -1);
  const light = Math.max(
    0,
    Math.min(
      1,
      0.52 + (0.55 * (-0.45 * n[0] - 0.78 * n[1] + 0.43 * n[2])) / length + (front ? 0.025 : -0.07),
    ),
  );
  return Math.round((1 - light) * 0.93 * 120);
}
const round = (n) => Number(n.toFixed(2));

// Long petals and the two sides of a hull overlap even when their centroids
// are far apart. Compare depth inside the actual intersection, so the colour
// print and visibleFoldEdges agree about what is in front at that location.
function painterOrder(points, faces) {
  const side = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const triangles = faces
    .map((ids) => {
      const verts = ids.map((i) => points[i]);
      const [a, b, c] = verts;
      const area = side(a, b, c);
      return {
        ids,
        verts,
        area,
        blocks: [],
        incoming: 0,
        bounds: [
          Math.min(...verts.map((p) => p[0])),
          Math.max(...verts.map((p) => p[0])),
          Math.min(...verts.map((p) => p[1])),
          Math.max(...verts.map((p) => p[1])),
        ],
        depthAt: (p) => (a[2] * side(b, c, p) + b[2] * side(c, a, p) + c[2] * side(a, b, p)) / area,
      };
    })
    .filter((t) => Math.abs(t.area) >= 0.035);
  for (let i = 0; i < triangles.length; i++)
    for (let j = i + 1; j < triangles.length; j++) {
      const a = triangles[i],
        b = triangles[j],
        A = a.bounds,
        B = b.bounds;
      if (A[1] <= B[0] || B[1] <= A[0] || A[3] <= B[2] || B[3] <= A[2]) continue;
      let intersection = a.verts;
      for (let e = 0; e < 3 && intersection.length; e++) {
        const u = b.verts[e],
          v = b.verts[(e + 1) % 3],
          inside = [];
        for (let n = 0; n < intersection.length; n++) {
          const p = intersection[n],
            q = intersection[(n + 1) % intersection.length];
          const d = side(u, v, p) * Math.sign(b.area),
            f = side(u, v, q) * Math.sign(b.area);
          if (d >= 0) inside.push(p);
          if (d < 0 !== f < 0) {
            const t = d / (d - f);
            inside.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
          }
        }
        intersection = inside;
      }
      if (intersection.length < 3) continue;
      const overlap = intersection.reduce((acc, p, n) => {
        const q = intersection[(n + 1) % intersection.length];
        return acc + p[0] * q[1] - q[0] * p[1];
      }, 0);
      if (Math.abs(overlap) < 1e-7) continue;
      const point = [0, 1].map(
        (axis) => intersection.reduce((sum, p) => sum + p[axis], 0) / intersection.length,
      );
      const delta = a.depthAt(point) - b.depthAt(point);
      if (Math.abs(delta) < 1e-7) continue;
      const near = delta > 0 ? a : b,
        far = delta > 0 ? b : a;
      far.blocks.push(near);
      near.incoming++;
    }
  const pending = new Set(
    triangles
      .slice()
      .sort((a, b) => a.verts.reduce((s, p) => s + p[2], 0) - b.verts.reduce((s, p) => s + p[2], 0)),
  );
  const out = [];
  while (pending.size) {
    const next = Array.from(pending).find((t) => t.incoming === 0) ?? pending.values().next().value;
    pending.delete(next);
    out.push(next.ids);
    for (const later of next.blocks) later.incoming--;
  }
  return out;
}

const tokens = await readFile(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
export function token(name) {
  const value = tokens.match(new RegExp("--" + name + ":\\s*([^;]+);"));
  if (!value) throw new Error("Missing design token " + name);
  return value[1].trim();
}

export function projectMesh(model, elevation = 30, opticalScale = 1) {
  const projected = elevation === null ? model.points : model.points.map((p) => project(p, elevation));
  const xs = projected.map((p) => p[0]),
    ys = projected.map((p) => p[1]);
  const left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  const scale = opticalScale * Math.min((39 * 0.92) / (right - left), (32 * 0.91) / (bottom - top));
  const points = projected.map(([x, y, z]) => [
    round(19.5 + (x - (left + right) / 2) * scale),
    round(16 + (y - (top + bottom) / 2) * scale),
    round(z * scale),
  ]);
  const faces = painterOrder(points, model.faces);
  const shades = faces.map(ids => model.tones.get(ids) ?? shade(model.panels.get(ids).map(i => projected[i])));
  return { points, faces, shades, groups: faces.map(ids => model.groups.get(ids)) };
}
