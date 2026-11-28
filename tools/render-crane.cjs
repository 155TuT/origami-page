// Reprint the crane illustrations and its visible fold edges. Pass --benchmark to time the line art.
// Uses the same optional Playwright installation as check-navigation.cjs.
const { chromium } = require("playwright");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

async function run() {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const model = JSON.parse(await readFile(path.join(root, "models/crane/poses.fold"), "utf8"));
    const physicalEdges = model.edges_vertices.filter((_, i) => ["B", "M", "V", "C"].includes(model.edges_assignment[i]));
    const page = await browser.newPage();
    const sources = new Map([
      ["/tokens.css", ["src/styles/tokens.css", "text/css"]],
      ["/paper.js", ["src/lib/fold/paper.js", "text/javascript"]],
      ["/section-motion.js", ["src/lib/fold/section-motion.js", "text/javascript"]],
      ["/dock-models.js", ["src/lib/fold/dock-models.js", "text/javascript"]],
      ["/crane-data.js", ["src/lib/fold/crane-data.js", "text/javascript"]],
      ["/fold-outline.mjs", ["tools/fold-outline.mjs", "text/javascript"]],
    ]);
    await page.route("http://paper.test/**", route => {
      const name = new URL(route.request().url()).pathname;
      if (name === "/") return route.fulfill({ contentType: "text/html", body: '<link rel="stylesheet" href="/tokens.css">' });
      const file = sources.get(name);
      return file ? route.fulfill({ path: path.join(root, file[0]), contentType: file[1] }) : route.abort();
    });
    await page.goto("http://paper.test/");
    const { art, outline, timings } = await page.evaluate(async ({ physicalEdges, benchmark }) => {
      const { Paper } = await import("/paper.js");
      const { foldOutlineSVG } = await import("/fold-outline.mjs");
      function canvas(width, height, scale) {
        const element = document.createElement("canvas");
        element.width = width * scale;
        element.height = height * scale;
        const ctx = element.getContext("2d");
        ctx.scale(scale, scale);
        return ctx;
      }
      const icon = canvas(39, 32, 4);
      Paper.drawCrane(icon, 19.5, 16, Paper.craneWidth(39, 32));
      const width = 39, height = 32;
      const stroke = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-outline-stroke"));
      function bake() {
        const scale = Paper.craneWidth(width, height) / Paper.fullWidth(width, height);
        const { points } = Paper.foldShape({ width, height }, { fold: 1, scale });
        return foldOutlineSVG({ width, height, stroke, physicalEdges,
          points: points.map(([x, y]) => [x + width / 2, y + height / 2]),
          faces: Paper.orderedFaces(points).map(face => face.ids) });
      }
      const start = performance.now();
      const outline = bake();
      const timings = { firstBakeMs: performance.now() - start };
      if (benchmark) {
        const summary = times => {
          times.sort((a, b) => a - b);
          return { medianMs: times[Math.floor(times.length / 2)], p95Ms: times[Math.ceil(times.length * .95) - 1] };
        };
        const tile = canvas(width, height, 1), bakeTimes = [], decodeTimes = [];
        const file = new Blob([outline], { type: "image/svg+xml" });
        for (let i = 0; i < 40; i++) {
          const t = performance.now();
          bake();
          bakeTimes.push(performance.now() - t);
          const src = URL.createObjectURL(file);
          const img = new Image(), t2 = performance.now();
          img.src = src;
          await img.decode();
          tile.drawImage(img, 0, 0);
          tile.getImageData(0, 0, 1, 1);
          decodeTimes.push(performance.now() - t2);
          URL.revokeObjectURL(src);
        }
        Object.assign(timings, { samples: bakeTimes.length, bake: summary(bakeTimes), decodeAndDraw: summary(decodeTimes) });
      }
      const plate = canvas(420, 265, 3);
      plate.save();
      plate.translate(210, 201);
      plate.scale(127, 24);
      plate.globalAlpha = .19;
      const shadow = plate.createRadialGradient(0, 0, 0, 0, 0, 1);
      shadow.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue("--crane-shadow").trim());
      shadow.addColorStop(1, "transparent");
      plate.fillStyle = shadow;
      plate.fillRect(-1, -1, 2, 2);
      plate.restore();
      Paper.drawCrane(plate, 210, 126, 388, true);
      return { outline, timings, art: {
        "crane-icon.png": icon.canvas.toDataURL("image/png"),
        "crane.webp": plate.canvas.toDataURL("image/webp", .96),
      } };
    }, { physicalEdges, benchmark: process.argv.includes("--benchmark") });
    for (const [name, url] of Object.entries(art)) {
      await writeFile(path.join(root, "public/art", name), Buffer.from(url.split(",")[1], "base64"));
    }
    await writeFile(path.join(root, "public/art/crane-outline.svg"), outline);
    if (process.argv.includes("--benchmark")) console.log(JSON.stringify({ chrome: browser.version(),
      svgBytes: Buffer.byteLength(outline), faces: model.faces_vertices.length, ...timings }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
