import {CraneClip} from './crane-data.js';
import {prepareFaces, sectionFrame, sectionMotion, sectionScores, sheetFaces} from './section-motion.js';

/* Shared paper geometry for the printed plate, both navigation icons and the transition. */
export const Paper = (() => {
  const { vertexCount, poseCount, triangles } = CraneClip;
  const bytes = Uint8Array.from(atob(CraneClip.positions), c => c.charCodeAt(0));
  const packed = new DataView(bytes.buffer);
  const vertices = Float32Array.from({ length: bytes.length / 2 }, (_, i) => packed.getInt16(i * 2, true) / 10000);
  const rad = Math.PI / 180;
  const view = {paperDiagonal: -45, modelPitch: 31, azimuth: -30, elevation: 30};
  const clamp = v => Math.min(1, Math.max(0, v));
  const mix = (a, b, t) => a + (b - a) * t;
  function ease(v) { const t = clamp(v); return t * t * (3 - 2 * t); }
  const stockStyles = {
    ruled: {step: 24, width: .85},
    grid:  {step: 18, width: .8}
  };
  const uv = Array.from({ length: vertexCount }, (_, i) => [(vertices[3*i]+1)/2, (vertices[3*i+1]+1)/2]);

  // A face-on sheet gradually takes the crane's resting pitch, azimuth and elevation.
  function project(fold) {
    const f = clamp(fold) * (poseCount - 1);
    const a = Math.floor(f) * vertexCount * 3;
    const b = Math.min(Math.floor(f) + 1, poseCount - 1) * vertexCount * 3;
    const t = f % 1, q = ease(fold);
    const basis = view.paperDiagonal*rad*q, pitch = view.modelPitch*rad*q;
    const yaw = view.azimuth*rad*q, tilt = (90-view.elevation)*rad*q;
    const c0 = Math.cos(basis), s0 = Math.sin(basis), c1 = Math.cos(pitch), s1 = Math.sin(pitch);
    const c2 = Math.cos(yaw), s2 = Math.sin(yaw), c3 = Math.cos(tilt), s3 = Math.sin(tilt);
    const points = [];
    for (let i = 0; i < vertexCount * 3; i += 3) {
      const x = mix(vertices[a+i], vertices[b+i], t);
      const y = mix(vertices[a+i+1], vertices[b+i+1], t);
      const z = -mix(vertices[a+i+2], vertices[b+i+2], t);
      const bx = x*c0 - y*s0, by = x*s0 + y*c0;
      const px = bx*c1 + z*s1, pz = -bx*s1 + z*c1;
      const vx = px*c2 - by*s2, vy = px*s2 + by*c2;
      points.push([vx, vy*c3 - pz*s3, vy*s3 + pz*c3]);
    }
    return points;
  }
  const folded = project(1);
  const xs = folded.map(p => p[0]), ys = folded.map(p => p[1]);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const bounds = { width: right-left, height: bottom-top, x: (left+right)/2, y: (top+bottom)/2 };
  const fitWidth = (w,h) => Math.min(w, h*bounds.width/bounds.height);
  const craneWidth = (w,h) => fitWidth(w*.92, h*.91);
  function place(points, x, y, sx, sy, sz, anchor) {
    return points.map(p => [x+(p[0]-bounds.x*anchor)*sx, y+(p[1]-bounds.y*anchor)*sy, p[2]*sz]);
  }

  // Both renderers and the static artwork sample the same sRGB pigment endpoints.
  // Resolve CSS colors once when the material changes, outside the animation loop.
  let lastMaterial;
  function readMaterial() {
    const styles = getComputedStyle(document.documentElement);
    const token = name => styles.getPropertyValue(name).trim();
    const pigments = ['--surface', '--fold-shadow', '--crane-paper', '--crane-shadow'].map(token);
    const [rule, grid, score, highlight] = ['--fold-rule', '--fold-grid', '--fold-score', '--fold-highlight'].map(token);
    const key = [...pigments, rule, grid, score, highlight].join('/');
    if (lastMaterial?.key === key) return lastMaterial;

    const sample = document.createElement('canvas');
    sample.width = pigments.length;
    sample.height = 1;
    const ctx = context2D(sample);
    pigments.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(i, 0, 1, 1); });
    const bytes = ctx.getImageData(0, 0, sample.width, 1).data;
    const [sheet, sheetShade, crane, craneShade] = pigments.map((_, i) => Array.from(bytes.slice(4*i, 4*i+3)));
    const palettes = new Map();
    function palette(fold) {
      const step = Math.round(ease(fold) * 24);
      if (!palettes.has(step)) {
        const paper = sheet.map((c, i) => mix(c, crane[i], step/24));
        const shadow = sheetShade.map((c, i) => mix(c, craneShade[i], step/24));
        const shades = Array.from({length:121}, (_, i) =>
          'rgb(' + paper.map((c, j) => Math.round(mix(c, shadow[j], i/120))).join(',') + ')');
        palettes.set(step, {shades, paper:paper.map(c => c/255), shadow:shadow.map(c => c/255)});
      }
      return palettes.get(step);
    }
    lastMaterial = {key, rule, grid, score, highlight, palette};
    return lastMaterial;
  }

  // The inverse of each triangle's REST UV basis is constant across all poses.
  const faces = prepareFaces(triangles,uv);
  const sorted = new WeakMap();
  function orderedFaces(points, topology=faces, layered=false) {
    // Once the packet opens, preserve the visible layers of the model. Its
    // static print uses this same precomputed occlusion order.
    if (layered) return topology;
    let order = sorted.get(topology);
    if (!order) { order = topology.slice(); sorted.set(topology,order); }
    order.forEach(face => {
      const [a,b,c]=face.ids;
      face.depth=points[a][2]+points[b][2]+points[c][2];
    });
    order.sort((a,b) => a.depth-b.depth);
    return order;
  }
  function drawMesh(ctx, points, fold, surface, rulingAmount=0, detail=false, frame) {
    const relief = frame?.relief ?? ease(fold/.48);
    const {shades} = (surface?.material ?? readMaterial()).palette(fold);
    const shade = amount => shades[Math.round(clamp(amount)*120)];
    ctx.lineJoin = 'round';
    for (const face of orderedFaces(points, frame?.faces, frame?.layered)) {
      const ids=face.ids, a=points[ids[0]], b=points[ids[1]], c=points[ids[2]];
      const bx=b[0]-a[0], by=b[1]-a[1], bz=b[2]-a[2];
      const cx=c[0]-a[0], cy=c[1]-a[1], cz=c[2]-a[2];
      let nx=by*cz-bz*cy, ny=bz*cx-bx*cz, nz=bx*cy-by*cx;
      if (Math.abs(nz) < (frame?.layered ? 1e-8 : .035)) continue;
      const front = nz > 0;
      const normalLength=Math.hypot(nx,ny,nz)*(front ? 1 : -1);
      nx/=normalLength; ny/=normalLength; nz/=normalLength;
      const light = clamp(.52 + .55*(-.45*nx-.78*ny+.43*nz) + (front ? .025 : -.07));
      const darkness = mix((1-light)*.93*relief, face.endTone / 120, frame?.endTint ?? 0);
      ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.lineTo(c[0],c[1]); ctx.closePath();
      let fill = shade(darkness);
      if (detail) {
        const grad=ctx.createLinearGradient(a[0],a[1],(b[0]+c[0])/2+.001,(b[1]+c[1])/2);
        grad.addColorStop(0, shade(darkness-.065)); grad.addColorStop(1, shade(darkness+.045)); fill=grad;
      }
      ctx.lineWidth=detail ? .36 : mix(.55, frame?.printStrokeWidth ?? .55, frame?.endTint ?? 0);
      ctx.fillStyle=fill; ctx.strokeStyle=fill;
      ctx.stroke(); ctx.fill();
      if (!surface?.patches.length || rulingAmount<=0) continue;
      // Ink is already gone before the first lifted face. Only the printed stock
      // travels through the mesh. Both sides share the original paper origin.
      const sx=surface.stock.width, sy=surface.stock.height;
      const ux=(bx*face.ax+cx*face.bx)/sx, uy=(by*face.ax+cy*face.bx)/sx;
      const vx=(bx*face.ay+cx*face.by)/sy, vy=(by*face.ay+cy*face.by)/sy;
      const area=Math.abs(ux*vy-uy*vx);
      const ySpacing=area*surface.stepY/Math.max(Math.hypot(ux,uy),1e-8);
      const pitch=surface.grid ? Math.min(ySpacing,area*surface.stepX/Math.max(Math.hypot(vx,vy),1e-8)) : ySpacing;
      const opacity=rulingAmount*(front?1:.45)*ease((pitch*surface.outputDpr-.8)/1.5);
      if (opacity<.004) continue;
      ctx.save();
      ctx.clip();
      ctx.transform(ux,uy,vx,vy,a[0]-ux*sx*face.u-vx*sy*face.v,a[1]-uy*sx*face.u-vy*sy*face.v);
      ctx.globalAlpha=opacity;
      const patch=surface.patches[face.index];
      ctx.drawImage(surface.stock,patch.x,patch.y,patch.w,patch.h,patch.x,patch.y,patch.w,patch.h);
      ctx.restore();
    }
  }
  function bird(ctx, x, y, width, detail=false) {
    const s=width/bounds.width;
    drawMesh(ctx, place(folded,x,y,s,s,s,1),1,null,0,detail);
  }
  function context2D(el) {
    let context;
    try { context=el.getContext('2d'); } catch { /* Canvas can be blocked per element. */ }
    if (!context || context.isContextLost?.()) throw new DOMException('纸面画布不可用','PaperCanvasUnavailable');
    return context;
  }
  function prepareCanvas(el, ratio, rect=el.getBoundingClientRect()) {
    const w=rect.width, h=rect.height;
    el.width=Math.max(1,Math.round(w*ratio)); el.height=Math.max(1,Math.round(h*ratio));
    const ctx=context2D(el);
    ctx.setTransform(el.width/w,0,0,el.height/h,0,0);
    return {ctx,w,h};
  }
  function drawIcon(el) {
    const {ctx,w,h}=prepareCanvas(el, Math.min(devicePixelRatio || 1, 2));
    bird(ctx,w/2,h/2,craneWidth(w,h));
  }
  // This transparent bitmap is both the live HTML underlay and the material
  // wrapped around the mesh. Draw the whole sheet once in CSS-pixel units.
  function drawStock(el, rect=el.getBoundingClientRect(), material=readMaterial(), modelId='crane') {
    const style=stockStyles[el.dataset.ruling];
    if (!style) {
      // The sheet and facets supply the paper colour. Only printed marks use this texture.
      el.width=el.height=1;
      context2D(el);
      return {stock:el, grid:false, material, outputDpr:1, patches:[], stepX:0, stepY:0};
    }
    const {ctx,w,h}=prepareCanvas(el,Math.min(devicePixelRatio || 1,1.5),rect);
    const grid=el.dataset.ruling==='grid';
    const step=style.step, origin=step/2;
    ctx.beginPath();
    for (let y=origin+.5;y<h;y+=step) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
    if (grid) {
      for (let x=origin+.5;x<w;x+=step) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
    }
    ctx.strokeStyle=grid ? material.grid : material.rule; ctx.lineWidth=style.width; ctx.stroke();
    // Only long scores from the source pattern, never triangulation diagonals.
    ctx.beginPath();
    const motion = sectionMotion(modelId);
    const scores = motion ? sectionScores : CraneClip.scores.map(([i,j]) => [uv[i],uv[j]]);
    for (const [[u,v],[u1,v1]] of scores) {
      ctx.moveTo(u*w,v*h); ctx.lineTo(u1*w,v1*h);
    }
    ctx.lineWidth=.65; ctx.strokeStyle=material.score; ctx.stroke();
    ctx.translate(.55,.65); ctx.strokeStyle=material.highlight;
    // Canvas paths capture transforms at construction; offset the highlight
    // in the sheet's coordinates so it projects with the groove.
    ctx.beginPath();
    for (const [[u,v],[u1,v1]] of scores) {
      ctx.moveTo(u*w,v*h); ctx.lineTo(u1*w,v1*h);
    }
    ctx.stroke();
    // Sample just this face's part of the sheet, with a texel gutter for filtering.
    const patches=(motion ? sheetFaces : faces).map(face=>{
      const x=Math.max(0,Math.floor(face.minU*el.width)-1);
      const y=Math.max(0,Math.floor(face.minV*el.height)-1);
      return {x,y,w:Math.min(el.width,Math.ceil(face.maxU*el.width)+1)-x,
        h:Math.min(el.height,Math.ceil(face.maxV*el.height)+1)-y};
    });
    return {stock:el, grid, material, outputDpr:1, patches, stepX:step*el.width/w, stepY:step*el.height/h};
  }
  function poly(ctx, color, pts) {
    ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.closePath(); ctx.fill();
  }
  function line(ctx, x1,y1,x2,y2, color, width=.7) {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
  }
  function castShadow(ctx,x,y,w,h) {
    ctx.save(); ctx.translate(x,y); ctx.scale(w,h);
    const g=ctx.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,'rgba(38,43,78,.17)'); g.addColorStop(.48,'rgba(54,56,81,.09)'); g.addColorStop(1,'rgba(49,52,76,0)');
    ctx.fillStyle=g; ctx.fillRect(-1,-1,2,2); ctx.restore();
  }
  function plotCrane(ctx) {
    ctx.beginPath(); ctx.arc(177,119,90,0,Math.PI*2);
    ctx.fillStyle='#dce7ef58'; ctx.fill(); ctx.strokeStyle='#b6c6d0'; ctx.lineWidth=.65; ctx.stroke();
    ctx.setLineDash([1.2,4.3]); line(ctx,20,120,324,120,'#adbfca'); line(ctx,177,18,177,212,'#adbfca'); ctx.setLineDash([]);
    for (const [x,y] of [[87,119],[267,119],[177,29],[177,209]]) {
      line(ctx,x-2.5,y,x+2.5,y,'#a5aca8'); line(ctx,x,y-2.5,x,y+2.5,'#a5aca8');
    }
    castShadow(ctx,183,179,96,14);
    bird(ctx,170,115,288,true);
    line(ctx,254,81,274,52,'#858d9d'); line(ctx,274,52,291,52,'#858d9d');
    ctx.fillStyle='#6c7384'; ctx.font='italic 11px Georgia'; ctx.fillText('a',294,54);
  }
  function plotRiver(ctx) {
    const sun=ctx.createLinearGradient(0,39,0,151); sun.addColorStop(0,'#a8a5c0'); sun.addColorStop(.72,'#c8cbdc'); sun.addColorStop(1,'#e0e7ee');
    ctx.fillStyle=sun; ctx.beginPath(); ctx.arc(204,95,53,0,Math.PI*2); ctx.fill();
    const shore=[ [17,156],[65,131],[98,135],[164,94],[227,134],[285,105],[323,139],[301,157],[222,170],[138,181],[64,169] ];
    poly(ctx,'#a7bac7',shore);
    poly(ctx,'#bdcbd7',[[17,156],[98,135],[164,94],[138,153],[64,169]]);
    poly(ctx,'#60778a',[[70,163],[132,140],[164,94],[153,148],[222,170],[138,181]]);
    poly(ctx,'#8c9ead',[[164,94],[227,134],[187,154],[153,148]]);
    poly(ctx,'#a6adc1',[[187,154],[285,105],[263,145],[222,170]]);
    poly(ctx,'#748b9a',[[285,105],[323,139],[263,145]]);
    poly(ctx,'#3f5366',[[26,157],[84,154],[124,160],[174,146],[233,150],[301,136],[325,140],[280,157],[180,174],[102,177]]);
    poly(ctx,'#97aebc',[[26,160],[112,175],[204,163],[280,157],[217,169],[112,184]]);
    for (let i=0;i<9;i++) {
      const y=174+i*3.1, x=178+Math.sin(i*4)*7;
      line(ctx,x-25+i*1.8,y,x+26-i*2.1,y,'#91a0b6',i%3===0?1.6:.7);
    }
    line(ctx,22,166,68,166,'#9aadb8'); line(ctx,251,167,301,167,'#96a6b3');
    line(ctx,70,186,130,186,'#aab9c5'); line(ctx,211,191,246,191,'#b5c2cd');
  }
  function drawPlate(el, key) {
    const {ctx,w,h}=prepareCanvas(el, Math.min(devicePixelRatio || 1, 2));
    const s=Math.min(w/340,h/230); ctx.translate((w-340*s)/2,(h-230*s)/2); ctx.scale(s,s);
    const accent='#476377';
    ctx.fillStyle=accent; ctx.font='10px Consolas, monospace'; ctx.fillText(key==='wind'?'FIG. 01':'FIG. 02',9,16);
    line(ctx,58,12,83,12,accent);
    if (key==='wind') plotCrane(ctx); else plotRiver(ctx);
    const swatches=key==='wind'?['#718697','#b0c2d0','#dce7ed']:['#647b8b','#a8a5c0','#cbd8e0'];
    swatches.forEach((col,i)=>{ctx.fillStyle=col;ctx.fillRect(10+i*8,219,6,6);});
    ctx.font='9px Consolas, monospace'; ctx.textAlign='right'; ctx.fillStyle='#5b6f7b';
    ctx.fillText(key==='wind'?'ORIZURU  /  FOLDED PAPER':'RIVERSIDE  /  DUSK',332,225);
  }
  function iconWidth(w,h,id='crane') {
    const motion = sectionMotion(id);
    return motion ? motion.width * 19.5 * Math.min(w/39,h/32) : craneWidth(w,h);
  }
  function fullWidth(w,h,id='crane') {
    const motion = sectionMotion(id);
    return motion ? Math.min(w*.73,h*1.06*motion.width/motion.height) : fitWidth(w*.73,h*1.06);
  }
  function foldShape(rect,state,id='crane') {
    const {fold,scale}=state;
    const motion = sectionMotion(id);
    const u=fullWidth(rect.width, rect.height,id)/(motion?.width ?? bounds.width), q=ease(fold);
    const sx=mix(rect.width/2,u,q)*scale, sy=mix(rect.height/2,u,q)*scale, sz=u*scale;
    const frame=motion ? sectionFrame(motion,fold) : null;
    const points=frame ? frame.points.map(([x,y,z])=>[x*sx,y*sy,z*sz]) :
      place(fold===1 ? folded : project(fold),0,0,sx,sy,sz,q);
    let left=Infinity, right=-Infinity, top=Infinity, bottom=-Infinity;
    for (const [x,y] of points) {
      left=Math.min(left,x); right=Math.max(right,x); top=Math.min(top,y); bottom=Math.max(bottom,y);
    }
    return {points,left,right,top,bottom,uv:frame?.uv ?? uv,faces:frame?.faces ?? faces,
      layered:frame?.layered ?? false, relief:frame?.relief ?? ease(fold/.48), endTint:frame?.endTint ?? 0,
      ruling:frame?.ruling ?? 1, printStrokeWidth:motion ? .045*sx/19.5 : .55};
  }
  function drawFold(ctx, shape, state, surface) {
    drawMesh(ctx,shape.points,state.fold,surface,state.ruling*shape.ruling,false,shape);
  }
  return {drawIcon,drawPlate,drawStock,foldShape,drawFold,craneWidth,iconWidth,fullWidth,ease,mix,
    uv,orderedFaces,readMaterial,drawCrane:bird,context2D};
})();
