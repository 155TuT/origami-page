const columns = [
  {
    name: "首页", role: "认识作者",
    options: [
      { id: "crane", name: "千纸鹤", why: "长喙、尾尖和抬起的一翼在整排里都很醒目，也延续了折间最初的纸鹤造型。", motion: "离开个人介绍时，整张纸折成千纸鹤，停在顶栏的首页入口。" },
      { id: "house", name: "折纸屋", why: "双坡屋顶直接指向「家」，但也接近通用的首页按钮。", motion: "可以先合屋脊，再立起墙面，让屋檐成为最后一道折边。" },
    ],
  },
  {
    name: "作品集", role: "设计与制作",
    options: [
      { id: "pinwheel", name: "四叶风车", why: "四片纸从同一个中心折出，适合展示多方向的创作。放在纸鹤旁，放射形轮廓很好认。", motion: "可以让四只纸角依次扣向中心，最后露出四片斜向的叶面。" },
      { id: "box", name: "方纸盒", why: "敞口的盒子像一个作品收藏匣。缩小时，区分盒口和盒底更依赖明暗。", motion: "先抬侧壁，再把余下两端收入盒边，以能看见盒口的视角停靠。" },
    ],
  },
  {
    name: "文章", role: "打开，阅读",
    options: [
      { id: "book", name: "双页书", why: "一道书脊把纸面分成左右两页，直接对应阅读。宽而低的书形也能与影集区分。", motion: "让中缝先下沉，两侧书页略微抬起，停在一本翻开的小书上。" },
      { id: "bookmark", name: "书角", why: "三角书签只用两三道边就能认出；它更容易被理解为收藏文章。", motion: "纸角向内叠成口袋，留一道斜向开口，表现可套住书页的结构。" },
    ],
  },
  {
    name: "影集", role: "按顺序看整组照片",
    options: [
      { id: "camera", name: "纸相机", why: "凸起的取景器打破长方轮廓，中央的深色镜头在 22 px 仍看得见。紧邻「文章」的小书时，两栏容易区分。", motion: "让外层折成机身，正面留给多边形镜头。制作模型时需验证镜头的折层和遮挡。" },
      { id: "accordion", name: "经折相册", why: "连续的册页贴合从封面开始看整册的顺序。放大看折边很美，缩进顶栏后容易与双页书混淆。", motion: "沿山折、谷折交替压合。展开时让相邻折面依次露出，像打开一本经折装相册。" },
    ],
  },
];

const choice = columns.map(() => 0);
let active = 0;
const docks = document.querySelector(".docks");
const rows = document.querySelector("#rows");
const themeButton = document.querySelector("#theme");

const preference = matchMedia("(prefers-color-scheme: dark)");
const themeKey = "fold-journal:prototype-theme";
let chosenTheme;
try { chosenTheme = localStorage.getItem(themeKey); } catch { /* Local files may have storage disabled. */ }
function applyTheme() {
  const theme = chosenTheme || (preference.matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "dark" ? "浅色纸面" : "深色纸面";
}
applyTheme();
preference.addEventListener("change", applyTheme);
themeButton.addEventListener("click", () => {
  chosenTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem(themeKey, chosenTheme); } catch { /* Use the choice for this visit. */ }
  applyTheme();
});

function updatePreview() {
  for (const [index, button] of [...docks.children].entries()) {
    const item = columns[index].options[choice[index]];
    button.setAttribute("aria-pressed", String(index === active));
    button.innerHTML = foldShape(item.id, index === active) + columns[index].name;
  }
  const item = columns[active].options[choice[active]];
  document.querySelector("#model-name").textContent = columns[active].name + " · " + item.name;
  document.querySelector("#motion").textContent = item.motion;
  document.querySelector("#print").innerHTML = foldShape(item.id);
  document.querySelector("#outline").innerHTML = foldShape(item.id, true);
}

for (const [index, column] of columns.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.addEventListener("click", () => { active = index; updatePreview(); });
  docks.append(button);

  const row = document.createElement("div");
  row.className = "row";
  row.setAttribute("role", "radiogroup");
  row.setAttribute("aria-labelledby", "col-" + index);
  row.innerHTML = `<div class="section-name"><h3 id="col-${index}">${column.name}</h3><p>${column.role}</p></div>`;
  for (const [variant, item] of column.options.entries()) {
    const label = document.createElement("label");
    label.className = "choice";
    label.innerHTML = `<span class="specimens" aria-hidden="true">
      ${foldShape(item.id)}${foldShape(item.id, true)}${foldShape(item.id)}
    </span><span class="caption">
      <input type="radio" name="shape-${index}" value="${item.id}" aria-label="${item.name}" aria-describedby="why-${item.id}" ${variant === 0 ? "checked" : ""}>
      ${item.name}${variant === 0 ? "<small>建议</small>" : ""}
    </span><span class="reason" id="why-${item.id}">${item.why}</span>`;
    label.querySelector("input").addEventListener("change", () => {
      choice[index] = variant;
      active = index;
      updatePreview();
    });
    row.append(label);
  }
  rows.append(row);
}

for (const toggle of document.querySelectorAll("[data-width]")) {
  toggle.addEventListener("click", () => {
    docks.style.setProperty("--sample-width", toggle.dataset.width + "px");
    for (const other of document.querySelectorAll("[data-width]")) {
      other.setAttribute("aria-pressed", String(other === toggle));
    }
  });
}
updatePreview();
