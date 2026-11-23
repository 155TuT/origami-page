import type { FoldPlayer } from "../lib/fold/player";
import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import { installPaperScroll } from "./paper-scroll";
import { sectionForPath } from "../lib/sections";

type Setting = "theme" | "reduce" | "parallel";
type Navigation = {
  event: TransitionBeforePreparationEvent;
  fold: boolean;
  keyboard: boolean;
  swapping: boolean;
  swapFinished?: Promise<void>;
};

function installNavigation() {
  const root = document.documentElement;
  const settings: Setting[] = ["theme", "reduce", "parallel"];
  const paperScroll = installPaperScroll();
  let player: FoldPlayer | undefined;
  let rendererModule: Promise<typeof import("../lib/fold/player") | undefined> | undefined;
  let current: Navigation | undefined;
  let keyboard = false;

  function updateControls() {
    for (const input of document.querySelectorAll<HTMLInputElement>("input[data-setting]")) {
      const name = input.dataset.setting as Setting;
      input.checked = root.dataset[name] === (name === "theme" ? "dark" : "true");
    }
    const headerColor = getComputedStyle(root).getPropertyValue("--base").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", headerColor);
  }

  function skipFold() {
    if (current) current.fold = false;
    player?.reset();
  }

  document.addEventListener("keydown", event => {
    keyboard = true;
    if (event.key === "Escape") {
      const open = document.querySelector<HTMLDetailsElement>("[data-settings][open]");
      if (open) { open.open = false; open.querySelector("summary")?.focus(); }
    }
  });
  document.addEventListener("pointerdown", event => {
    keyboard = false;
    const open = document.querySelector<HTMLDetailsElement>("[data-settings][open]");
    if (open && !open.contains(event.target as Node)) open.open = false;
  });

  document.addEventListener("change", event => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const key = event.target.dataset.setting as Setting;
    if (!settings.includes(key)) return;
    const value = key === "theme" ? (event.target.checked ? "dark" : "light") : String(event.target.checked);
    root.dataset[key] = value;
    try { localStorage.setItem("fold-journal:" + key, value); } catch { /* Applies for this visit. */ }
    if (key === "reduce" && event.target.checked) skipFold();
    if (key === "theme") player?.remeasure();
    updateControls();
  });

  document.addEventListener("astro:before-preparation", event => {
    const fromSection = document.querySelector<HTMLElement>("main[data-fold-paper]")?.dataset.foldPaper;
    const toSection = sectionForPath(event.to.pathname);
    const canFold = root.dataset.reduce !== "true" && !document.hidden && (player?.allowed ?? true);
    const parallel = root.dataset.parallel === "true";
    const nav: Navigation = { event, fold: !!fromSection && !!toSection && fromSection !== toSection && canFold,
      keyboard, swapping: false };
    current = nav;
    // Restore the outgoing sheet when a serial request replaces an unfinished close.
    if (!nav.fold || (!parallel && root.dataset.foldPhase && root.dataset.foldPhase !== "opening")) player?.reset();
    document.querySelector<HTMLDetailsElement>("[data-settings][open]")?.removeAttribute("open");
    const valid = () => current === nav && !event.signal.aborted && !event.defaultPrevented;
    const load = event.loader;

    event.signal.addEventListener("abort", () => {
      if (current !== nav) return;
      player?.pause();
      current = undefined;
      // A parallel replacement can continue from the current pose.
      queueMicrotask(() => { if (!current) player?.reset(); });
    }, { once: true });

    const prepare = async () => {
      try {
        if (!nav.fold) return await load();
        // The model can download during preparation in either mode.
        rendererModule ??= import("../lib/fold/player").catch(() => undefined);
        const close = async () => {
          const module = await rendererModule;
          if (!module || !valid() || !nav.fold) return;
          player ??= new module.FoldPlayer(document.getElementById("fold-stage")!);
          await player.close();
        };
        const loadTarget = async () => {
          await load();
          if (!valid()) return;
          // A missing child URL can return the shared 404 under a section prefix.
          const target = event.newDocument.querySelector<HTMLElement>("main[data-fold-paper]")?.dataset.foldPaper;
          if (!target || target === fromSection) skipFold();
        };
        if (parallel) await Promise.all([loadTarget(), close()]);
        else { await loadTarget(); await close(); }
      } finally {
        if (!valid() && current === nav) { current = undefined; player?.reset(); }
      }
    };
    let preparation: Promise<void> | undefined;
    event.loader = () => preparation ??= prepare();
  });

  document.addEventListener("astro:before-swap", event => {
    paperScroll.save();
    const incoming = event.newDocument.documentElement;
    for (const key of settings) incoming.dataset[key] = root.dataset[key];
    incoming.dataset.enhanced = "true";
    if (current?.event.signal !== event.signal) return;
    current.swapping = true;
    current.swapFinished = event.viewTransition.finished.catch(() => {});
    current.fold = current.fold && !!player?.allowed && root.dataset.foldPhase === "docked";
    if (current.fold) incoming.dataset.foldPhase = "docked";
  });

  document.addEventListener("astro:after-swap", async () => {
    updateControls();
    const nav = current;
    if (!nav?.swapping) return;
    paperScroll.enter(nav.event.navigationType === "traverse");
    nav.swapping = false;
    // Keep the sheet docked through the native snapshot. A persisted canvas and
    // the incoming paper can be measured safely once the browser releases it.
    if (nav.fold) await nav.swapFinished;
    if (current !== nav || nav.event.signal.aborted) return;
    if (nav.fold && player) await player.open();
    else player?.reset();
    if (current !== nav) return;
    current = undefined;
    if (nav.keyboard && nav.event.navigationType !== "traverse" && !location.hash &&
        (document.activeElement === document.body || !document.activeElement)) {
      document.getElementById("content")?.focus({ preventScroll: true });
    }
  });

  document.addEventListener("visibilitychange", () => { if (document.hidden) skipFold(); });
  window.addEventListener("pagehide", skipFold);
  window.addEventListener("pageshow", event => {
    if (event.persisted) { current = undefined; player?.reset(); updateControls(); }
  });
  let measureFrame = 0;
  function queueMeasure() {
    if (!root.dataset.foldPhase || measureFrame) return;
    measureFrame = requestAnimationFrame(() => { measureFrame = 0; player?.remeasure(); });
  }
  window.addEventListener("resize", queueMeasure);
  root.dataset.enhanced = "true";
  updateControls();
}

// ClientRouter keeps the same window when a later build introduces a new module URL.
// Its loader must have exactly one folding controller for the lifetime of that window.
const host = window as Window & { __foldJournalNavigation?: true };
if (!host.__foldJournalNavigation) {
  if (document.documentElement.dataset.enhanced === "true") {
    // A pre-singleton build already owns this document. Re-enter the committed URL once.
    location.reload();
  } else {
    host.__foldJournalNavigation = true;
    installNavigation();
  }
}
