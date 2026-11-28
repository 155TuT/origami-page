// Authoring coordinates are in units of a half-sheet. The dock's projected
// XYZ uses 39 × 32 units, with its origin at the upper left.
const mix = (a, b, t) => a + (b - a) * t;
function ease(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export const packetEnd = .47;
const sheet = [
  [-1,-1], [0,-1], [1,-1], [-1,0], [0,0], [1,0], [-1,1], [0,1], [1,1],
];
export const sheetUV = sheet.map(([x,y]) => [(x+1)/2, (y+1)/2]);
export const flaps = [[0,1,3],[1,4,3],[1,2,5],[1,5,4],[3,4,7],[3,7,6],[4,5,7],[5,8,7]];
export const sheetEdges = {
  boundary: [[0,1],[1,2],[2,5],[5,8],[8,7],[7,6],[6,3],[3,0]],
  interior: [[1,3],[3,7],[7,5],[5,1],[1,4],[4,7],[3,4],[4,5]],
};

// Rotate around the line through (px,py) with the unit direction (ax,ay).
function hinge([x,y,z], px,py, ax,ay, angle) {
  const dx = x-px, dy = y-py;
  const along = dx*ax + dy*ay, across = dy*ax - dx*ay;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const turned = across*cos - z*sin;
  return [px+ax*along-ay*turned, py+ay*along+ax*turned, across*sin+z*cos];
}

function cornerFold(point, angle) {
  const [x,y] = point;
  if (Math.abs(x)+Math.abs(y) <= 1+1e-8) return point;
  const sx = Math.sign(x), sy = Math.sign(y);
  return hinge(point,sx,0,-sx*Math.SQRT1_2,sy*Math.SQRT1_2,-sx*sy*angle);
}

function presentPacket([x,y,z], id, t) {
  const tilt = t*.22, heading = t*(id === 'kawasaki-rose' ? .48 : -.13);
  const y0 = y+t/3, vy = y0*Math.cos(tilt)-z*Math.sin(tilt);
  return [x*Math.cos(heading)-vy*Math.sin(heading), x*Math.sin(heading)+vy*Math.cos(heading),
    y0*Math.sin(tilt)+z*Math.cos(tilt)];
}

export function sheetPose(id, t) {
  const first = Math.PI*ease(t/.56), second = Math.PI*ease((t-.49)/.51);
  const points = sheet.map(([x,y]) => {
    let p = [x,y,0];
    if (id === 'kawasaki-rose' || id === 'crown') {
      p = cornerFold(p,first);
      if (p[1] > 0) p = hinge(p,0,0,1,0,second);
    } else {
      if (p[1] > 0) p = hinge(p,0,0,1,0,first);
      p = cornerFold(p,second);
    }
    return presentPacket(p,id,ease(t));
  });
  const fold = t*packetEnd;
  return {points, material:[0, 1-ease((fold-.28)/.17), ease(fold/.20)*ease((packetEnd-fold)/.12)]};
}

function area(points, [i,j,k]) {
  const [a,b,c] = [points[i],points[j],points[k]];
  return Math.abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]));
}

// The flat packet is the overlap between the two topologies. One panel
// covers the packet, while all remaining panels start stacked inside it.
export function formStart(id, model, elevation) {
  const points = model.points.map(([x,y,z]) => [(x-19.5)/19.5,(y-16)/19.5,z/19.5]);
  const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]), zs = points.map(p=>p[2]);
  const left = Math.min(...xs), width = Math.max(...xs)-left;
  const top = Math.min(...ys), height = Math.max(...ys)-top;
  const zCentre = (Math.min(...zs)+Math.max(...zs))/2;
  points.forEach(p => { p[2] -= zCentre; });
  const packet = points.map(([x,y]) => {
    const h = 1-(y-top)/height;
    return [(2*(x-left)/width-1)*(1-h),-h];
  });
  const cover = model.faces.reduce((best,tri) => area(points,tri)>area(points,best) ? tri : best);
  const corners = [[-1,0],[1,0],[0,-1]];
  for (const i of cover) {
    const distance = q => Math.hypot(q[0]-packet[i][0],q[1]-packet[i][1]);
    corners.sort((a,b) => distance(a)-distance(b));
    packet[i] = corners.shift();
  }
  const groups = [];
  model.faces.forEach((ids,i) => ids.forEach(v => { groups[v] ??= model.groups[i]; }));
  const form = {points, groups, uv:packet.map(([x,y]) => [(x+1)/2,(y+1)/2]),
    packet:packet.map(([x,y]) => presentPacket([x,y,0],id,1))};
  if (id === 'crown') {
    const tilt = (90-elevation)*Math.PI/180, sin = Math.sin(tilt), cos = Math.cos(tilt);
    const heights = points.map(([,y,z]) => -y*sin+z*cos);
    const floor = Math.min(...heights);
    form.crown = {sin, cos, floor, bandHeight:(Math.max(...heights)-floor)*.42};
  }
  return form;
}

function liftPanel([x,y,z], group, id, opening, crown) {
  const remaining = 1-opening;
  if (id === 'kawasaki-rose') {
    const radius = Math.hypot(x,y), angle = remaining*(1.9-.8*radius);
    const c = Math.cos(angle), s = Math.sin(angle);
    return [c*x-s*y, s*x+c*y-remaining*.26, z+remaining*(.32-.28*radius)];
  }
  if (id === 'paper-boat') {
    const angle = group === 'hull-near' ? -.95 : group === 'hull-far' ? .95 : -.40;
    const flap = hinge([x,y,z],0,.20,1,0,remaining*angle);
    return [flap[0]*(.60+.40*opening),flap[1],flap[2]];
  }
  // Work in the crown's horizontal and vertical axes. First spread the four
  // sides of the band, then raise the four tips above its rim. The height map
  // stays monotone, including at vertices shared by a tip and its front wall.
  const {sin,cos,floor,bandHeight} = crown;
  const aboveFloor = -y*sin+z*cos-floor;
  const walls = ease(opening/.74), tips = ease((opening-.20)/.80);
  const depth = (y*cos+z*sin)*mix(.24,1,walls);
  const height = floor + Math.min(aboveFloor,bandHeight)*mix(.60,1,walls)
    + Math.max(0,aboveFloor-bandHeight)*mix(.24,1,tips);
  return [x*mix(.78,1,walls), depth*cos-height*sin, depth*sin+height*cos];
}

export function formPose(id, form, t) {
  const opening = ease(t);
  const points = t === 1 ? form.points : form.points.map((p,i) => {
    const lifted = liftPanel(p,form.groups[i],id,opening,form.crown);
    return lifted.map((n,k) => mix(form.packet[i][k],n,opening));
  });
  return {points, material:[ease((t-.42)/.58), 0, ease(t/.18)]};
}
