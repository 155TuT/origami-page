import {Paper} from '../src/lib/fold/paper.js';
import {createRenderStack} from '../src/lib/fold/render-stack.js';

(() => {
  const space=document.querySelector('#sheet-space');
  const overlay=document.querySelector('#motion');
  const gpuCanvas=document.querySelector('#motion-gl');
  const shuttle=document.querySelector('#shuttle');
  let ctx=null;
  try { ctx=overlay.getContext('2d'); } catch { /* A browser policy may disable Canvas. */ }
  let textOnly=!ctx;
  const sheets=Object.fromEntries([...space.querySelectorAll('article')].map(el => [el.id.slice(8),el]));
  const links=Object.fromEntries([...document.querySelectorAll('.page-link')].map(el => [el.dataset.page,el]));
  const pages=Object.keys(links);
  const titles=Object.fromEntries(pages.map(key=>[key,sheets[key].querySelector('h1').textContent.trim().replace(/。$/,'')]));
  const phaseLabel=document.querySelector('#phase-label');
  const announce=document.querySelector('#announcement');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const textures=new Map();
  let prepHandle=0, layoutFrame=0, flatArticle=null;
  let active=pageFromUrl(), wanted=active, carrier=active;
  let speed=1, flight=null, clock=0, direction=1, lastFrame=0, frameId=0;
  let geometry=null, shuttleSource=null, frameGaps=[], drawTimes=[], prepTime=0, focusAfterTurn=false;
  let meshGaps=[], meshDraws=[], previousMesh=null, comparable=false;
  const readingMode=()=>textOnly?'text':reduced.matches?'reduced':'';
  const stack=createRenderStack(gpuCanvas,document.querySelector('#renderer-info'),
    readingMode,()=>!readingMode() && !flight && !document.hidden,
    ()=>{ gpuCanvas.hidden=true; comparable=false; });
  const FOLDED=690, HOLD=750, SMALL=920, DOCK=1160;
  // Resource denial can also occur on a later stock, icon, or resize.
  function withCanvasFallback(fn) {
    return (...args)=>{
      try { return fn(...args); }
      catch (error) {
        if (error.name!=='PaperCanvasUnavailable') throw error;
        enableTextMode();
      }
    };
  }
  const nextFrame=withCanvasFallback(tick), changePage=withCanvasFallback(navigate);
  const refreshLayout=withCanvasFallback(layoutChanged);

  function pageFromUrl() {
    const key=location.hash.slice(1);
    return pages.includes(key) ? key : pages[0];
  }
  function setLabel(value) { if (phaseLabel.textContent!==value) phaseLabel.textContent=value; }
  function markPage(page) {
    document.body.dataset.edition=page;
    for (const [key,article] of Object.entries(sheets)) {
      const on=key===page;
      article.classList.toggle('visible',on); article.inert=!on;
      article.setAttribute('aria-hidden',String(!on));
      links[key].classList.toggle('current',on);
      links[key].classList.toggle('empty',on);
      if (on) links[key].setAttribute('aria-current','page'); else links[key].removeAttribute('aria-current');
    }
    document.querySelector('#margin-page').textContent='PLATE '+String(pages.indexOf(page)+1).padStart(2,'0');
    document.title=titles[page]+' · 折间 Fold Journal';
  }
  function retainPages(first,second) {
    for (const [key,surface] of textures) {
      if (key===first || key===second) continue;
      stack.release(surface);
      for (const canvas of [surface.stock,surface.plate]) {
        if (canvas) canvas.width=canvas.height=1;
      }
      textures.delete(key);
    }
  }
  function pageSurface(key) {
    if (textures.has(key)) return textures.get(key);
    const start=performance.now(), article=sheets[key];
    const plate=article.querySelector('.plate');
    Paper.drawPlate(plate,plate.dataset.plate);
    const surface=Paper.drawStock(article.querySelector('.paper-stock'));
    surface.plate=plate;
    surface.buildMs=performance.now()-start;
    textures.set(key,surface);
    return surface;
  }

  function warmSurfaces() {
    const idle='requestIdleCallback' in window;
    if (idle) cancelIdleCallback(prepHandle); else clearTimeout(prepHandle);
    if (textOnly || flight || reduced.matches || document.hidden || textures.size>=2) return;
    const next=pages[(pages.indexOf(active)+1)%pages.length];
    if (textures.has(next)) return;
    const prepare=withCanvasFallback(()=>{
      if (!textOnly && !flight && !reduced.matches && !document.hidden) pageSurface(next);
    });
    prepHandle=idle ? requestIdleCallback(prepare) : setTimeout(prepare,100);
  }
  function clearFlat() {
    if (!flatArticle) return;
    flatArticle.classList.remove('flat-motion');
    flatArticle.style.removeProperty('transform');
    flatArticle.style.removeProperty('--ink-opacity');
    flatArticle=null;
  }
  function showFlat(key,state) {
    const article=sheets[key];
    if (flatArticle!==article) {
      clearFlat(); flatArticle=article; article.classList.add('flat-motion');
    }
    article.style.transform='scale('+state.scale+')';
    article.style.setProperty('--ink-opacity',state.ink);
  }
  function measureStage() {
    const rect=space.getBoundingClientRect();
    const icons=Object.fromEntries([...new Set([carrier,wanted])].map(key=>[key,links[key].querySelector('canvas').getBoundingClientRect()]));
    geometry={rect,icons,stage:null,dirty:null};
  }
  // Cover the sheet only. Grow once if a paper tip projects past its resting bounds.
  function fitStage(shape,canvas) {
    const {rect,stage}=geometry;
    if (stage && stage.canvas===canvas && shape.left>=stage.l+2 && shape.right<=stage.r-2 &&
        shape.top>=stage.t+2 && shape.bottom<=stage.b-2) return;
    const l=Math.floor(Math.min(-rect.width/2,shape.left)-3), t=Math.floor(Math.min(-rect.height/2,shape.top)-3);
    const r=Math.ceil(Math.max(rect.width/2,shape.right)+3), b=Math.ceil(Math.max(rect.height/2,shape.bottom)+3);
    const left=Math.min(l,stage?.l??l), top=Math.min(t,stage?.t??t);
    const right=Math.max(r,stage?.r??r), bottom=Math.max(b,stage?.b??b);
    const width=right-left, height=bottom-top;
    Object.assign(canvas.style,{left:rect.left+rect.width/2+left+'px',top:rect.top+rect.height/2+top+'px',
      width:width+'px',height:height+'px'});
    const dpr=Math.min(devicePixelRatio || 1,1.5);
    const pw=Math.max(1,Math.round(width*dpr)), ph=Math.max(1,Math.round(height*dpr));
    if (canvas.width!==pw || canvas.height!==ph) { canvas.width=pw; canvas.height=ph; }
    else if (canvas===overlay) { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,pw,ph); }
    const rx=pw/width, ry=ph/height;
    if (canvas===overlay) ctx.setTransform(rx,0,0,ry,-left*rx,-top*ry);
    geometry.stage={l:left,t:top,r:right,b:bottom,dpr:Math.min(rx,ry),canvas};
    geometry.dirty=null;
  }
  function moveIcon(icon,x,y) {
    const source=links[carrier].querySelector('canvas');
    if (source!==shuttleSource) {
      shuttle.width=source.width; shuttle.height=source.height;
      Paper.context2D(shuttle).drawImage(source,0,0);
      shuttle.style.width=icon.width+'px'; shuttle.style.height=icon.height+'px';
      shuttleSource=source;
    }
    shuttle.style.transform='translate3d('+(x-icon.width/2)+'px,'+(y-icon.height/2)+'px,0)';
    shuttle.hidden=false;
  }

  // The crease angle, object scale and navigation translation have independent tracks.
  // Opening walks exactly the same timeline backwards, including both landing poses.
  function poseAt(ms,iconScale) {
    const fold=Paper.ease(ms/FOLDED)*Paper.ease((ms-145)/90);
    const ink=1-Paper.ease((ms-12)/96);
    const firstScale=Paper.mix(1,.35,Paper.ease((ms-60)/565));
    const shrink=Paper.ease((ms-HOLD)/(SMALL-HOLD));
    const scale=Paper.mix(firstScale,iconScale,shrink);
    const dock=Paper.ease((ms-SMALL)/(DOCK-SMALL));
    return {fold,scale,dock,ink,ruling:1-shrink};
  }
  function drawSheet(shape,state,surface) {
    if (stack.active==='webgl2' && stack.gpu) {
      try {
        fitStage(shape,gpuCanvas);
        stack.gpu.draw(shape,state,surface,geometry.stage);
        overlay.style.visibility='hidden'; gpuCanvas.hidden=false;
        return 'webgl2';
      } catch (error) { stack.fail(error.message || 'GPU 绘制失败，已回退'); }
    }
    gpuCanvas.hidden=true; overlay.style.visibility='visible';
    fitStage(shape,overlay);
    const d=geometry.dirty;
    if (d) ctx.clearRect(d.left-2,d.top-2,d.right-d.left+4,d.bottom-d.top+4);
    surface.outputDpr=geometry.stage.dpr;
    Paper.drawFold(ctx,shape,state,surface);
    geometry.dirty=shape;
    return '2d';
  }
  function paint() {
    const {rect,icons}=geometry;
    const icon=icons[carrier], main=Paper.fullWidth(rect.width,rect.height);
    const state=poseAt(clock,Paper.craneWidth(icon.width,icon.height)/main);
    let mesh=null;
    if (state.fold===0) {
      overlay.style.visibility='hidden';
      gpuCanvas.hidden=true;
      shuttle.hidden=true;
      showFlat(carrier,state);
    } else if (clock>=SMALL) {
      clearFlat();
      overlay.style.visibility='hidden';
      gpuCanvas.hidden=true;
      moveIcon(icon,Paper.mix(rect.left+rect.width/2,icon.left+icon.width/2,state.dock),
        Paper.mix(rect.top+rect.height/2,icon.top+icon.height/2,state.dock));
    } else {
      clearFlat();
      shuttle.hidden=true;
      const shape=Paper.foldShape(rect,state);
      mesh=drawSheet(shape,state,textures.get(carrier));
    }
    const label=clock>=SMALL ? (direction>0?'纸鹤归位':'纸鹤离开导航')
      : clock>=FOLDED ? (direction>0?'纸鹤缩小':'纸鹤放大')
      : clock<=145 ? (direction>0?'字迹淡出，露出纸纹':'纸页展平，字迹显现')
      : (direction>0?'纸面沿折痕收起':'纸翼沿折痕展开');
    setLabel(label);
    return mesh;
  }
  function travelling(key) {
    for (const [page,link] of Object.entries(links)) link.classList.toggle('travelling',page===key);
  }
  function reportFrames() {
    if (!frameGaps.length) return;
    const percentile=(arr,p)=>[...arr].sort((a,b)=>a-b)[Math.ceil(arr.length*p)-1];
    const mean=frameGaps.reduce((a,b)=>a+b,0)/frameGaps.length;
    const printMs=[...textures.values()].reduce((sum,item)=>sum+item.buildMs,0);
    const longFrames=frameGaps.filter(ms=>ms>25).length;
    document.querySelector('#metrics').textContent='平均 '+(1000/mean).toFixed(0)+' 帧/秒，P95 帧间隔 '+
      percentile(frameGaps,.95).toFixed(1)+' ms，P95 绘制提交 '+percentile(drawTimes,.95).toFixed(1)+' ms。换页准备 '+
      prepTime.toFixed(1)+' ms，缓存页制纹与插图 '+printMs.toFixed(1)+' ms。采样 '+frameGaps.length+' 个帧间隔，'+longFrames+' 个超过 25 ms。';
    const output=document.querySelector('#mesh-metrics');
    if (meshGaps.length<12) { output.textContent='本次折面采样不足。'; return; }
    const sample={draw:percentile(meshDraws,.95),gap:percentile(meshGaps,.95)};
    const backend=stack.active;
    Object.assign(output.dataset,{backend,draw:sample.draw,gap:sample.gap,count:meshGaps.length,comparable});
    output.textContent='仅折面阶段 · P95 提交 '+sample.draw.toFixed(1)+' ms，帧间隔 '+sample.gap.toFixed(1)+' ms。';
    if (comparable) stack.finish(sample);
  }
  function settle(page,measured) {
    clearFlat();
    if (!textOnly && !textures.has(page)) { retainPages(active,page); pageSurface(page); }
    cancelAnimationFrame(frameId); frameId=0; flight=null; active=carrier=page;
    overlay.hidden=gpuCanvas.hidden=shuttle.hidden=true;
    overlay.width=overlay.height=shuttle.width=shuttle.height=1;
    if (gpuCanvas.width!==1 || gpuCanvas.height!==1) gpuCanvas.width=gpuCanvas.height=1;
    geometry=shuttleSource=null;
    space.classList.remove('in-motion'); space.removeAttribute('aria-busy');
    travelling(null); markPage(page);
    if (measured) reportFrames();
    setLabel(textOnly?'文字阅读模式':reduced.matches?'已启用减少动态效果':'点击导航里的纸鹤换页');
    announce.textContent='已打开'+titles[page];
    if (focusAfterTurn) { links[page].focus({preventScroll:true}); focusAfterTurn=false; }
    warmSurfaces(); stack.warm();
  }
  function tick(now) {
    const delta=lastFrame?now-lastFrame:0;
    if (lastFrame) {
      frameGaps.push(delta);
      clock=Math.max(0,Math.min(DOCK,clock+direction*delta*speed));
    }
    lastFrame=now;
    const start=performance.now(), mesh=paint();
    if (mesh) {
      meshDraws.push(performance.now()-start);
      if (previousMesh===mesh && delta>0) meshGaps.push(delta);
    }
    previousMesh=mesh;
    if (direction>0 && clock===DOCK) {
      // Old crane is at its own icon. Only now can the next icon leave its slot.
      links[carrier].classList.remove('empty');
      carrier=wanted; direction=-1; flight='opening'; travelling(carrier);
      links[carrier].classList.add('empty');
      document.body.dataset.edition=carrier;
      paint();
    } else if (direction<0 && clock===0) {
      drawTimes.push(performance.now()-start);
      settle(carrier,true); return;
    }
    drawTimes.push(performance.now()-start);
    frameId=requestAnimationFrame(nextFrame);
  }
  function navigate(page) {
    wanted=page;
    if (textOnly || reduced.matches || document.hidden) { settle(page,false); return; }
    if (flight) {
      comparable=false;
      if (wanted!==carrier) { retainPages(carrier,wanted); pageSurface(wanted); }
      measureStage();
      direction=wanted===carrier ? -1 : 1;
      flight=direction>0?'closing':'opening';
      return;
    }
    if (page===active) return;
    carrier=active; clock=0; direction=1; lastFrame=0; flight='closing'; frameGaps=[]; drawTimes=[];
    const prepareStart=performance.now();
    meshGaps=[]; meshDraws=[]; previousMesh=null; comparable=true;
    retainPages(active,page);
    const surfaces=[pageSurface(active),pageSurface(page)];
    measureStage();
    const rect=geometry.rect;
    stack.begin([Math.round(rect.width),Math.round(rect.height),devicePixelRatio,speed,
      ...surfaces.map(s=>s.grid?'grid':'ruled').sort()].join('/'));
    paint();
    prepTime=performance.now()-prepareStart;
    space.classList.add('in-motion'); space.setAttribute('aria-busy','true');
    sheets[active].inert=true;
    travelling(active); overlay.hidden=false;
    frameId=requestAnimationFrame(nextFrame);
  }
  function enableTextMode() {
    textOnly=true;
    stack.fail('Canvas 2D 不可用');
    retainPages();
    document.body.classList.add('text-mode');
    settle(wanted,false);
    stack.refresh();
  }
  if (textOnly) {
    enableTextMode();
    addEventListener('hashchange',()=>{
      wanted=pageFromUrl(); settle(wanted,false);
    });
    return;
  }
  document.addEventListener('contextlost',event=>{
    if (!textOnly && event.target.matches?.('#motion,#shuttle,.paper-stock,.plate,.nav-crane')) enableTextMode();
  },true);
  document.querySelectorAll('.turn-link').forEach(link=>link.addEventListener('click',()=>{focusAfterTurn=true;}));
  // A repeated click can target the travelling page while the URL already names it.
  document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && link.hash===location.hash) {
      event.preventDefault(); changePage(pageFromUrl());
    }
  }));
  addEventListener('hashchange',()=>changePage(pageFromUrl()));
  document.querySelectorAll('[data-speed]').forEach(button=>button.addEventListener('click',()=>{
    if (flight) comparable=false;
    speed=Number(button.dataset.speed);
    for (const el of document.querySelectorAll('[data-speed]')) el.setAttribute('aria-pressed',String(el===button));
  }));
  reduced.addEventListener('change',withCanvasFallback(()=>{
    stack.refresh();
    if (reduced.matches || !flight) settle(wanted,false);
  }));
  document.addEventListener('visibilitychange',withCanvasFallback(()=>{
    if (document.hidden && flight) settle(wanted,false); else if (!document.hidden) stack.warm();
  }));
  addEventListener('scroll',()=>{if (flight) measureStage();},{passive:true});
  function layoutChanged() {
    layoutFrame=0;
    if (textOnly) return;
    shuttleSource=null; clearFlat();
    retainPages();
    for (const link of Object.values(links)) Paper.drawIcon(link.querySelector('canvas'));
    if (flight) { comparable=false; pageSurface(carrier); pageSurface(wanted); measureStage(); paint(); }
    else { pageSurface(active); warmSurfaces(); stack.warm(); }
  }
  function queueLayout() {
    if (!layoutFrame) layoutFrame=requestAnimationFrame(refreshLayout);
  }
  if ('ResizeObserver' in window) new ResizeObserver(queueLayout).observe(space);
  addEventListener('resize',queueLayout);
  document.fonts?.ready.then(queueLayout);
  markPage(active); refreshLayout();
  if (reduced.matches && !textOnly) setLabel('已启用减少动态效果');
})();
