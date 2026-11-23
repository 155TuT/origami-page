const faces = [
  { id: "song", label: "宋体", chinese: "Noto Serif SC", latin: "Lora", weights: "700 / 400",
    note: "「风」的转折有明确棱角，正文横细竖重，长段落仍有清楚的字界。" },
  { id: "kai", label: "文楷", chinese: "霞鹜文楷", latin: "Crimson Pro", weights: "500 / 400",
    note: "「纸」的提笔和末笔有手写感。标题用 Medium，和正文的分量接近，适合影集题记。" },
  { id: "hei", label: "黑体", chinese: "Noto Sans SC", latin: "Source Serif 4", weights: "700 / 400",
    note: "「上」的横竖粗细接近，缩小后轮廓清楚，适合项目索引。" },
];

const libraries = [
  { id: "tabler", title: "Tabler Outline", version: "3.52.0", license: "MIT",
    url: "https://github.com/tabler/tabler-icons/tree/v3.52.0/icons/outline",
    note: "空心圆钮与圆头描边呼应顶栏现有的设置按钮，可单独调整描边。" },
  { id: "lucide", title: "Lucide", version: "1.78.0", license: "ISC + MIT",
    url: "https://github.com/lucide-icons/lucide/tree/1.78.0/icons",
    note: "调节钮化为短直线，小尺寸下细节最少。部分图形沿用 Feather 的 MIT 许可。" },
  { id: "phosphor", title: "Phosphor Regular", version: "2.0.8", license: "MIT",
    url: "https://github.com/phosphor-icons/core/tree/v2.0.8/assets/regular",
    note: "调节杆带实心圆点，以填充路径绘制。可用同系列 Light、Bold 调整视觉分量。" },
];

const actions = [
  ["search", "搜索"], ["sliders", "阅读设置"], ["rss", "订阅"],
  ["external", "外链"], ["mail", "邮件"], ["arrow-right", "前往"],
];

const icon = (library, action) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${library}-${action}"></use></svg>`;

document.getElementById("font-grid").innerHTML = faces.map(face => `
  <article class="swatch" data-face="${face.id}">
    <header>
      <h3>${face.label}</h3>
      <p>${face.chinese} <span>×</span> ${face.latin}</p>
    </header>
    <div class="brand-sample"><div class="mini-brand"><strong>折间</strong><i lang="en">Fold Journal</i></div></div>
    <div class="excerpt">
      <time datetime="2026-11-16">2026.11.16</time>
      <h4>纸上生风</h4>
      <p>午后折了一只纸鹤。拇指压住翼根，轻轻提起纸尖，桌面上便多了一道细长的影子。</p>
    </div>
    <div class="note"><span>标题 / 正文 · ${face.weights}</span><p>${face.note}</p></div>
  </article>`).join("");

document.getElementById("icon-grid").innerHTML = libraries.map(library => `
  <article class="icon-row">
    <header><h3><a href="${library.url}">${library.title}</a></h3>
      <p>${library.version} · <a href="icons/${library.id}-LICENSE.txt">${library.license}</a></p></header>
    <div class="glyphs">${actions.map(([id, label]) => `
        <figure>${icon(library.id, id)}<figcaption>${label}</figcaption></figure>`).join("")}</div>
    <p class="icon-note">${library.note}</p>
  </article>`).join("");

const sizes = document.getElementById("sizes");
sizes.addEventListener("change", event => {
  document.getElementById("icon-grid").style.setProperty("--icon-size", event.target.value + "px");
});

const faceSelect = document.getElementById("face");
const librarySelect = document.getElementById("library");
function updateSpecimen() {
  document.querySelector(".sample-page").dataset.face = faceSelect.value;
  document.getElementById("sample-tools").innerHTML = actions.slice(0, 2)
    .map(([id, label]) => `<span aria-label="${label}" role="img">${icon(librarySelect.value, id)}</span>`).join("");
}
faceSelect.addEventListener("change", updateSpecimen);
librarySelect.addEventListener("change", updateSpecimen);
updateSpecimen();

const themeButton = document.querySelector(".theme-toggle");
const preference = window.matchMedia("(prefers-color-scheme: dark)");
let chosenTheme;
try { chosenTheme = localStorage.getItem("fold-journal:prototype-theme"); } catch { /* file previews may disable storage */ }
function applyTheme() {
  const theme = chosenTheme || (preference.matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  document.getElementById("theme-label").textContent = theme === "dark" ? "浅色纸面" : "深色纸面";
}
themeButton.addEventListener("click", () => {
  chosenTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("fold-journal:prototype-theme", chosenTheme); } catch { /* still applies to this page */ }
  applyTheme();
});
preference.addEventListener("change", applyTheme);
applyTheme();
