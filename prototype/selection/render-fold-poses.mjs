import { readFile, writeFile } from "node:fs/promises";
import { visibleFoldEdges } from "../../tools/fold-outline.mjs";

// Visible folded surfaces in model coordinates: x along the hull, y towards
// the near gunwale, z above the keel. These are studies of finished models.
function mesh() {
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

// Handa's scissor handles are loops of folded strips. Each loop is built
// around its open middle; both blade tips sit forward of the two loops.
function scissors() {
  const m = mesh();
  const angle = 15 * Math.PI / 180;
  // The original study is a 100 × 82 elevation rotated about its centre.
  // Keep that view when assembling its visible paper facets as a shallow mesh.
  const corner = ([x, y], z) => [
    (x - 50) * Math.cos(angle) - (y - 41) * Math.sin(angle),
    (x - 50) * Math.sin(angle) + (y - 41) * Math.cos(angle), z
  ];
  const face = (tone, z, points) => m.panel(points.map(p => corner(p, z)), true, tone);
  m.group("handle-a");
  face(7, 0, [[42,14],[48,7],[59,4],[56,11],[47,17]]);
  face(18, 0, [[59,4],[66,6],[69,10],[62,15],[56,11]]);
  face(65, 0, [[69,10],[67,26],[58,33],[53,25],[62,15]]);
  face(77, 0, [[58,33],[50,29],[43,22],[53,25]]);
  face(65, 0, [[43,22],[42,14],[47,17],[53,25]]);
  m.group("handle-b");
  face(18, .1, [[60,34],[69,25],[85,24],[77,29],[66,36]]);
  face(18, .1, [[85,24],[89,27],[88,40],[84,33],[77,29]]);
  face(77, .1, [[88,40],[83,46],[74,46],[78,41],[84,33]]);
  face(7, .1, [[74,46],[66,40],[60,34],[66,36],[78,41]]);
  m.group("blade-a");
  face(65, .2, [[12,69],[28,46],[54,30],[67,25],[60,34],[41,47]]);
  m.group("blade-b");
  face(18, .3, [[15,74],[40,47],[67,25],[85,24],[62,38],[45,62]]);
  face(7, .4, [[15,74],[40,47],[62,38],[45,62]]);
  return m;
}

// Bodlaender's traditional newspaper boat. The central point is part of the
// unfolded hat. The rim dips at the middle where the two lapels overlap.
function paperBoat() {
  const m = mesh();
  const left = [-1.1, 0, 0.58],
    right = [1.1, 0, 0.58],
    peak = [-0.075, 0, 0.91];
  for (const side of [-1, 1]) {
    m.group(side === 1 ? "hull-near" : "hull-far");
    const middle = [0, side * 0.38, 0.3];
    const keelLeft = [-0.61, side * 0.07, 0],
      keelRight = [0.61, side * 0.07, 0];
    const collarLeft = [-0.47, side * 0.11, 0.22],
      collarRight = [0.47, side * 0.11, 0.22];
    m.panel([left, middle, keelLeft]);
    m.panel([middle, right, keelRight]);
    m.panel([middle, keelRight, keelLeft]);
    m.panel([left, collarLeft, middle]);
    m.panel([middle, collarRight, right]);
    m.panel([collarLeft, collarRight, middle]);
    m.group("peak");
    m.panel([collarLeft, peak, collarRight]);
  }
  for (const end of [-1, 1]) {
    m.panel([[end * 0.47, -0.11, 0.22], peak, [end * 0.47, 0.11, 0.22]]);
  }
  return m;
}

// Inside-Out Boat. The hexagonal floor meets upright side walls and four
// triangular ends. On each side the return fold forms a narrow inner rim.
function sampan() {
  const m = mesh();
  const rim = [
    [-1.18, 0, 0.44],
    [-0.53, -0.43, 0.32],
    [0.53, -0.43, 0.32],
    [1.18, 0, 0.44],
    [0.53, 0.43, 0.32],
    [-0.53, 0.43, 0.32],
  ];
  const lining = rim.map(([x, y, z]) => [x * 0.93, y * 0.9, z - 0.035]);
  const floor = [
    [-0.69, 0, 0],
    [-0.42, -0.24, 0],
    [0.42, -0.24, 0],
    [0.69, 0, 0],
    [0.42, 0.24, 0],
    [-0.42, 0.24, 0],
  ];
  m.panel(floor);
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    m.panel([floor[i], floor[j], rim[j], rim[i]]);
    m.panel([rim[i], rim[j], lining[j], lining[i]]);
    m.panel([lining[i], lining[j], floor[j], floor[i]]);
  }
  return m;
}

// Maarten van Gelder, Catamaran (May 1987), finished model in figure 14.
// The double-boat base gives it two separated keels. The upper margin of each
// slender hull converges into a pointed bow. The small foresail hangs above it.
function catamaran() {
  const m = mesh();
  for (const y of [-0.32, 0.32]) {
    const stern = [-0.96, y, 0.3],
      bow = [1.1, y, 0.4];
    const sternInside = [-0.81, y, 0.33],
      bowInside = [0.8, y, 0.34];
    for (const side of [-1, 1]) {
      const rimA = [-0.72, y + side * 0.115, 0.31],
        rimB = [0.56, y + side * 0.095, 0.35];
      const keelA = [-0.49, y + side * 0.035, 0],
        keelB = [0.54, y + side * 0.035, 0];
      m.panel([stern, rimA, keelA]);
      m.panel([rimA, rimB, keelB, keelA]);
      m.panel([rimB, bow, keelB]);
      m.panel([stern, sternInside, rimA]);
      m.panel([sternInside, bowInside, rimB, rimA]);
      m.panel([bowInside, bow, rimB]);
    }
  }
  // The centre of the original sheet connects the two hulls under the mast.
  m.panel([
    [-0.78, -0.22, 0.3],
    [0.28, -0.22, 0.3],
    [0.28, 0.22, 0.3],
    [-0.78, 0.22, 0.3],
  ]);
  const mast = [0.035, -0.025, 1.79],
    tack = [0.035, 0.1, 0.31];
  const clew = [-0.9, 0.15, 0.31],
    seam = [-0.84, 0.23, 0.5];
  const aft = [-0.94, -0.12, 0.49];
  m.panel([clew, tack, mast, seam]);
  m.panel([seam, mast, aft, [-0.94, -0.12, 0.37], clew]);
  // The leading tip is tucked inside the two paper layers at steps 12–13.
  // That return shows beneath the raised foot of the triangular foresail.
  const head = [0.05, -0.05, 1.75],
    forward = [1.085, 0.14, 0.73];
  const luff = [0.058, -0.135, 0.68],
    lower = [0.058, -0.135, 0.54];
  m.panel([forward, head, luff]);
  m.panel([lower, luff, forward]);
  return m;
}

// Hadi Tahir's Sailing Ship: one open hull, a long folded bow flap and two
// polygonal sails rising directly from the floor. OrigamiUSA's finished view
// and the author's two photographs show the return fold on the shorter sail.
function twoMastedBoat() {
  const m = mesh();
  const rim = [
    [-0.98, 0, 0.33],
    [-0.77, -0.34, 0.32],
    [-0.41, -0.49, 0.35],
    [0.69, -0.45, 0.35],
    [0.99, -0.25, 0.35],
    [1.03, 0.25, 0.35],
    [0.66, 0.46, 0.3],
    [-0.52, 0.45, 0.29],
    [-0.82, 0.28, 0.31],
  ];
  const floor = [
    [-0.91, 0, 0.04],
    [-0.72, -0.2, 0.04],
    [-0.43, -0.31, 0.04],
    [0.56, -0.3, 0.04],
    [0.78, -0.17, 0.04],
    [0.78, 0.17, 0.04],
    [0.55, 0.3, 0.04],
    [-0.49, 0.31, 0.04],
    [-0.73, 0.17, 0.04],
  ];
  m.panel(floor);
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    m.panel([floor[i], floor[j], rim[j], rim[i]]);
  }
  const prow = [-1.45, -0.01, 0.84],
    fold = [-0.65, 0.12, 0.24];
  m.panel([prow, rim[8], fold]);
  m.panel([prow, fold, rim[0]]);
  // Across each sail the paper opens slightly. The higher sail is pentagonal
  // and the short one turns back on itself about halfway up its broad face.
  const high = (u, offset, z) => [-0.23 + 0.66 * u - 0.75 * offset, -0.07 + 0.75 * u + 0.66 * offset, z];
  const footA = high(-0.34, 0, 0.045),
    footB = high(0.34, 0, 0.045);
  const shoulderA = high(-0.38, 0.07, 1.42),
    shoulderB = high(0.36, 0.08, 1.1);
  const top = high(0.025, 0.04, 1.7);
  m.panel([footA, footB, shoulderB, top, shoulderA]);
  m.panel([footB, high(0.33, -0.11, 0.045), high(0.32, -0.1, 1.11), shoulderB]);
  m.panel([shoulderB, high(0.32, -0.1, 1.11), top]);
  const low = (u, offset, z) => [0.59 + 0.72 * u - 0.69 * offset, -0.01 + 0.69 * u + 0.72 * offset, z];
  const a = low(-0.28, 0, 0.045),
    b = low(0.29, 0, 0.045);
  const c = low(0.32, 0.05, 0.8),
    d = low(0.24, -0.04, 1.32),
    e = low(-0.31, -0.04, 1.06);
  const elbow = low(-0.29, 0.065, 0.6),
    turn = low(-0.24, 0.08, 0.59);
  m.panel([a, b, c, turn]);
  m.panel([turn, c, d, e, elbow]);
  m.panel([turn, elbow, low(-0.34, -0.055, 0.045), a]);
  m.panel([elbow, e, low(-0.34, -0.055, 0.045)]);
  return m;
}

// Asahi Press identifies the open rose separately from the bud. Four curling
// lips wrap a square twist. Each strip runs from an attached fold up to its
// free edge and over the lip: the two rims have different radii and heights.
function rose() {
  const m = mesh();
  const rad = Math.PI / 180;
  const polar = (radius, theta, height) => [radius * Math.cos(theta), radius * Math.sin(theta), height];

  // A radial section runs from the sunken square twist, up the open crown,
  // over its rolled free rim, down a broad side petal and into the tucked base.
  // The change in bearing follows the four corners wrapping around the twist.
  // The fourth coordinate is the height of the overlap along that margin.
  const profile = [
    [0.08, -225, 0.8, 0.05],
    [0.15, -194, 0.86, 0.12],
    [0.24, -158, 0.94, 0.17],
    [0.39, -113, 0.98, 0.22],
    [0.62, -85, 1.01, 0.24],
    [0.77, -53, 0.83, 0.2],
    [0.98, -24, 0.88, 0.18],
    [1.04, -10, 0.75, 0.14],
    [0.94, -3, 0.58, 0.1],
    [0.74, 6, 0.25, 0.04],
    [0.55, 13, 0.03, 0],
  ];
  const across = [0, 0.1, 0.23, 0.38, 0.53, 0.68, 0.84, 1];
  const quarters = [];
  for (let petal = 0; petal < 4; petal++) {
    m.group("petal-" + petal);
    const grid = profile.map(([r, twist, h, overlap], i) =>
      across.map((t) => {
        // The free corners extend beyond the middle of each folded edge.
        const bulge = Math.sin(Math.PI * t);
        const turn = (1 - t) ** 3 * Math.sin((i / (profile.length - 1)) * Math.PI);
        const radius = r * (1 - 0.14 * bulge + 0.05 * turn);
        const angle = (petal * 90 + twist + t * 90 + 26 - 13 * turn) * rad;
        const arch = 0.085 * bulge * Math.sin((i / (profile.length - 1)) * Math.PI);
        const z = h + overlap * (0.56 - t) + arch;
        return polar(radius, angle, z);
      }),
    );
    quarters.push(grid);
    for (let i = 0; i < grid.length - 1; i++) {
      const inner = grid[i],
        outer = grid[i + 1];
      for (let j = 0; j < across.length - 1; j++) {
        m.panel([inner[j], outer[j], outer[j + 1], inner[j + 1]], false);
      }
      m.edge(inner[0], outer[0]);
    }
    // Only the rolled free rim, not its shading subdivisions, is an ink edge.
    for (let j = 0; j < across.length - 1; j++) m.edge(grid[7][j], grid[7][j + 1]);
    for (let j = 0; j < across.length - 1; j++) m.edge(grid[4][j], grid[4][j + 1]);
  }
  // The returning underside of each petal disappears under the next lip.
  // These four narrow connecting surfaces keep the turned edges solid in
  // profile while allowing the near lip to conceal the inner paper.
  const centre = [0, 0, 0.77],
    bottom = [0, 0, 0.03];
  quarters.forEach((grid, k) => {
    m.group("petal-" + k);
    const previous = quarters[(k + 3) % 4];
    for (let i = 0; i < profile.length - 1; i++) {
      m.panel([grid[i][0], previous[i].at(-1), previous[i + 1].at(-1), grid[i + 1][0]], false);
    }
    m.panel([centre, grid[0][0], previous[0].at(-1)], false);
    for (let j = 0; j < across.length - 1; j++) {
      m.panel([centre, grid[0][j], grid[0][j + 1]], false);
      const end = grid.at(-1);
      m.panel([bottom, end[j + 1], end[j]], false);
    }
  });
  return m;
}

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

const tokens = await readFile(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");
function token(name) {
  const value = tokens.match(new RegExp("--" + name + ":\\s*([^;]+);"));
  if (!value) throw new Error("Missing design token " + name);
  return value[1].trim();
}

function bake(model, elevation = 30, opticalScale = 1) {
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
  const xy = points.map(([x, y]) => [x, y]);
  const faces = painterOrder(points, model.faces);
  const shades = faces.map(ids => model.tones.get(ids) ?? shade(model.panels.get(ids).map(i => projected[i])));
  const fill = [];
  for (const [i, ids] of faces.entries()) {
    const tone = shades[i];
    const d = "M" + ids.map(id => xy[id].join(" ")).join("L") + "Z";
    if (fill.at(-1)?.[0] === tone) fill.at(-1)[1] += d;
    else fill.push([tone, d]);
  }
  const edges = visibleFoldEdges(xy, faces, model.creases)
    .filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.035)
    .map(([a, b]) => "M" + a.map(round).join(" ") + "L" + b.map(round).join(" "))
    .join("");
  return { print: { fill, edges }, mesh: { points, faces, shades, groups: faces.map(ids => model.groups.get(ids)) } };
}
const baked = {
  scissors: bake(scissors(), null),
  "paper-boat": bake(paperBoat()),
  sampan: bake(sampan()),
  sailboat: bake(catamaran()),
  "two-masted-boat": bake(twoMastedBoat()),
  "kawasaki-rose": bake(rose(), 60, Number(token("dock-rose-scale"))),
};
const generated = "// Generated by node prototype/selection/render-fold-poses.mjs.\n";
const print = Object.fromEntries(Object.entries(baked).map(([id, pose]) => [id, pose.print]));
await writeFile(
  new URL("./fold-poses.js", import.meta.url),
  generated + "window.foldPoses = " + JSON.stringify(print) + ";\n",
);

// The player, both dock images and the file:// specimen share one projection.
const models = {};
const paper = token("crane-paper"), shadow = token("crane-shadow");
const frame = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 32" width="39" height="32">';
const stroke = parseFloat(token("dock-outline-stroke"));
for (const id of ["scissors", "paper-boat", "kawasaki-rose"]) {
  const { print, mesh } = baked[id];
  models[id] = mesh;
  const faces = print.fill.map(([tone, d]) => {
    const color = Array.from({length:3}, (_, i) => {
      const digit = 1 + i * 2;
      const a = parseInt(paper.slice(digit, digit+2), 16);
      const b = parseInt(shadow.slice(digit, digit+2), 16);
      return Math.round(a + (b-a) * tone/120).toString(16).padStart(2, "0");
    }).join("");
    return `<path color="#${color}" d="${d}"/>`;
  });
  const outline = `<path d="${print.edges}" fill="none" stroke="black" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  const save = (suffix, content) => writeFile(new URL(`../../public/art/${id}-${suffix}.svg`, import.meta.url), frame + content + "</svg>\n");
  await save("icon", '<g fill="currentColor" stroke="currentColor" stroke-width=".045" stroke-linejoin="round">' + faces.join("") + '</g>');
  await save("outline", outline);
}
await writeFile(new URL("../../src/lib/fold/dock-models.js", import.meta.url),
  generated + "export const dockModels = " + JSON.stringify(models) + ";\n");
