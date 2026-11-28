// Visible folded surfaces in model coordinates: x along the hull, y towards
// the near gunwale, z above the keel. These are studies of finished models.
export function mesh() {
  const points = [],
    faces = [],
    creases = [],
    panels = new Map();
  const groups = new Map(), tones = new Map();
  let groupName;
  const ids = new Map();
  function vertex(p) {
    const key = p.map((n) => n.toFixed(6)).join("/");
    if (!ids.has(key)) {
      ids.set(key, points.length);
      points.push(p);
    }
    return ids.get(key);
  }
  function panel(corners, scored = true, tone) {
    const p = corners.map(vertex);
    for (let i = 1; i < p.length - 1; i++) {
      const triangle = [p[0], p[i], p[i + 1]];
      faces.push(triangle);
      panels.set(triangle, p);
      groups.set(triangle, groupName);
      if (tone !== undefined) tones.set(triangle, tone);
    }
    if (scored) p.forEach((a, i) => creases.push([a, p[(i + 1) % p.length]]));
  }
  function edge(a, b) {
    creases.push([vertex(a), vertex(b)]);
  }
  function group(name) { groupName = name; }
  return { points, faces, creases, panels, tones, groups, group, panel, edge };
}
