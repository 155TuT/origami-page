import { dockModels } from './dock-models.js';

const mix = (a, b, t) => a + (b - a) * t;
const ease = t => {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
};
const packetEnd = .47;

// An actual square of eight triangular flaps. The diagonals between edge
// midpoints are the four corner hinges. Adjacent faces share their vertices.
const sheet = [
  [-1,-1], [0,-1], [1,-1], [-1,0], [0,0], [1,0], [-1,1], [0,1], [1,1],
];
const flaps = [[0,1,3],[1,4,3],[1,2,5],[1,5,4],[3,4,7],[3,7,6],[4,5,7],[5,8,7]];
const packetCorners = [[-1,0], [1,0], [0,-1]];
const sheetUV = sheet.map(([x,y]) => [(x + 1) / 2, (y + 1) / 2]);

// Rodrigues rotation about a hinge in the original plane of the paper.
function hinge([x, y, z], px, py, ax, ay, radians) {
  const dx = x - px, dy = y - py;
  const along = dx * ax + dy * ay;
  const across = dy * ax - dx * ay;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const r = across * cos - z * sin;
  return [px + ax * along - ay * r, py + ay * along + ax * r, across * sin + z * cos];
}

function cornerFold(p, angle) {
  const [x, y] = p;
  if (Math.abs(x) + Math.abs(y) <= 1 + 1e-8) return p;
  const sx = Math.sign(x), sy = Math.sign(y);
  return hinge(p, sx, 0, -sx * Math.SQRT1_2, sy * Math.SQRT1_2, -sx * sy * angle);
}

function presentPacket([x,y,z], id, t) {
  const tilt = t * (id === 'scissors' ? .85 : .22);
  const heading = t * (id === 'scissors' ? -.66 : id === 'kawasaki-rose' ? .48 : -.13);
  const y0 = y + t / 3;
  const vy = y0 * Math.cos(tilt) - z * Math.sin(tilt);
  return [x * Math.cos(heading) - vy * Math.sin(heading),
    x * Math.sin(heading) + vy * Math.cos(heading), y0 * Math.sin(tilt) + z * Math.cos(tilt)];
}

function foldSheet(id, t) {
  const first = Math.PI * ease(t / .56);
  const second = Math.PI * ease((t - .49) / .51);
  const roll = id === 'scissors' ? Math.PI / 2 : 0;
  return sheet.map(([x, y]) => {
    let p = roll ? [-y, x, 0] : [x, y, 0];
    if (id === 'kawasaki-rose') {
      p = cornerFold(p, first);
      if (p[1] > 0) p = hinge(p, 0, 0, 1, 0, second);
    } else {
      if (p[1] > 0) p = hinge(p, 0, 0, 1, 0, first);
      p = cornerFold(p, second);
    }
    // At the flat endpoint the printed sheet must keep its original orientation.
    const undo = roll * (1 - ease(t)), c = Math.cos(undo), s = Math.sin(undo);
    return presentPacket([c * p[0] + s * p[1], -s * p[0] + c * p[1], p[2]], id, ease(t));
  });
}

function prepareFaces(triangles, uv, shades) {
  return triangles.map((ids, index) => {
    const [[u,v],[u1,v1],[u2,v2]] = ids.map(i => uv[i]);
    const determinant = (u1-u)*(v2-v)-(u2-u)*(v1-v);
    const inv = Math.abs(determinant) > 1e-10 ? 1 / determinant : 0;
    return {ids, index, u, v, ax:(v2-v)*inv, bx:(v-v1)*inv,
      ay:(u-u2)*inv, by:(u1-u)*inv, depth:0,
      minU:Math.min(u,u1,u2), maxU:Math.max(u,u1,u2),
      minV:Math.min(v,v1,v2), maxV:Math.max(v,v1,v2), endTone: shades ? shades[index] : -1};
  });
}
const sheetFaces = prepareFaces(flaps, sheetUV);

function area(points, [i,j,k]) {
  const [a,b,c] = [points[i], points[j], points[k]];
  return Math.abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]));
}

// Once the sheet is folded flat in layers, change from its eight stock flaps
// to the denser topology of the finished study, in the very same triangle.
// One full panel covers the packet and the other panels lie inside its edges.
// The mapping stays shared at every vertex as the sails, loops or petals lift.
function makeMotion(id, model) {
  const points = model.points.map(([x,y,z]) => [(x-19.5)/19.5, (y-16)/19.5, z/19.5]);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), zs = points.map(p => p[2]);
  const left = Math.min(...xs), top = Math.min(...ys);
  const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
  const zCentre = (Math.min(...zs) + Math.max(...zs)) / 2;
  points.forEach(p => { p[2] -= zCentre; });
  const packet = points.map(([x,y]) => {
    const h = 1 - (y-top) / height;
    return [(2*(x-left)/width-1)*(1-h), -h];
  });
  const cover = model.faces.reduce((best, tri) => area(points, tri) > area(points,best) ? tri : best);
  const corners = packetCorners.map(p => [...p]);
  for (const i of cover) {
    const p = packet[i];
    const distance = q => Math.hypot(q[0]-p[0],q[1]-p[1]);
    corners.sort((a,b) => distance(a)-distance(b));
    packet[i] = corners.shift();
  }
  const groups = [];
  model.faces.forEach((ids,i) => ids.forEach(v => { groups[v] ??= model.groups[i]; }));
  const uv = packet.map(([x,y]) => [(x+1)/2, (y+1)/2]);
  const faces = prepareFaces(model.faces, uv, model.shades);
  return {id, width, height, points, groups, uv, faces,
    packet: packet.map(([x,y]) => presentPacket([x,y,0],id,1))};
}

const motions = new Map();
export function sectionMotion(id) {
  if (!Object.hasOwn(dockModels,id)) return null;
  if (!motions.has(id)) motions.set(id,makeMotion(id,dockModels[id]));
  return motions.get(id);
}

function liftPanel(p, group, id, opening) {
  const [x,y,z] = p;
  const remaining = 1 - opening;
  if (id === 'kawasaki-rose') {
    // Twist the four free lips around the crown before their edges settle.
    const angle = remaining * (1.9 - .8 * Math.hypot(x,y));
    const c = Math.cos(angle), s = Math.sin(angle);
    return [c*x - s*y, s*x + c*y - remaining*.26, z + remaining*(.32 - .28*Math.hypot(x,y))];
  }
  if (id === 'paper-boat') {
    // Pull fore and aft, lift the triangular peak and turn the gunwales out.
    const angle = group === 'hull-near' ? -.95 : group === 'hull-far' ? .95 : -.40;
    const flap = hinge(p,0,.20,1,0,remaining*angle);
    return [flap[0]*(.60+.40*opening),flap[1],flap[2]];
  }
  // Pull the two folded handles apart about the crossing of the blades.
  const angle = (group === 'handle-a' || group === 'blade-a' ? -.72 : .72) * remaining;
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x*c-y*s, y*c+x*s, z + remaining*.38*Math.hypot(x,y)];
}

export function sectionFrame(motion, fold) {
  if (fold < packetEnd) {
    return {points:foldSheet(motion.id,fold/packetEnd), uv:sheetUV, faces:sheetFaces, layered:false,
      endTint:0, ruling:1-ease((fold-.28)/(.45-.28)), relief:ease(fold/.20) * ease((packetEnd-fold)/.12)};
  }
  const t = (fold-packetEnd)/(1-packetEnd), opening = ease(t);
  const points = fold >= 1 ? motion.points : motion.points.map((p,i) => {
    const start = motion.packet[i], lifted = liftPanel(p,motion.groups[i],motion.id,opening);
    return lifted.map((n,k) => mix(start[k],n,opening));
  });
  return {points, uv:motion.uv, faces:motion.faces, layered:true,
    endTint:ease((t-.42)/.58), ruling:0, relief:ease(t/.18)};
}

export const sectionScores = [
  [sheetUV[1],sheetUV[7]], [sheetUV[3],sheetUV[5]], [sheetUV[1],sheetUV[3]],
  [sheetUV[3],sheetUV[7]], [sheetUV[7],sheetUV[5]], [sheetUV[5],sheetUV[1]],
];
export { prepareFaces, sheetFaces };
