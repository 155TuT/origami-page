// Print every dock from the same final sampled pose that the player displays.
const { chromium } = require("playwright");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

async function renderFolds(ids, { benchmark = false } = {}) {
  const browser = await chromium.launch({
    channel: "chrome", args: ["--disable-accelerated-2d-canvas"],
  });
  try {
    const page = await browser.newPage();
    const files = {
      "/tokens.css": "src/styles/tokens.css",
      "/paper.js": "src/lib/fold/paper.js",
      "/section-motion.js": "src/lib/fold/section-motion.js",
      "/generated/crane-data.js": "src/lib/fold/generated/crane-data.js",
      "/generated/section-clips.js": "src/lib/fold/generated/section-clips.js",
      "/fold-outline.mjs": "scripts/fold-outline.mjs",
    };
    await page.route("http://paper.test/**", route => {
      const name = new URL(route.request().url()).pathname;
      if (name === "/") return route.fulfill({ contentType: "text/html", body: '<link rel="stylesheet" href="/tokens.css">' });
      const file = files[name];
      return file ? route.fulfill({ path: path.join(root, file),
        contentType: name.endsWith(".css") ? "text/css" : "text/javascript" }) : route.abort();
    });
    await page.goto("http://paper.test/");
    for (const id of ids) {
      const file = id === "crane" ? "poses.fold" : "creases.fold";
      const model = JSON.parse(await readFile(path.join(root, "models", id, file), "utf8"));
      const physicalEdges = model.edges_vertices.filter((_, i) => model.edges_assignment[i] !== "F");
      const print = await page.evaluate(printFinalPose, { id, physicalEdges, benchmark });
      const dir = path.join(root, "public/art/folds", id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "solid.png"), Buffer.from(print.solid.split(",")[1], "base64"));
      await writeFile(path.join(dir, "outline.svg"), print.outline);
      if (print.plate) {
        const plates = path.join(root, "public/art/illustrations");
        await mkdir(plates, { recursive: true });
        await writeFile(path.join(plates, "crane.webp"), Buffer.from(print.plate.split(",")[1], "base64"));
      }
      if (benchmark) console.log(JSON.stringify({ id, chrome: browser.version(),
        svgBytes: Buffer.byteLength(print.outline), faces: model.faces_vertices.length, ...print.timings }, null, 2));
    }
  } finally {
    await browser.close();
  }
}

async function printFinalPose({ id, physicalEdges, benchmark }) {
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
  const width = 39, height = 32;
  const stroke = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-outline-stroke"));
  const scale = Paper.iconWidth(width, height, id) / Paper.fullWidth(width, height, id);
  const pose = { fold: 1, scale, ruling: 0 };
  const shape = () => Paper.foldShape({ width, height }, pose, id);
  function bake(frame = shape()) {
    const faces = Paper.orderedFaces(frame.points, frame.faces, frame.layered);
    return foldOutlineSVG({ width, height, stroke, physicalEdges,
      points: frame.points.map(([x, y]) => [x + width / 2, y + height / 2]),
      faces: faces.map(face => face.ids) });
  }
  const start = performance.now();
  const final = shape();
  const outline = bake(final);
  const timings = { firstBakeMs: performance.now() - start };
  const icon = canvas(width, height, 4);
  icon.translate(width / 2, height / 2);
  Paper.drawFold(icon, final, pose, null);
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
  const result = { solid: icon.canvas.toDataURL("image/png"), outline, timings };
  if (id === "crane") {
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
    result.plate = plate.canvas.toDataURL("image/webp", .96);
  }
  return result;
}

module.exports = { renderFolds };
