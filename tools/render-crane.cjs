// Reprint the two static illustrations from the live geometry and VI tokens.
// Uses the same optional Playwright installation as check-navigation.cjs.
const { chromium } = require("playwright");
const { writeFile } = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

async function run() {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage();
    const sources = new Map([
      ["/tokens.css", ["src/styles/tokens.css", "text/css"]],
      ["/paper.js", ["src/lib/fold/paper.js", "text/javascript"]],
      ["/crane-data.js", ["src/lib/fold/crane-data.js", "text/javascript"]],
    ]);
    await page.route("http://paper.test/**", route => {
      const name = new URL(route.request().url()).pathname;
      if (name === "/") return route.fulfill({ contentType: "text/html", body: '<link rel="stylesheet" href="/tokens.css">' });
      const file = sources.get(name);
      return file ? route.fulfill({ path: path.join(root, file[0]), contentType: file[1] }) : route.abort();
    });
    await page.goto("http://paper.test/");
    const art = await page.evaluate(async () => {
      const { Paper } = await import("/paper.js");
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
      return {
        "crane-icon.png": icon.canvas.toDataURL("image/png"),
        "crane.webp": plate.canvas.toDataURL("image/webp", .96),
      };
    });
    for (const [name, url] of Object.entries(art)) {
      await writeFile(path.join(root, "public/art", name), Buffer.from(url.split(",")[1], "base64"));
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
