import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Paper } from '../src/lib/fold/paper.js';
import { sectionFrame, sectionMotion } from '../src/lib/fold/section-motion.js';
import { projectMesh, token } from './fold-projection.mjs';

// The switch in panel count happens while both pieces of topology cover
// exactly the same triangular packet. Check its three corners and every
// vertex instead of comparing only the two bounding rectangles.
function edgeSide(a,b,p) {
  return (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]);
}
function checkTransfer(before, after, faces) {
  const near = (a,b) => Math.hypot(...a.map((n,i) => n-b[i])) < .0003;
  const corners = [before[1],before[3],before[5]];
  assert.ok(faces.some(f => corners.every(p => f.some(i => near(p,after[i])))),
    'one opening panel must cover the entire folded packet');
  const sign = Math.sign(edgeSide(...corners));
  for (const p of [...before,...after]) {
    assert.ok(corners.every((c,i) => sign*edgeSide(c,corners[(i+1)%3],p) >= -.0004),
      'no opening panel can extend beyond the folded packet');
  }
}

for (const id of ['crown','paper-boat','kawasaki-rose']) {
  test(id+' plays its baked positions and arrives at the printed dock', async () => {
    const dir = new URL(`../models/${id}/`,import.meta.url);
    const source = JSON.parse(await readFile(new URL('poses.fold',dir),'utf8'));
    const frames = [source,...source.file_frames];
    const split = source['foldJournal:formFrame'];
    const join = source['foldJournal:packetEnd'];
    const motion = sectionMotion(id);
    assert.equal(motion.packetEnd,join);
    const flat = sectionFrame(motion,0);
    const area = flat.faces.reduce((sum,face) => {
      const [a,b,c] = face.ids.map(i => flat.points[i]);
      return sum + Math.abs(edgeSide(a,b,c))/2;
    },0);
    assert.equal(area,4,'pose zero must cover a full square');
    checkTransfer(frames[split-1].vertices_coords,frames[split].vertices_coords,frames[split].faces_vertices);
    for (let i=0; i<frames.length; i++) {
      const t = i < split ? i/(split-1)*join : join+(i-split)/(frames.length-1-split)*(1-join);
      const pose = sectionFrame(motion,i===split-1 ? t-1e-12 : t);
      const coords = frames[i].vertices_coords;
      assert.equal(pose.points.length,coords.length);
      assert.ok(pose.points.every((p,j) => p.every((n,k) => Math.abs(n-coords[j][k]) < .00001)),
        'packed pose '+i+' must match its source');
    }
    const author = await import(new URL('model.mjs',dir));
    const scale = author.scaleToken ? Number(token(author.scaleToken)) : author.opticalScale;
    const mesh = projectMesh(author.default(),author.elevation,scale);
    const dock = {width:39,height:32};
    const pose = Paper.foldShape(dock,{fold:1,scale:Paper.iconWidth(39,32,id)/Paper.fullWidth(39,32,id)},id);
    assert.deepEqual(pose.faces.map(f=>f.ids),mesh.faces);
    assert.deepEqual(pose.faces.map(f=>f.endTone),mesh.shades);
    assert.ok(pose.points.every(([x,y],i) =>
      Math.hypot(x+19.5-mesh.points[i][0],y+16-mesh.points[i][1]) < .002),
    'the printed icon and packed last frame must share their camera and optical margins');
  });
}
