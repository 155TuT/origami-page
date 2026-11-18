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

async function checkLayout(page) {
  const layout = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const paper = rect("#content"), header = rect(".site-header"), desk = rect(".desk-backdrop");
    const nav = [...document.querySelectorAll(".site-nav a")].map(link => link.getBoundingClientRect());
    return {
      width: window.innerWidth, sheetWidth: paper.width, sheetLeft: paper.left,
      brand: rect(".wordmark").left - paper.left, menu: nav.at(-1).right - paper.right,
      wordmark: rect(".wordmark i").bottom - rect(".wordmark strong").bottom,
      menuFits: nav.slice(1).every((link, i) => link.left >= nav[i].right),
      settingsFits: rect(".reading-settings").left >= rect(".wordmark").right,
      seam: paper.top - header.bottom, rootY: window.scrollY, deskTop: desk.top,
      deskHeight: desk.height - window.innerHeight,
      bottom: paper.bottom - window.innerHeight,
      trailingSpace: document.querySelector("#content").scrollHeight -
        Math.max(document.querySelector("#content").clientHeight, document.querySelector(".sheet-ink").offsetHeight),
      footer: !!document.querySelector("footer"),
    };
  });
  for (const error of [layout.sheetWidth - layout.width * .6, layout.sheetLeft - layout.width * .2,
    layout.brand, layout.menu, layout.wordmark, layout.seam, layout.rootY, layout.deskTop, layout.deskHeight,
    layout.trailingSpace, layout.bottom]) assert.ok(Math.abs(error) <= 1, JSON.stringify(layout));
  assert.ok(layout.menuFits && layout.settingsFits && !layout.footer, JSON.stringify(layout));
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
  await page.waitForFunction(() => !document.documentElement.dataset.foldPhase);
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

async function run() {
  const browserType = { chrome: chromium, chromium, firefox, webkit }[engine];
  assert.ok(browserType, "choose chrome, chromium, firefox or webkit");
  const browser = await browserType.launch({
    channel: engine === "chrome" ? "chrome" : undefined,
    executablePath: process.env.ORIGAMI_BROWSER_BIN || undefined,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 740 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base.href);
    await page.waitForSelector("html[data-enhanced]", { state: "attached" });
    await page.evaluate(async () => {
      // A rebuilt Site module can be evaluated in the window that ClientRouter retained.
      const entry = [...document.scripts].find(script => script.src.includes("/Site."));
      await import(entry.src + "?navigation-regression");
      window.foldLog = [];
      window.dockChecks = [];
      function recordDock(direction) {
        const sheet = document.querySelector("main[data-fold-paper]");
        const section = sheet.dataset.foldPaper;
        const icon = document.querySelector('[data-fold-dock="' + section + '"]');
        const dock = icon.getBoundingClientRect();
        const position = new DOMMatrix(document.getElementById("shuttle").style.transform);
        const width = document.documentElement.clientWidth;
        const flat = document.querySelector(".fold-flat").style;
        const top = document.querySelector(".site-header").getBoundingClientRect().bottom;
        window.dockChecks.push({
          direction, section,
          reachesDock: Math.abs(position.m41 - dock.left) < 1 && Math.abs(position.m42 - dock.top) < 1,
          centered: Math.abs(parseFloat(flat.width) - width * .6) < 1 && Math.abs(parseFloat(flat.left) - width * .2) < 1,
          fixedFrame: Math.abs(parseFloat(flat.top) - top) < 1 &&
            Math.abs(parseFloat(flat.height) - (innerHeight - top)) < 1,
        });
      }
      document.addEventListener("astro:before-swap", () => recordDock("in"));
      new MutationObserver(() => {
        const phase = document.documentElement.dataset.foldPhase || "idle";
        if (window.foldLog.at(-1)?.phase === phase) return;
        window.foldLog.push({ phase, at: performance.now() });
        if (phase === "opening") recordDock("out");
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-fold-phase"] });
    });
    const initialLength = await page.evaluate(() => history.length);
    assert.equal(await page.locator(".site-nav a > [data-fold-dock]:first-child").count(), 4);
    assert.equal(await page.locator("[data-fold-paper]").count(), 1);
    await checkLayout(page);
    await delayedTurn(page, page.locator(".read-button").first(), false);
    const first = { path: new URL(page.url()).pathname, title: await page.title() };
    await page.locator("[data-settings] summary").click();
    await page.getByRole("switch", { name: "并行取文与收纸" }).check();
    await page.locator("[data-settings] summary").click();
    const next = page.locator(".post-neighbors a").first();
    await next.scrollIntoViewIfNeeded();
    const scroll = await paperTop(page);
    assert.ok(scroll > 0 && await page.evaluate(() => window.scrollY === 0), "only the paper should scroll");
    await delayedTurn(page, next, true);
    const second = { path: new URL(page.url()).pathname, title: await page.title() };
    assert.notEqual(first.path, second.path);
    assert.equal(await paperTop(page), 0, "a newly opened article starts at its top edge");
    const forwardScroll = await page.locator("#content").evaluate(paper => { paper.scrollTop = 187; return paper.scrollTop; });
    assert.ok(forwardScroll > 0);
    assert.equal(await page.evaluate(() => history.length), initialLength + 2);
    await page.evaluate(() => history.back());
    await settled(page, first.path, first.title);
    assert.ok(Math.abs(await paperTop(page) - scroll) <= 2, "back must restore the first paper's reading position");
    await page.evaluate(() => history.forward());
    await settled(page, second.path, second.title);
    assert.ok(Math.abs(await paperTop(page) - forwardScroll) <= 2, "forward must restore the second paper's reading position");
    const checks = await page.evaluate(() => window.dockChecks);
    assert.deepEqual(checks.slice(0, 4).map(entry => entry.section), ["home", "archive", "archive", "archive"]);
    assert.ok(checks.every(entry => entry.centered && entry.reachesDock && entry.fixedFrame), JSON.stringify(checks));
    const reload = await page.reload();
    assert.ok([200, 304].includes(reload.status()), "a refresh must serve or revalidate the article");
    assert.equal(await page.title(), second.title);
    assert.equal(await page.locator("main article h1").count(), 1);
    await page.waitForFunction(top => Math.abs(document.getElementById("content").scrollTop - top) <= 2, forwardScroll);
    const toc = page.locator('.article-aside a[href^="#"]').first();
    const beforeHash = await paperTop(page);
    await toc.click();
    await page.waitForFunction(() => !!location.hash);
    const atHash = await paperTop(page);
    assert.ok(atHash > 0 && Math.abs(atHash - beforeHash) > 2);
    await page.evaluate(() => history.back());
    await page.waitForFunction(top => !location.hash && Math.abs(document.getElementById("content").scrollTop - top) <= 2, beforeHash);
    await page.evaluate(() => history.forward());
    await page.waitForFunction(top => location.hash && Math.abs(document.getElementById("content").scrollTop - top) <= 2, atHash);
    const lastHeading = await page.locator('.article-aside a[href^="#"]').last().getAttribute("href");
    await page.goto(new URL(lastHeading, page.url()).href);
    await page.locator("#content").evaluate(paper => { paper.scrollTop = 110; });
    await page.reload();
    await page.waitForFunction(() => Math.abs(document.getElementById("content").scrollTop - 110) <= 2);
    await page.goto(new URL("tags/", base).href);
    await page.waitForSelector("html[data-enhanced]", { state: "attached" });
    await checkLayout(page);
    assert.ok(await page.locator("#content").evaluate(paper => paper.scrollHeight === paper.clientHeight),
      "a short page must fill the same frame without adding a scrollable tail");
    assert.deepEqual(errors, []);
    console.log(engine, "passed", first.path, second.path);
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
