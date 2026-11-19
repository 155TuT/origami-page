// Runs as a classic script in the document head. The print tool uses the same recipe.
(() => {
  const size = 384;
  // Bump for changes to mask geometry or encoding. Theme pigments live in CSS.
  const version = 1;

  function randomStream(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let bits = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      bits ^= bits + Math.imul(bits ^ (bits >>> 7), 61 | bits);
      return ((bits ^ (bits >>> 14)) >>> 0) / 0x100000000;
    };
  }

  const noise = random => (random() + random() + random() - 1.5) * 2;

  function addPulp(field, cells, weight, random) {
    const grid = Float32Array.from({ length: cells * cells }, () => noise(random));
    const blend = Array.from({ length: size }, (_, i) => {
      const position = i * cells / size;
      const low = Math.floor(position);
      const t = position - low;
      return [low, (low + 1) % cells, t * t * (3 - 2 * t)];
    });
    for (let y = 0; y < size; y++) {
      const [top, bottom, ty] = blend[y];
      for (let x = 0; x < size; x++) {
        const [left, right, tx] = blend[x];
        const a = grid[top * cells + left] * (1 - tx) + grid[top * cells + right] * tx;
        const b = grid[bottom * cells + left] * (1 - tx) + grid[bottom * cells + right] * tx;
        field[y * size + x] += (a * (1 - ty) + b * ty) * weight;
      }
    }
  }

  function addStrands(alpha, random, count, meanLength, strength) {
    for (let i = 0; i < count; i++) {
      const cx = random() * size, cy = random() * size;
      const length = 1.2 + meanLength * Math.min(5, -Math.log(1 - random()));
      const angle = random() * Math.PI * 2;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const bend = length * (random() - .5) * .38;
      const radius = .28 + random() * .4;
      const ink = (.125 + random() * .385) * strength;
      const reachX = Math.abs(dx) * length / 2 + Math.abs(dy * bend) + 2;
      const reachY = Math.abs(dy) * length / 2 + Math.abs(dx * bend) + 2;
      for (let y = Math.floor(cy - reachY); y <= cy + reachY; y++) {
        for (let x = Math.floor(cx - reachX); x <= cx + reachX; x++) {
          const px = x + .5 - cx, py = y + .5 - cy;
          const along = px * dx + py * dy;
          const t = Math.max(0, Math.min(1, along / length + .5));
          const arch = 4 * t * (1 - t);
          const across = py * dx - px * dy - bend * arch;
          const distance = Math.hypot(across, along - (t - .5) * length);
          const coverage = Math.max(0, Math.min(1, .5 + radius * (.65 + .35 * arch) - distance));
          // A strand crossing one tile edge continues on the opposite side.
          const index = ((y + size) % size) * size + (x + size) % size;
          alpha[index] += (255 - alpha[index]) * coverage * ink;
        }
      }
    }
  }

  function generateMasks({ seed = 73421, strongCount = 850 } = {}) {
    const random = randomStream(seed);
    const pulp = new Float32Array(size * size);
    addPulp(pulp, 6, .14, random);
    addPulp(pulp, 24, .25, random);
    addPulp(pulp, 78, .58, random);
    const strong = new Uint8ClampedArray(pulp.length);
    const lite = new Uint8ClampedArray(pulp.length);
    for (let i = 0; i < pulp.length; i++) {
      const grain = pulp[i] + .76 * noise(random);
      strong[i] = (-grain - .45) * .065 * 255;
      lite[i] = grain * .11 * 255;
    }
    addStrands(strong, randomStream(seed + 1), strongCount, 3.1, .65);
    addStrands(lite, randomStream(seed + 2), 1570, 4.2, .72);
    for (const mask of [strong, lite]) {
      for (let i = 0; i < mask.length; i++) mask[i] = Math.round(mask[i] * 20 / 255) * 255 / 20;
    }
    return { size, strong, lite };
  }

  if (typeof document === "undefined") {
    module.exports = { generateMasks };
    return;
  }

  const style = document.getElementById("desk-texture");
  const sheet = style?.sheet;
  if (!sheet || (style.dataset.version === String(version) && sheet.cssRules.length)) return;

  const key = "fold-journal:desk-texture";
  function isMask(data) {
    return typeof data === "string" && data.length < 1024 * 1024 &&
      /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]+=*$/u.test(data) &&
      atob(data.slice(-16)).endsWith("IEND\xae\x42\x60\x82");
  }
  function readRecord(raw) {
    if (!raw) return;
    const record = JSON.parse(raw);
    if (record?.version === version && isMask(record.strong) && isMask(record.lite)) return record;
  }
  function encodeMasks() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Paper texture canvas unavailable");
    const { strong, lite } = generateMasks();
    const pixels = ctx.createImageData(size, size);
    function png(alpha) {
      for (let i = 0; i < alpha.length; i++) pixels.data[4 * i + 3] = alpha[i];
      ctx.putImageData(pixels, 0, 0);
      const data = canvas.toDataURL("image/png");
      if (!isMask(data)) throw new Error("Paper mask encoding failed");
      return data;
    }
    return { version, strong: png(strong), lite: png(lite) };
  }

  const stores = [];
  let record;
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const store = window[name];
      const raw = store.getItem(key);
      stores.push(store);
      record = readRecord(raw);
      if (record) break;
    } catch { /* A blocked store or a damaged record can be skipped. */ }
  }
  if (!record) {
    if (!stores.length) return; // CSS supplies the printed version of the same tile.
    try { record = encodeMasks(); } catch { return; }
    const raw = JSON.stringify(record);
    for (const store of stores) {
      try { store.setItem(key, raw); break; } catch { /* Try the tab cache if the origin quota is full. */ }
    }
  }
  // This stylesheet survives Astro swaps and is populated before the body is parsed.
  const rule = sheet.cssRules[0] || sheet.cssRules[sheet.insertRule(":root {}")];
  rule.style.setProperty("--desk-strong-mask", "url(" + record.strong + ")");
  rule.style.setProperty("--desk-lite-mask", "url(" + record.lite + ")");
  style.dataset.version = String(version);
})();
