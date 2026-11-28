import { sectionClips } from './generated/section-clips.js';

// All four baked clips use little-endian signed XYZ in 1/10000 sheet units.
export function decodePositions(base64) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const packed = new DataView(bytes.buffer);
  return Float32Array.from({length:bytes.length/2}, (_,i) => packed.getInt16(i*2,true)/10000);
}

export function prepareFaces(triangles, uv, shades) {
  return triangles.map((ids,index) => {
    const [[u,v],[u1,v1],[u2,v2]] = ids.map(i => uv[i]);
    const determinant = (u1-u)*(v2-v)-(u2-u)*(v1-v);
    const inv = Math.abs(determinant) > 1e-10 ? 1/determinant : 0;
    return {ids, index, u, v, ax:(v2-v)*inv, bx:(v-v1)*inv,
      ay:(u-u2)*inv, by:(u1-u)*inv, depth:0,
      minU:Math.min(u,u1,u2), maxU:Math.max(u,u1,u2),
      minV:Math.min(v,v1,v2), maxV:Math.max(v,v1,v2), endTone:shades ? shades[index] : -1};
  });
}

const decoded = new Map();
function readStage(stage) {
  return {uv:stage.uv, faces:prepareFaces(stage.triangles,stage.uv,stage.shades),
    material:stage.material, xyz:decodePositions(stage.positions)};
}

export function sectionMotion(id) {
  if (!Object.hasOwn(sectionClips,id)) return null;
  if (!decoded.has(id)) {
    const clip = sectionClips[id], sheet = readStage(clip.sheet);
    decoded.set(id,{width:clip.width, height:clip.height, packetEnd:clip.packetEnd,
      scores:clip.scores.map(edge=>edge.map(i=>sheet.uv[i])), sheet, form:readStage(clip.form)});
  }
  return decoded.get(id);
}

export function sectionFrame(motion, fold) {
  const layered = fold >= motion.packetEnd;
  const t = layered ? (fold-motion.packetEnd)/(1-motion.packetEnd) : fold/motion.packetEnd;
  const {uv, faces, material, xyz} = layered ? motion.form : motion.sheet;
  const time = Math.max(0,Math.min(1,t))*(material.length-1);
  const left = Math.floor(time), right = Math.min(left+1,material.length-1), fraction = time-left;
  const mix = (a,b) => a + (b-a)*fraction;
  const offsetA = left*uv.length*3, offsetB = right*uv.length*3;
  const points = uv.map((_,i) => {
    const a = offsetA+i*3, b = offsetB+i*3;
    return [mix(xyz[a],xyz[b]), mix(xyz[a+1],xyz[b+1]), mix(xyz[a+2],xyz[b+2])];
  });
  const [endTint,ruling,relief] = material[left].map((a,i)=>mix(a,material[right][i]));
  return {points, uv, faces, layered, endTint, ruling, relief};
}
