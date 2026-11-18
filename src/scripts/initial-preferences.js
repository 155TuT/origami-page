(() => {
  const html = document.documentElement;
  const saved = (name) => {
    try { return localStorage.getItem("fold-journal:" + name); } catch { return null; }
  };
  const theme = saved("theme");
  html.dataset.theme = theme === "dark" || theme === "light" ? theme : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  html.dataset.reduce = String(saved("reduce") === "true");
  html.dataset.parallel = String(saved("parallel") === "true");
})();
