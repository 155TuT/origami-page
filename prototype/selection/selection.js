(() => {
  const upstream = "https://github.com/phosphor-icons/core/blob/v2.0.8/assets/regular/";
  const groups = [
    { title: "顶栏工具", items: [
      ["magnifying-glass", "全站搜索"],
      ["sliders-horizontal", "阅读设置"],
    ] },
    { title: "文章阅读", items: [
      ["list-bullets", "本篇目录"],
      ["arrow-left", "上一篇"],
      ["arrow-right", "下一篇"],
    ] },
    { title: "站外与联系", items: [
      ["arrow-square-out", "打开原文"],
      ["envelope-simple", "邮件联系"],
      ["rss-simple", "RSS 订阅"],
    ] },
  ];

  function renderIcons(grid) {
    grid.innerHTML = groups.map(({ title, items }) => `
    <div class="icon-group">
      <h3>${title}</h3>
      <ul>${items.map(([name, action]) => `
        <li><a href="${upstream}${name}.svg">
          <span class="icon-frame"><svg width="19" height="19" aria-hidden="true"><use href="#ph-${name}"></use></svg></span>
          <span>${action}<small lang="en">${name}</small></span>
        </a></li>`).join("")}</ul>
    </div>`).join("");

    document.getElementById("sizes").addEventListener("change", event => {
      grid.style.setProperty("--icon-size", event.target.value + "px");
    });
  }
  const grid = document.getElementById("icon-grid");
  if (grid) renderIcons(grid);

  const themeButton = document.querySelector(".theme-toggle");
  const preference = matchMedia("(prefers-color-scheme: dark)");
  const key = "fold-journal:prototype-theme";
  let chosenTheme;
  try { chosenTheme = localStorage.getItem(key); } catch { /* Local file storage is optional. */ }

  function applyTheme() {
    const theme = chosenTheme || (preference.matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.getElementById("theme-label").textContent = theme === "dark" ? "浅色纸面" : "深色纸面";
  }
  themeButton.addEventListener("click", () => {
    chosenTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(key, chosenTheme); } catch { /* The current preview still updates. */ }
    applyTheme();
  });
  preference.addEventListener("change", applyTheme);
  applyTheme();
})();
