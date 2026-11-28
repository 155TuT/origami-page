// Optional authoring tool. Supply Playwright via project dependencies or NODE_PATH.
const {chromium, firefox, webkit}=require('playwright');
const fs=require('node:fs');
const os=require('node:os');
// Historical two-sheet benchmark; the blog routes are exercised separately.
const base=process.env.ORIGAMI_URL || 'http://127.0.0.1:4173/prototype/';
const sixEntryFixture=()=>{
  for(let i=document.querySelectorAll('.page-link').length+1;i<=6;i++) {
    const source=i%2?'wind':'river', key='test'+i;
    const link=document.querySelector('[data-page="'+source+'"]').cloneNode(true);
    link.href='#'+key; link.className='page-link'; link.removeAttribute('aria-current'); link.dataset.page=key;
    link.setAttribute('aria-label','试验入口 '+i); link.querySelector('span').textContent='试验 '+i;
    document.querySelector('.page-nav').append(link);
    const article=document.querySelector('#article-'+source).cloneNode(true);
    article.id='article-'+key; article.classList.remove('visible'); article.inert=true;
    article.setAttribute('aria-hidden','true'); article.querySelector('h1').id='title-'+key;
    article.setAttribute('aria-labelledby','title-'+key);
    for (const el of article.querySelectorAll('.paper-stock,.plate')) el.width=el.height=1;
    document.querySelector('#sheet-space').append(article);
  }
};
async function runProfile(spec) {
  const type={chrome:chromium,edge:chromium,firefox,webkit}[spec.engine];
  const browser=await type.launch({headless:true,...(spec.channel?{channel:spec.channel}:{})});
  try {
    const context=await browser.newContext({viewport:{width:spec.w,height:spec.h},deviceScaleFactor:spec.dpr});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    if(spec.six) await page.route('**/journal.js*',async route=>{
      const upstream=await route.fetch(); const js=await upstream.text();
      await route.fulfill({response:upstream,body:'('+sixEntryFixture.toString()+')();\n'+js});
    });
    if(spec.slow) {
      const cdp=await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:spec.slow});
    }
    const address=new URL(base);
    if (spec.renderer) address.searchParams.set('renderer',spec.renderer);
    await page.goto(address.href);
    await page.evaluate(()=>document.fonts.ready);
    if (spec.renderer==='webgl2') {
      await page.waitForFunction(()=>{const s=document.querySelector('#renderer-info').dataset;
        return s.ready==='true' || s.decision==='unavailable';});
    }
    await page.waitForTimeout(400);
    const info=await page.evaluate(()=>({
      userAgent:navigator.userAgent, view:[innerWidth,innerHeight,devicePixelRatio],
      nativeClock:String(requestAnimationFrame),idle:'requestIdleCallback' in window,
      queries:CSS.supports('container-type','inline-size'), inert:'inert' in HTMLElement.prototype,
      letterSpacing:'letterSpacing' in document.querySelector('canvas').getContext('2d'),
      paper:[document.querySelector('.sheet').offsetWidth,document.querySelector('.sheet').offsetHeight]
    }));
    const meshes=[];
    const keys=await page.locator('.page-link').evaluateAll(links=>links.map(a=>a.dataset.page));
    const turns=[], targets=(spec.six?[1,2,4,5,0]:[1,0,1,0]).map(i=>keys[i]);
    let overlay, sheets;
    for(const key of targets) {
      await page.locator('.page-link[data-page="'+key+'"]').click();
      if(!overlay) {
        const stage=await page.waitForFunction(()=>Array.from(document.querySelectorAll('#motion,#motion-gl'))
          .find(el=>!el.hidden && el.width>1 && getComputedStyle(el).visibility==='visible'),null,{timeout:4000});
        overlay=await stage.evaluate(el=>[el.width,el.height]);
      }
      await page.waitForFunction(k=>document.querySelector('#motion').hidden && document.querySelector('.sheet.visible').id==='article-'+k,key,{timeout:20000});
      turns.push(await page.locator('#metrics').textContent());
      meshes.push(await page.locator('#mesh-metrics').evaluate(el=>({...el.dataset})));
      sheets=await page.locator('.paper-stock').evaluateAll(els=>els.map(el=>[el.width,el.height]));
      if(sheets.filter(([w])=>w>1).length>2) throw Error('Too many full-page stocks');
    }
    if(spec.six) {
      for(const key of [keys[1],keys[4],keys[2],keys[5]]) {
        await page.locator('.page-link[data-page="'+key+'"]').click();
        await page.waitForTimeout(130);
      }
      await page.waitForFunction(k=>document.querySelector('#motion').hidden && document.querySelector('.visible').id==='article-'+k,keys[5]);
    }
    const renderer=await page.locator('#renderer-info').evaluate(el=>({...el.dataset,message:el.textContent}));
    let hardware;
    if (spec.renderer) {
      hardware={};
      if (type===chromium) {
        const session=await browser.newBrowserCDPSession();
        const {gpu}=await session.send('SystemInfo.getInfo');
        await session.detach();
        hardware={devices:gpu.devices.map(d=>d.deviceString),canvas2d:gpu.featureStatus['2d_canvas'],
          rasterization:gpu.featureStatus.rasterization,compositing:gpu.featureStatus.gpu_compositing};
      }
      if (spec.renderer==='webgl2' && renderer.ready==='true') hardware.webgl=await page.evaluate(()=>{
        // Diagnostics only. The site never reads the GPU's identity.
        const gl=document.querySelector('#motion-gl').getContext('webgl2'), ext=gl.getExtension('WEBGL_debug_renderer_info');
        return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';
      });
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('.page-link').nth(1).focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(k=>document.querySelector('.visible').id==='article-'+k && document.querySelector('#motion').hidden,keys[1]);
    await page.goBack(); await page.waitForFunction(()=>document.querySelector('#motion').hidden);
    return {spec,version:browser.version(),info,turns,meshes,renderer,hardware,overlay,sheets,errors};
  } finally {await browser.close();}
}
(async()=>{
  const profiles=[
    {name:'Chrome desk',engine:'chrome',channel:'chrome',w:1366,h:850,dpr:1},
    {name:'Chrome same crane x6',engine:'chrome',channel:'chrome',w:1366,h:850,dpr:1,six:true},
    {name:'Phone 4x',engine:'chrome',channel:'chrome',w:390,h:844,dpr:3,slow:4},
    {name:'Phone 6x',engine:'chrome',channel:'chrome',w:360,h:800,dpr:3,slow:6},
    {name:'Edge desk',engine:'edge',channel:'msedge',w:1366,h:850,dpr:1},
    {name:'Firefox desk',engine:'firefox',w:1366,h:850,dpr:1},
    {name:'WebKit desk',engine:'webkit',w:1366,h:850,dpr:1},
    {name:'WebKit narrow',engine:'webkit',w:390,h:844,dpr:3}
  ];
  const filter=process.argv[2] || 'Chrome desk';
  // ABBA within each viewport. Each entry uses a new process and four actual switches.
  const comparisonProfiles={compare:[profiles[0],profiles[2]],'compare-edge':[profiles[4]],
    'compare-engines':[profiles[5],profiles[7]]}[filter];
  const comparison=comparisonProfiles?.flatMap(p=>['2d','webgl2','webgl2','2d']
    .map(renderer=>({...p,name:p.name+' / '+renderer,renderer})));
  const selected=comparison || (filter==='all'?profiles:profiles.filter(p=>p.name===filter));
  if (!selected.length) throw Error('Choose compare, compare-edge, compare-engines, all or one of: '+profiles.map(p=>p.name).join(', '));
  const data={date:new Date().toISOString(),platform:os.platform(),cpu:os.cpus()[0]?.model,results:[]};
  for(const s of selected) {
    let row;
    try {row=await runProfile(s);} catch(e){row={spec:s,error:String(e)};}
    data.results.push(row);
    if (row.error || row.errors?.length) process.exitCode=1;
    console.error(s.name, row.error || row.turns[0]);
  }
  if (process.argv[3]) fs.writeFileSync(process.argv[3],JSON.stringify(data,null,2)+'\n');
  else console.log(JSON.stringify(data,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
