import { Paper } from "./paper.js";
import { createRenderStack } from "./render-stack.js";

// The two halves follow the original demo's clock in opposite directions.
export const DOCK_MS = 1160;
const FOLDED = 690;
const HOLD = 750;
const SMALL = 920;

function poseAt(ms: number, iconScale: number) {
  const fold = Paper.ease(ms / FOLDED) * Paper.ease((ms - 145) / 90);
  const ink = 1 - Paper.ease((ms - 12) / 96);
  const firstScale = Paper.mix(1, .35, Paper.ease((ms - 60) / 565));
  const shrink = Paper.ease((ms - HOLD) / (SMALL - HOLD));
  return { fold, ink, scale: Paper.mix(firstScale, iconScale, shrink),
    dock: Paper.ease((ms - SMALL) / (DOCK_MS - SMALL)), ruling: 1 - shrink };
}

type Box = { left: number; top: number; width: number; height: number };
type Bounds = { l: number; t: number; r: number; b: number };
type Surface = ReturnType<typeof Paper.drawStock>;
type Shape = ReturnType<typeof Paper.foldShape>;
type Pose = ReturnType<typeof poseAt>;
const p95 = (samples: number[]) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * .95) - 1];

export class FoldPlayer {
  private flat: HTMLElement;
  private mesh: HTMLCanvasElement;
  private meshGL: HTMLCanvasElement;
  private shuttle: HTMLImageElement;
  private info: HTMLOutputElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private stack: ReturnType<typeof createRenderStack>;
  private stocks = new Map<string, Surface>();
  private paper?: HTMLElement;
  private surface?: Surface;
  private box?: Box;
  private dock?: DOMRect;
  private buffer?: { canvas: HTMLCanvasElement; bounds: Bounds };
  private clock = 0;
  private frame = 0;
  private resolve?: () => void;
  private lastFrame = 0;
  private previousMesh = false;
  private gaps: number[] = [];
  private draws: number[] = [];
  private comparable = false;

  constructor(host: HTMLElement) {
    this.flat = host.querySelector(".fold-flat")!;
    this.mesh = host.querySelector("#motion")!;
    this.meshGL = host.querySelector("#motion-gl")!;
    this.shuttle = host.querySelector("#shuttle")!;
    this.info = host.querySelector("#renderer-info")!;
    try { this.ctx = Paper.context2D(this.mesh); } catch { /* HTML is already on screen. */ }
    this.stack = createRenderStack(this.meshGL, this.info,
      () => !this.ctx ? "text" : document.documentElement.dataset.reduce === "true" ? "reduced" : "",
      () => this.allowed && !document.documentElement.dataset.foldPhase,
      () => { this.meshGL.hidden = true; this.comparable = false; });
    host.addEventListener("contextlost", (event) => {
      if (event.target !== this.meshGL) this.textOnly();
    }, true);
    this.stack.warm();
  }

  get allowed() {
    return !!this.ctx && document.documentElement.dataset.reduce !== "true" && !document.hidden;
  }

  private textOnly() {
    this.ctx = null;
    this.stack.fail("画布暂不可用");
    this.reset();
  }

  private clearInk() {
    if (!this.paper) return;
    this.paper.classList.remove("folding-ink");
    this.paper.style.removeProperty("opacity");
    this.paper.style.removeProperty("transform");
  }

  private stock(box: Box, ruling: string) {
    const material = Paper.readMaterial();
    const key = [Math.round(box.width), Math.round(box.height), devicePixelRatio, ruling, material.key].join("/");
    let surface = this.stocks.get(key);
    if (surface) this.stocks.delete(key);
    else {
      if (this.stocks.size >= 2) {
        const oldest = this.stocks.entries().next().value!;
        this.stack.release(oldest[1]);
        oldest[1].stock.width = oldest[1].stock.height = 1;
        this.stocks.delete(oldest[0]);
      }
      const canvas = document.createElement("canvas");
      canvas.dataset.ruling = ruling;
      surface = Paper.drawStock(canvas, box, material);
    }
    this.stocks.set(key, surface);
    if (this.flat.firstChild !== surface.stock) this.flat.replaceChildren(surface.stock);
    return { key, surface };
  }

  private measure(first: boolean) {
    const paper = this.paper;
    if (!paper) return false;
    const anchor = document.querySelector<HTMLElement>(`[data-fold-dock="${CSS.escape(paper.dataset.foldPaper!)}"]`);
    const icon = anchor?.querySelector("img");
    if (!anchor || !icon) return false;
    // The slot stays still while the scrollport and the visible ink scale together.
    const box = paper.closest(".paper-slot")!.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return false;
    const { key, surface } = this.stock(box, paper.dataset.ruling ?? "ruled");
    this.box = box;
    this.surface = surface;
    this.dock = anchor.getBoundingClientRect();
    const src = icon.currentSrc || icon.src;
    if (this.shuttle.src !== src) this.shuttle.src = src;
    this.buffer = undefined;
    Object.assign(this.flat.style, { left: box.left + "px", top: box.top + "px",
      width: box.width + "px", height: box.height + "px" });
    if (first) this.stack.begin(key + "/" + document.documentElement.dataset.foldPhase);
    return true;
  }

  remeasure() {
    if (!this.paper?.isConnected) return;
    this.comparable = false;
    try {
      if (this.measure(false)) this.paint(); else this.reset();
    } catch { this.textOnly(); }
  }

  private fit(canvas: HTMLCanvasElement, shape: Shape) {
    const box = this.box!;
    const cached = this.buffer?.canvas === canvas ? this.buffer.bounds : undefined;
    if (cached && shape.left >= cached.l + 2 && shape.top >= cached.t + 2 &&
        shape.right <= cached.r - 2 && shape.bottom <= cached.b - 2) return cached;
    const l = Math.min(cached?.l ?? Infinity, Math.floor(Math.min(-box.width/2, shape.left) - 3));
    const t = Math.min(cached?.t ?? Infinity, Math.floor(Math.min(-box.height/2, shape.top) - 3));
    const r = Math.max(cached?.r ?? -Infinity, Math.ceil(Math.max(box.width/2, shape.right) + 3));
    const b = Math.max(cached?.b ?? -Infinity, Math.ceil(Math.max(box.height/2, shape.bottom) + 3));
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const bounds = { l, t, r, b };
    const width = r - l, height = b - t;
    Object.assign(canvas.style, { left: box.left + box.width/2 + l + "px", top: box.top + box.height/2 + t + "px",
      width: width + "px", height: height + "px" });
    const pw = Math.max(1, Math.round(width*dpr)), ph = Math.max(1, Math.round(height*dpr));
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    this.buffer = { canvas, bounds };
    return bounds;
  }

  private drawMesh(pose: Pose) {
    const shape = Paper.foldShape(this.box!, pose);
    if (this.stack.active === "webgl2" && this.stack.gpu) {
      try {
        this.stack.gpu.draw(shape, pose, this.surface, this.fit(this.meshGL, shape));
        this.mesh.hidden = true; this.meshGL.hidden = false;
        return;
      } catch { this.stack.fail("WebGL2 绘制失败，回退至 2D"); }
    }
    this.meshGL.hidden = true; this.mesh.hidden = false;
    const b = this.fit(this.mesh, shape);
    const dx = this.mesh.width/(b.r-b.l), dy = this.mesh.height/(b.b-b.t);
    const ctx = this.ctx!;
    ctx.setTransform(dx, 0, 0, dy, -b.l*dx, -b.t*dy);
    ctx.clearRect(b.l, b.t, b.r-b.l, b.b-b.t);
    this.surface!.outputDpr = Math.min(dx,dy);
    Paper.drawFold(ctx, shape, pose, this.surface);
  }

  private paint() {
    const box = this.box!, dock = this.dock!;
    const pose = poseAt(this.clock, Paper.craneWidth(dock.width, dock.height) / Paper.fullWidth(box.width, box.height));
    const flat = pose.fold === 0, small = this.clock >= SMALL;
    this.flat.hidden = !flat;
    this.shuttle.hidden = !small || this.clock === DOCK_MS && document.documentElement.dataset.foldPhase === "docked";
    this.paper?.classList.toggle("folding-ink", flat);
    if (flat || small) { this.mesh.hidden = true; this.meshGL.hidden = true; }
    if (flat) {
      const scale = "scale(" + pose.scale + ")";
      this.flat.style.transform = scale;
      if (this.paper) { this.paper.style.transform = scale; this.paper.style.opacity = String(pose.ink); }
    } else if (small) {
      const x = Paper.mix(box.left + box.width/2, dock.left + dock.width/2, pose.dock);
      const y = Paper.mix(box.top + box.height/2, dock.top + dock.height/2, pose.dock);
      Object.assign(this.shuttle.style, { width:dock.width+"px", height:dock.height+"px",
        transform:"translate3d("+(x-dock.width/2)+"px,"+(y-dock.height/2)+"px,0)" });
    } else this.drawMesh(pose);
    return !flat && !small;
  }

  pause() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resolve?.();
    this.resolve = undefined;
  }

  close() { return this.play(true); }
  open() { return this.play(false); }

  private play(closing: boolean): Promise<void> {
    this.pause();
    if (!this.allowed) { this.reset(); return Promise.resolve(); }
    const next = document.querySelector<HTMLElement>("main[data-fold-paper]");
    if (!next) { this.reset(); return Promise.resolve(); }
    const continuing = next === this.paper;
    this.clearInk();
    this.paper = next;
    if (!continuing) this.clock = closing ? 0 : DOCK_MS;
    this.comparable = closing ? this.clock === 0 : this.clock === DOCK_MS;
    this.gaps = []; this.draws = []; this.previousMesh = false; this.lastFrame = 0;
    document.documentElement.dataset.foldPhase = closing ? "closing" : "opening";
    const main = document.querySelector("main")!;
    main.inert = true;
    main.setAttribute("aria-busy", "true");
    try {
      if (!this.measure(true)) { this.reset(); return Promise.resolve(); }
      this.paint();
    } catch { this.textOnly(); return Promise.resolve(); }
    const target = closing ? DOCK_MS : 0;
    return new Promise<void>(resolve => {
      this.resolve = resolve;
      const tick = (now: number) => {
        const elapsed = this.lastFrame ? now - this.lastFrame : 0;
        this.lastFrame = now;
        this.clock = Math.max(0, Math.min(DOCK_MS, this.clock + (closing ? elapsed : -elapsed)));
        const begin = performance.now();
        try {
          const mesh = this.paint();
          if (mesh) {
            this.draws.push(performance.now() - begin);
            if (this.previousMesh) this.gaps.push(elapsed);
          }
          this.previousMesh = mesh;
        } catch { this.textOnly(); return; }
        if (this.clock !== target) { this.frame = requestAnimationFrame(tick); return; }
        if (this.comparable && this.gaps.length >= 12) this.stack.finish({ gap: p95(this.gaps), draw: p95(this.draws) });
        if (closing) {
          document.documentElement.dataset.foldPhase = "docked";
          this.shuttle.hidden = true;
          this.pause();
        } else this.reset();
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  reset() {
    this.pause();
    this.clearInk();
    this.paper = undefined;
    this.surface = this.box = this.buffer = undefined;
    this.clock = 0;
    this.flat.hidden = this.mesh.hidden = this.meshGL.hidden = this.shuttle.hidden = true;
    this.flat.replaceChildren();
    for (const canvas of [this.mesh, this.meshGL]) {
      if (canvas.width !== 1 || canvas.height !== 1) canvas.width = canvas.height = 1;
    }
    document.querySelector("main")?.removeAttribute("inert");
    document.querySelector("main")?.removeAttribute("aria-busy");
    delete document.documentElement.dataset.foldPhase;
    this.stack.refresh(); this.stack.warm();
  }
}
