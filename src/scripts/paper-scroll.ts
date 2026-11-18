// ClientRouter restores the window. The paper has its own scroll position per history entry.
export function installPaperScroll() {
  const documentURL = () => location.pathname + location.search;
  const entryKey = () => history.state?.index + " " + location.href;
  const paperElement = () => document.getElementById("content")!;
  let paper = paperElement();
  let page = documentURL();
  let entry = entryKey();
  const nativeReloadKey = "fold-journal:native-fragment";
  // During popstate the outgoing entry can no longer be updated with replaceState.
  const departed = new Map<string, number>();

  function save() {
    const top = paper.scrollTop;
    if (entry !== entryKey()) {
      departed.set(entry, top);
    } else if (history.state && history.state.paperScrollTop !== top) {
      history.replaceState({ ...history.state, paperScrollTop: top }, "");
    }
  }

  function enter(restore: boolean) {
    paper = paperElement();
    page = documentURL();
    entry = entryKey();
    const top = departed.get(entry) ?? history.state?.paperScrollTop;
    departed.delete(entry);
    if (restore && typeof top === "number") {
      paper.scrollTop = top;
    } else if (location.hash) {
      let id = location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* A literal percent can be part of an ID. */ }
      const target = document.getElementById(id);
      if (target === paper) paper.scrollTop = 0;
      else if (target && paper.contains(target)) target.scrollIntoView({ block: "start" });
    } else {
      paper.scrollTop = 0;
    }
  }

  // A same-document fragment goes through ClientRouter without triggering a document swap.
  document.addEventListener("click", event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (link?.hash && link.origin === location.origin && link.pathname + link.search === page) save();
  }, true);
  window.addEventListener("click", () => {
    if (page === documentURL() && entry !== entryKey()) enter(false);
  });
  window.addEventListener("popstate", event => {
    // ClientRouter also emits a synthetic, stateless event for its own hash links.
    if ((!event.state && history.state) || entry === entryKey()) return;
    save();
    if (page === documentURL()) enter(true);
  }, true);
  document.addEventListener("scrollend", event => {
    if (event.target === paper && entry === entryKey()) save();
  }, { capture: true, passive: true });
  window.addEventListener("pagehide", () => {
    save();
    // Editing only the fragment in the address bar creates a native entry with no router state.
    if (!history.state && location.hash) {
      try { sessionStorage.setItem(nativeReloadKey, JSON.stringify([location.href, paper.scrollTop])); } catch {}
    }
  });
  enter(true);
  let initialTop = history.state?.paperScrollTop;
  try {
    const saved = sessionStorage.getItem(nativeReloadKey);
    if (saved !== null) {
      sessionStorage.removeItem(nativeReloadKey);
      const [url, top] = JSON.parse(saved);
      const load = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (load?.type === "reload" && url === location.href) initialTop = top;
    }
  } catch { /* Reading also works with session storage disabled. */ }
  if (location.hash && typeof initialTop === "number") {
    const sheet = paper, url = location.href, top = initialTop;
    sheet.scrollTop = top;
    // Some engines scroll to the native fragment just after pageshow.
    const finishRestore = () => requestAnimationFrame(() => {
      if (sheet.isConnected && location.href === url) sheet.scrollTop = top;
    });
    if (document.readyState === "complete") finishRestore();
    else window.addEventListener("pageshow", finishRestore, { once: true });
  }
  return { save, enter };
}
