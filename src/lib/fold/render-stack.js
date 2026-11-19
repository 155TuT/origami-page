export function createRenderStack(canvas,readout,readingMode,canPrepare,onFailure) {
  const param=new URLSearchParams(location.search).get('renderer');
  const preference=['2d','webgl2'].includes(param)?param:'auto';
  let gpu=null, preparing=false, queued=false, failed='', used='2d';
  // An article, a list and the cover can have different visible paper sizes.
  // A return visit can reuse a comparison without retaining any of its canvases.
  const profiles=new Map();
  const newProfile=()=>({decision:'baseline',reference:null,regressions:0});
  let profile=newProfile();
  const needsGPU=()=>preference==='webgl2' || [...profiles.values()].some(p=>p.decision==='trial' || p.decision==='webgl2');
  const name=kind=>kind==='webgl2'?'WebGL2':'Canvas 2D';
  function publish() {
    const reading=readingMode();
    const {decision}=profile;
    readout.dataset.backend=reading?'html':used;
    readout.dataset.decision=failed?'unavailable':preference==='auto'?decision:'manual';
    readout.dataset.ready=String(!!gpu);
    if (reading) {
      readout.dataset.decision=reading==='text'?'unavailable':'reduced';
      readout.textContent=reading==='text'?'HTML 文字阅读模式':'减少动态效果 · 直接显示文章';
      return;
    }
    const reason=failed || (preference!=='auto'?'手动对照':{
      baseline:'等待完整的 2D 基线',trial:gpu?'下次切换对照 WebGL2':'等待 GPU 准备',
      webgl2:'实测采用 WebGL2','2d':'实测保留 Canvas 2D'
    }[decision]);
    readout.textContent='本轮折面 · '+name(used)+' · '+reason;
  }
  function discard() { if (gpu) gpu.dispose(); gpu=null; }
  function fail(reason) {
    if (failed) return;
    failed=reason; used='2d'; discard(); publish(); onFailure();
  }
  function warm() {
    if (preference==='2d' || failed || gpu || queued || preparing || !canPrepare() || !needsGPU()) return;
    queued=true;
    const run=async()=>{
      queued=false;
      if (!canPrepare() || failed || !needsGPU()) return;
      preparing=true;
      try {
        const loadStart=performance.now();
        const {createPaperGPU}=await import('./fold-renderer.js');
        readout.dataset.moduleMs=(performance.now()-loadStart).toFixed(1);
        if (!canPrepare() || failed) return;
        const start=performance.now();
        const result=await createPaperGPU(canvas);
        readout.dataset.setupMs=(performance.now()-start).toFixed(1);
        readout.dataset.contextMs=result.contextMs.toFixed(1);
        if (failed) result.dispose(); else gpu=result;
      } catch (error) { fail(error.message || 'WebGL2 初始化失败'); }
      finally { preparing=false; publish(); }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run,{timeout:700}); else setTimeout(run,60);
  }
  function begin(layout) {
    profile=profiles.get(layout) || newProfile();
    profiles.delete(layout);
    profiles.set(layout,profile);
    if (profiles.size>8) profiles.delete(profiles.keys().next().value);
    used=gpu && (preference==='webgl2' || (preference==='auto' && ['trial','webgl2'].includes(profile.decision)))?'webgl2':'2d';
    publish();
  }
  function finish(sample) {
    if (!sample || preference!=='auto' || failed) return;
    const {reference,decision}=profile;
    if (decision==='baseline' && used==='2d') { profile.reference=sample; profile.decision='trial'; }
    else if (used==='webgl2' && reference) {
      const withinGap=sample.gap<=reference.gap+Math.max(1.5,.12*reference.gap);
      const fasterCPU=sample.draw<=reference.draw-Math.max(.3,.2*reference.draw);
      const fasterFrames=sample.gap<=reference.gap-Math.max(1.5,.12*reference.gap);
      if (decision==='trial') profile.decision=withinGap && (fasterCPU || fasterFrames)?'webgl2':'2d';
      else if (decision==='webgl2') {
        profile.regressions=withinGap?0:profile.regressions+1;
        if (profile.regressions>=2) profile.decision='2d';
      }
      if (!needsGPU()) discard();
    }
    publish(); warm();
  }
  canvas.addEventListener('webglcontextlost',()=>fail('WebGL2 上下文丢失，已回退'));
  publish();
  return {begin,finish,warm,fail,refresh:publish,get active(){return used;},get gpu(){return gpu;},
    release:surface=>gpu?.release(surface)};
}
