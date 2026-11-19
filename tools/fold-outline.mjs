// Authoring only. Faces must be in the same back-to-front order as the color print.
const edgeKey = (a, b) => a < b ? a + "/" + b : b + "/" + a;
const side = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

// Parameter interval of a segment that lies inside a foreground triangle.
function coveredInterval(from, to, face) {
  let start = 0, end = 1;
  for (let i = 0; i < 3; i++) {
    const a = face.points[i], b = face.points[(i + 1) % 3];
    const d0 = face.facing * side(a, b, from), d1 = face.facing * side(a, b, to);
    if (d0 <= 1e-8 && d1 <= 1e-8) return;
    if (d0 < 0) start = Math.max(start, d0 / (d0 - d1));
    if (d1 < 0) end = Math.min(end, d0 / (d0 - d1));
    if (start >= end) return;
  }
  return [start, end];
}

export function visibleFoldEdges(points, orderedFaces, physicalEdges) {
  const physical = new Set(physicalEdges.map(([a, b]) => edgeKey(a, b)));
  const faces = [], edges = new Map();
  for (const ids of orderedFaces) {
    const vertices = ids.map(id => points[id]);
    const area = side(vertices[0], vertices[1], vertices[2]);
    if (Math.abs(area) < .035) continue; // Same edge-on cutoff as the color renderer.
    const facing = Math.sign(area);
    const rank = faces.length;
    faces.push({ points: vertices, facing });
    for (let i = 0; i < 3; i++) {
      const a = ids[i], b = ids[(i + 1) % 3], key = edgeKey(a, b);
      const edge = edges.get(key);
      if (edge) {
        // A flat subdivision is visible only where it becomes a silhouette.
        edge.visible = physical.has(key) || edge.facing !== facing;
        edge.front = rank;
      } else {
        edges.set(key, { from: points[a], to: points[b], facing, front: rank, visible: true });
      }
    }
  }

  const segments = [];
  for (const { from, to, front, visible } of edges.values()) {
    if (!visible) continue;
    let ranges = [[0, 1]];
    for (let i = front + 1; i < faces.length && ranges.length; i++) {
      const covered = coveredInterval(from, to, faces[i]);
      if (!covered) continue;
      const [lo, hi] = covered, remaining = [];
      for (const [a, b] of ranges) {
        if (a < lo) remaining.push([a, Math.min(b, lo)]);
        if (hi < b) remaining.push([Math.max(a, hi), b]);
      }
      ranges = remaining;
    }
    const at = t => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    for (const [a, b] of ranges) segments.push([at(a), at(b)]);
  }
  return segments;
}

export function foldOutlineSVG({ width, height, points, faces, physicalEdges, stroke }) {
  const xy = p => p.map(n => Number(n.toFixed(3))).join(" ");
  const path = visibleFoldEdges(points, faces, physicalEdges)
    .map(([from, to]) => "M" + xy(from) + "L" + xy(to)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${path}" fill="none" stroke="black" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>\n`;
}
