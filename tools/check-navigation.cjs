// Run against a production preview with Playwright available, as for bench.cjs.
const assert = require("node:assert/strict");
const { chromium, firefox, webkit } = require("playwright");
const base = new URL(process.env.ORIGAMI_URL || "http://127.0.0.1:4321/");
const engine = process.env.ORIGAMI_BROWSER || "chrome";

async function settled(page, path, title) {
  await page.waitForFunction(({ path, title }) =>
    location.pathname === path && document.title === title &&
    !document.documentElement.dataset.foldPhase && !document.querySelector("main").inert,
    { path, title });
}

const paperTop = page => page.locator("#content").evaluate(paper => paper.scrollTop);

const cachedMasksVisible = page => page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem("fold-journal:desk-texture"));
  const desk = document.querySelector(".desk-backdrop");
  return !!saved && getComputedStyle(desk, "::before").maskImage.includes(saved.strong) &&
    getComputedStyle(desk, "::after").maskImage.includes(saved.lite);
});

async function checkTextureCache(page) {
  await page.addInitScript(() => {
    window.tileEncodes = 0;
    const encode = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      if (this.width === 384 && this.height === 384) window.tileEncodes++;
      return encode.apply(this, args);
    };
  });
  const files = [];
  const track = request => { if (/\/fiber-(strong|lite)[.]/.test(request.url())) files.push(request.url()); };
  page.on("request", track);
  await page.goto(base.href);
  assert.ok(await cachedMasksVisible(page), "a cold visit stores and displays both generated masks");
  assert.equal(await page.evaluate(() => window.tileEncodes), 2);
  await page.reload();
  assert.ok(await cachedMasksVisible(page), "a reload must use the stored masks");
  assert.equal(await page.evaluate(() => window.tileEncodes), 0, "a warm reload must skip the generator");
  assert.deepEqual(files, [], "storage-backed visits must not request the fallback images");
  page.off("request", track);
}

async function checkLayout(page) {
  const layout = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const sheet = document.querySelector("#content");
    const originalTop = sheet.scrollTop;
    sheet.scrollTop = 0;
    const paper = rect("#content"), header = rect(".site-header"), desk = rect(".desk-backdrop");
    const content = rect(".sheet-content");
    const inset = content.left - paper.left;
    const nav = [...document.querySelectorAll(".site-nav a")].map(link => link.getBoundingClientRect());
    const brand = rect(".wordmark");
    const tools = rect(".header-tools");
    const stacked = nav[0].top >= brand.bottom;
    const footer = sheet.querySelector("footer");
    sheet.scrollTop = sheet.scrollHeight / 2;
    const ink = sheet.querySelector(".sheet-ink");
    const hitInk = y => ink.contains(document.elementFromPoint(paper.left + paper.width / 2, y));
    const fullScrollport = sheet.clientTop === 0 && Math.abs(sheet.clientHeight - paper.height) <= 1 &&
      hitInk(paper.top + 1) && hitInk(paper.bottom - 1);
    sheet.scrollTop = sheet.scrollHeight;
    const bottomInset = paper.bottom - footer.getBoundingClientRect().bottom;
    const footerLinks = [...footer.querySelectorAll("nav a")];
    const linkRects = footerLinks.map(link => link.getBoundingClientRect());
    const filings = rect(".filings");
    const footerText = footerLinks.map(link => link.textContent.trim());
    const footerRow = linkRects.length === 3 && linkRects.every(link => Math.abs(link.top - linkRects[0].top) <= 1)
      && Math.abs(linkRects[0].left - content.left) <= 1;
    const desktopFilings = window.innerWidth < 1100 || (Math.abs(filings.top - linkRects[0].top) <= 1
      && Math.abs(filings.right - content.right) <= 1);
    const fixed = rect(".site-header").bottom === header.bottom && rect(".desk-backdrop").top === desk.top;
    sheet.scrollTop = originalTop;
    return {
      path: location.pathname, width: window.innerWidth, sheetWidth: paper.width, sheetLeft: paper.left,
      brand: brand.left - paper.left,
      menu: stacked ? (nav[0].left + nav.at(-1).right - window.innerWidth) / 2 : nav.at(-1).right - paper.right,
      wordmark: rect(".wordmark i").bottom - rect(".wordmark strong").bottom,
      menuFits: nav[0].left >= 0 && nav.at(-1).right <= window.innerWidth &&
        nav.slice(1).every((link, i) => link.left >= nav[i].right),
      toolGap: tools.left - brand.right,
      settingsFits: tools.left >= brand.right && (stacked || tools.right <= nav[0].left),
      seam: paper.top - header.bottom, rootY: window.scrollY, deskTop: desk.top,
      deskHeight: desk.height - window.innerHeight,
      bottom: paper.bottom - window.innerHeight,
      inset, topInset: content.top - paper.top, rightInset: paper.right - content.right, bottomInset,
      fullScrollport, fixed, overflowX: sheet.scrollWidth - sheet.clientWidth,
      footerRow, desktopFilings, footerText,
      footer: document.querySelectorAll("footer").length === 1 && footer.textContent.includes("闽ICP备")
        && footer.textContent.includes("闽公网安备"),
    };
  });
  for (const error of [layout.sheetWidth - layout.width * .6, layout.sheetLeft - layout.width * .2,
    layout.brand, layout.menu, layout.wordmark, layout.seam, layout.rootY, layout.deskTop, layout.deskHeight,
    layout.bottom, layout.topInset - layout.inset, layout.rightInset - layout.inset,
    layout.bottomInset - layout.inset, layout.overflowX]) assert.ok(Math.abs(error) <= 1, JSON.stringify(layout));
  assert.ok(layout.inset >= 10 && layout.menuFits && layout.settingsFits && layout.footer &&
    layout.fullScrollport && layout.fixed && layout.footerRow && layout.desktopFilings, JSON.stringify(layout));
  assert.deepEqual(layout.footerText.slice(0, 2), ["友链", "RSS"]);
  assert.match(layout.footerText[2], /^©\d{4} 折间$/u);
}

async function delayedTurn(page, link, parallel) {
  const url = new URL(await link.getAttribute("href"), base);
  const oldTitle = await page.title();
  let release, requested, requests = 0;
  const gate = new Promise(done => { release = done; });
  const started = new Promise(done => { requested = done; });
  const handler = async route => {
    requests++;
    requested();
    await gate;
    await route.continue();
  };
  await page.route(url.href, handler);
  await page.evaluate(() => { window.foldLog.length = 0; });
  try {
    await link.click();
    await Promise.race([started, page.waitForTimeout(4000)]);
    assert.equal(requests, 1, "one navigation must start one target document request");
    if (parallel) {
      await page.waitForFunction(() => document.documentElement.dataset.foldPhase === "docked");
    } else {
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => window.foldLog.length), 0, "serial mode must keep the old page readable while loading");
    }
    assert.equal(await page.title(), oldTitle);
  } finally {
    release();
  }
  await page.waitForURL(url.href);
  await page.waitForFunction(() => window.foldLog.at(-1)?.phase === "idle" && !document.documentElement.dataset.foldPhase);
  await page.unroute(url.href, handler);
  assert.equal(requests, 1);
  const log = await page.evaluate(() => window.foldLog);
  assert.deepEqual(log.map(entry => entry.phase), ["closing", "docked", "opening", "idle"]);
  const time = phase => log.find(entry => entry.phase === phase)?.at;
  const closing = Math.round(time("docked") - time("closing"));
  const opening = Math.round(time("idle") - time("opening"));
  assert.ok(closing >= 1140 && opening >= 1140, "both full animation halves must play: " + JSON.stringify(log));
  console.log((parallel ? "parallel" : "serial") + " close/open (ms)", closing, opening);
}

async function directTurn(page, link) {
  const url = new URL(await link.getAttribute("href"), base);
  await page.evaluate(() => { window.foldLog.length = 0; });
  await link.click();
  await page.waitForURL(url.href);
  await page.waitForFunction(() => !document.documentElement.dataset.foldPhase);
  assert.deepEqual(await page.evaluate(() => window.foldLog), [], "direct navigation should never start a fold");
}

async function checkDocks(page, active, current) {
  const docks = await page.locator(".site-nav [data-fold-dock]").evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.foldDock, current: node.closest("a").getAttribute("aria-current"),
    solid: getComputedStyle(node.querySelector("[data-fold-solid]")).visibility,
    loaded: node.querySelector("[data-fold-solid]").naturalWidth > 0,
    outline: getComputedStyle(node, "::before").maskImage,
  })));
  assert.deepEqual(docks.map(dock => dock.id), ["home", "works", "articles", "albums", "about"]);
  for (const dock of docks) {
    assert.equal(dock.current, dock.id === active ? current : null);
    assert.equal(dock.solid, dock.id === active ? "hidden" : "visible");
    assert.ok(dock.loaded, "the navigation print must load for " + dock.id);
    assert.notEqual(dock.outline, "none", "the line drawing must remain underneath every print");
  }
}

async function observeMotion(page) {
  await page.evaluate(async () => {
    // A rebuilt Site module can be evaluated in the window that ClientRouter retained.
    if (window.foldLog) return;
    const entry = [...document.scripts].find(script => script.src.includes("/Site."));
    await import(entry.src + "?navigation-regression");
    window.foldLog = [];
    window.dockChecks = [];
    function recordDock(direction) {
      const sheet = document.querySelector("main[data-fold-paper]");
      const section = sheet.dataset.foldPaper;
      const icon = document.querySelector('[data-fold-dock="' + section + '"]');
      const dock = icon.getBoundingClientRect();
      const shuttle = document.getElementById("shuttle");
      const position = new DOMMatrix(shuttle.style.transform);
      const print = icon.querySelector("[data-fold-solid]");
      const width = document.documentElement.clientWidth;
      const flat = document.querySelector(".fold-flat").style;
      const top = document.querySelector(".site-header").getBoundingClientRect().bottom;
      window.dockChecks.push({
        direction, section,
        reachesDock: Math.abs(position.m41 - dock.left) < 1 && Math.abs(position.m42 - dock.top) < 1,
        samePrint: shuttle.hidden === (direction === "in") && shuttle.src === print.src &&
          Math.abs(parseFloat(shuttle.style.width) - dock.width) < 1 &&
          Math.abs(parseFloat(shuttle.style.height) - dock.height) < 1 &&
          getComputedStyle(icon, "::before").maskImage !== "none" &&
          getComputedStyle(print).visibility === (direction === "in" ? "visible" : "hidden"),
        centered: Math.abs(parseFloat(flat.width) - width * .6) < 1 && Math.abs(parseFloat(flat.left) - width * .2) < 1,
        fixedFrame: Math.abs(parseFloat(flat.top) - top) < 1 &&
          Math.abs(parseFloat(flat.height) - (innerHeight - top)) < 1,
      });
    }
    document.addEventListener("astro:before-swap", () => {
      if (document.documentElement.dataset.foldPhase === "docked") recordDock("in");
    });
    new MutationObserver(() => {
      const phase = document.documentElement.dataset.foldPhase || "idle";
      if (window.foldLog.at(-1)?.phase === phase) return;
      window.foldLog.push({ phase, at: performance.now() });
      if (phase === "opening") recordDock("out");
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-fold-phase"] });
  });
}

const project = "works/fold-journal/";

function linkTo(page, path, scope) {
  return page.locator(scope).locator(`a[href="${new URL(path, base).pathname}"]`).first();
}

async function setting(page, name, checked) {
  const toggle = page.locator("[data-settings] summary");
  await toggle.click();
  await page.locator(`[data-setting="${name}"]`).setChecked(checked);
  await toggle.click();
}

async function checkHandoff(page, from, to, path, parallel) {
  await page.evaluate(() => { window.dockChecks.length = 0; });
  await delayedTurn(page, linkTo(page, path, ".site-nav"), parallel);
  await checkDockEvidence(page, from, to);
}

async function checkDockEvidence(page, from, to) {
  const checks = await page.evaluate(() => window.dockChecks);
  assert.deepEqual(checks.map(check => [check.direction, check.section]), [["in", from], ["out", to]]);
  assert.ok(checks.every(check => check.centered && check.reachesDock && check.fixedFrame && check.samePrint),
    JSON.stringify(checks));
  await checkDocks(page, to, "page");
}

async function checkHistoryAndAnchors(page) {
  const detail = { path: new URL(page.url()).pathname, title: await page.title() };
  const start = await page.locator("#content").evaluate(paper => { paper.scrollTop = 187; return paper.scrollTop; });
  assert.ok(start > 0 && await page.evaluate(() => window.scrollY === 0));
  const before = await page.evaluate(() => history.length);
  await directTurn(page, linkTo(page, "works/", ".site-nav"));
  const index = { path: new URL(page.url()).pathname, title: await page.title() };
  assert.equal(await page.evaluate(() => history.length), before + 1);
  assert.equal(await paperTop(page), 0);
  await page.evaluate(() => history.back());
  await settled(page, detail.path, detail.title);
  await page.waitForFunction(top => Math.abs(document.getElementById("content").scrollTop - top) <= 2, start);
  await page.evaluate(() => history.forward());
  await settled(page, index.path, index.title);
  assert.deepEqual(await page.evaluate(() => window.foldLog), [], "same-section history must remain direct");
  await directTurn(page, linkTo(page, project, ".sheet-content"));
  const reloadTop = await page.locator("#content").evaluate(paper => { paper.scrollTop = 110; return paper.scrollTop; });
  const reload = await page.reload();
  assert.ok([200, 304].includes(reload.status()), "refresh must serve the project detail");
  await page.waitForFunction(top => Math.abs(document.getElementById("content").scrollTop - top) <= 2, reloadTop);
  await observeMotion(page);
  const anchors = page.locator('.sheet-content a[href^="#"]:not([href="#content"])');
  const anchor = anchors.last();
  await anchor.scrollIntoViewIfNeeded();
  const beforeHash = await paperTop(page);
  const target = await anchor.getAttribute("href");
  await anchor.click();
  await page.waitForFunction(hash => decodeURIComponent(location.hash) === decodeURIComponent(hash), target);
  const atHash = await paperTop(page);
  assert.ok(atHash > 0);
  await page.evaluate(() => history.back());
  await page.waitForFunction(top => !location.hash && Math.abs(document.getElementById("content").scrollTop - top) <= 2, beforeHash);
  await page.evaluate(() => history.forward());
  await page.waitForFunction(top => location.hash && Math.abs(document.getElementById("content").scrollTop - top) <= 2, atHash);
  await page.locator("#content").evaluate(paper => { paper.scrollTop = 110; });
  await page.reload();
  await page.waitForFunction(() => location.hash && Math.abs(document.getElementById("content").scrollTop - 110) <= 2);
  await observeMotion(page);
}

async function checkAuxiliaryPages(page) {
  const tagPrefix = new URL("tags/", base).pathname;
  const projectTag = await page.locator(".sheet-content a").evaluateAll((links, prefix) =>
    links.find(link => link.pathname.startsWith(prefix) && link.pathname !== prefix)?.getAttribute("href"), tagPrefix);
  assert.ok(projectTag, "the public project must contribute a tag");
  await directTurn(page, linkTo(page, "works/", ".site-nav"));
  await directTurn(page, linkTo(page, "tags/", ".sheet-content"));
  await checkDocks(page);
  await directTurn(page, page.locator(`.sheet-content a[href="${projectTag}"]`).first());
  await checkDocks(page);
  await directTurn(page, linkTo(page, project, ".sheet-content"));
  await checkDocks(page, "works", "location");
  await directTurn(page, linkTo(page, "friends/", ".paper-footer"));
  await checkDocks(page);
  await directTurn(page, linkTo(page, project, ".paper-footer"));
  await checkDocks(page, "works", "location");
  const search = linkTo(page, "search/", ".site-header");
  await search.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(new URL("search/", base).href);
  await page.waitForFunction(() => document.activeElement === document.querySelector("main h1"));
  await checkDocks(page);
  await page.locator('input[name="q"]').fill("折间");
  await page.locator('input[name="q"]').press("Enter");
  await linkTo(page, project, ".sheet-content").waitFor({state: "visible"});
}

async function checkPublicBoundary(page) {
  const feed = await page.request.get(new URL("feed.xml", base).href);
  assert.equal(feed.status(), 200);
  const items = await page.evaluate(source => {
    const xml = new DOMParser().parseFromString(source, "application/xml");
    return [...xml.querySelectorAll("rss > channel > item > link")].map(link => new URL(link.textContent).pathname);
  }, await feed.text());
  assert.ok(items.includes(new URL(project, base).pathname));
  assert.ok(!items.some(path => path.includes("/draft/")));
  for (const privatePath of ["archives/draft/", "archives/draft/wind-in-the-folds/", "archives/wind-in-the-folds/",
    "posts/wind-in-the-folds/", "archives/categories/折纸手记/", "categories/折纸手记/"]) {
    assert.equal((await page.request.get(new URL(privatePath, base).href)).status(), 404, privatePath);
  }
}

async function run() {
  const browserType = { chrome: chromium, edge: chromium, chromium, firefox, webkit }[engine];
  assert.ok(browserType, "choose chrome, edge, chromium, firefox or webkit");
  const browser = await browserType.launch({
    channel: { chrome: "chrome", edge: "msedge" }[engine],
    ignoreDefaultArgs: ["--hide-scrollbars"],
    executablePath: process.env.ORIGAMI_BROWSER_BIN || undefined,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 740 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await checkTextureCache(page);
    await page.waitForSelector("html[data-enhanced]", { state: "attached" });
    await observeMotion(page);
    await checkDocks(page, "home", "page");
    await checkLayout(page);
    const backdrop = await page.locator(".desk-backdrop").elementHandle();
    await checkHandoff(page, "home", "works", "works/", false);
    await setting(page, "parallel", true);
    await checkHandoff(page, "works", "articles", "archives/", true);
    await checkHandoff(page, "articles", "albums", "albums/", true);
    await checkHandoff(page, "albums", "about", "about/", true);
    await checkHandoff(page, "about", "home", "", true);
    for (const [method, from, to] of [["back", "home", "about"], ["forward", "about", "home"]]) {
      await page.evaluate(action => {
        window.dockChecks.length = 0;
        window.foldLog.length = 0;
        history[action]();
      }, method);
      await page.waitForFunction(() => window.foldLog.at(-1)?.phase === "idle");
      await checkDockEvidence(page, from, to);
    }
    assert.ok(await backdrop.evaluate(node => node === document.querySelector(".desk-backdrop")));
    assert.ok(await cachedMasksVisible(page));
    assert.equal(await page.evaluate(() => window.tileEncodes), 0);
    await setting(page, "reduce", true);
    await directTurn(page, linkTo(page, "works/", ".site-nav"));
    await setting(page, "reduce", false);
    await directTurn(page, linkTo(page, project, ".sheet-content"));
    await checkDocks(page, "works", "location");
    await page.setViewportSize({ width: 1000, height: 600 });
    await checkHistoryAndAnchors(page);
    await checkAuxiliaryPages(page);
    await checkPublicBoundary(page);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      for (const dark of [false, true]) {
        await setting(page, "theme", dark);
        for (const path of ["", project, "404.html"]) {
          await page.goto(new URL(path, base).href);
          await page.waitForSelector("html[data-enhanced]", { state: "attached" });
          assert.equal(await page.locator("html").getAttribute("data-theme"), dark ? "dark" : "light");
          await checkLayout(page);
          if (path === "404.html") {
            await checkDocks(page);
            if (viewport.width === 1440) assert.equal(await page.locator("#content")
              .evaluate(paper => paper.scrollHeight - paper.clientHeight), 0, "a short page must not have a scrollable tail");
          }
        }
      }
    }
    await page.goto(new URL("works/", base).href);
    await observeMotion(page);
    await checkHandoff(page, "works", "albums", "albums/", true);
    const staticPage = await browser.newPage({ javaScriptEnabled: false });
    await staticPage.goto(base.href);
    await linkTo(staticPage, "works/", ".site-nav").click();
    await linkTo(staticPage, project, ".sheet-content").click();
    await staticPage.waitForURL(new URL(project, base).href);
    assert.ok(await staticPage.locator("main h1").isVisible(), "the work must be readable without scripts");
    await checkDocks(staticPage, "works", "location");
    await staticPage.close();
    assert.deepEqual(errors, []);
    console.log(engine, "passed five fold docks, direct routes, accessibility, history, themes and draft visibility");
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
