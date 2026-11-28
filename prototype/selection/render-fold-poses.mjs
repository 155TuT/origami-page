import { readFile, writeFile } from "node:fs/promises";
import { visibleFoldEdges } from "../../scripts/fold-outline.mjs";
import { projectMesh } from "../../scripts/fold-projection.mjs";
import { mesh } from "../../models/mesh.mjs";

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

// These vector swatches are embedded in the offline selection board.
function print(model, elevation = 30, opticalScale = 1) {
  const { points, faces, shades } = projectMesh(model, elevation, opticalScale);
  const xy = points.map(([x, y]) => [x, y]);
  const round = n => Number(n.toFixed(2));
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
  return { fill, edges };
}

const poses = {
  scissors: print(scissors(), null),
  sampan: print(sampan()),
  sailboat: print(catamaran()),
  "two-masted-boat": print(twoMastedBoat()),
};
// A file:// specimen cannot fetch the published SVG to recolour its lines.
// Inline the path from the exact print that sits underneath the live dock.
for (const id of ["crane", "crown", "paper-boat", "kawasaki-rose"]) {
  const svg = await readFile(new URL(`../../public/art/folds/${id}/outline.svg`, import.meta.url), "utf8");
  const edges = svg.match(/<path\s+d="([^"]+)"/)?.[1];
  if (!edges) throw new Error(`Missing baked outline for ${id}. Run npm run bake:folds first.`);
  poses[id] = { edges };
}
await writeFile(new URL("./fold-poses.js", import.meta.url),
  "// Generated by node prototype/selection/render-fold-poses.mjs.\n" + "window.foldPoses = " + JSON.stringify(poses) + ";\n");
