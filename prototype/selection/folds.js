(() => {
  const catalog = window.FOLD_CATALOG;
  const art = window.foldArt;
  const summary = document.querySelector("[data-fold-summary]");
  if (summary) {
    summary.classList.add("fold-overview");
    for (const column of catalog) {
      const item = column.options[0];
      const link = document.createElement("a");
      link.href = "./folds.html#" + item.id;
      link.innerHTML = `<span class="fold-thumbnail">${art.shape(item.id)}</span>
        <span class="fold-card-section">${column.name}</span><strong>${item.name}</strong>`;
      summary.append(link);
    }
  }

  const docks = document.querySelector(".fold-docks");
  if (!docks) return;
  const options = document.getElementById("fold-options");
  const detail = document.getElementById("fold-detail");
  const picks = catalog.map(column => column.options[0]);
  const articleSection = catalog.findIndex(column => column.name === "文章");
  let active = articleSection;

  function renderDetail(column, item) {
    detail.innerHTML = `<div class="fold-plate">
      <figure>${art.shape(item.id)}<figcaption>实心</figcaption></figure>
      <figure>${art.shape(item.id, true)}<figcaption>可见折边</figcaption></figure>
    </div>
    <article class="fold-entry">
      <header><p class="fold-english">${item.english}</p><h3>${item.name}</h3></header>
      <p class="fold-reason">${item.why}</p>
      <dl><dt>纸张与折法</dt><dd>${item.structure}</dd>
          <dt>难度</dt><dd>${item.difficulty}</dd></dl>
      <ul class="fold-links">${item.sources.map(({ label, url }) =>
        `<li><a href="${url}">${label}</a></li>`).join("")}</ul>
    </article>`;

    for (const button of options.children) {
      button.setAttribute("aria-pressed", String(button.dataset.id === item.id));
    }
    document.getElementById("fold-section-name").textContent = column.name + " · " + column.role;
  }

  function render() {
    for (const [index, button] of [...docks.children].entries()) {
      const item = picks[index];
      button.setAttribute("aria-pressed", String(index === active));
      button.setAttribute("aria-label", catalog[index].name + "，" + item.name);
      button.innerHTML = art.shape(item.id, index === active) + `<span>${catalog[index].name}</span>`;
    }
    const column = catalog[active];
    options.hidden = column.options.length < 2;
    if (options.dataset.column !== column.name) {
      options.replaceChildren();
      options.dataset.column = column.name;
      for (const [index, item] of (options.hidden ? [] : column.options).entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.id = item.id;
        button.innerHTML = `<span class="fold-option-art">${art.shape(item.id)}${art.shape(item.id, true)}</span>
          <span class="fold-option-label"><strong>${item.name}</strong>${index === 0 ? "<small>本站使用</small>" : ""}</span>
          <span class="fold-option-desc">${item.silhouette}</span>`;
        button.addEventListener("click", () => { location.hash = item.id; });
        options.append(button);
      }
    }
    renderDetail(column, picks[active]);
  }

  function readLocation() {
    const id = location.hash.slice(1);
    if (!id) {
      active = articleSection;
      picks[active] = catalog[active].options[0];
    }
    for (const [index, column] of catalog.entries()) {
      const item = column.options.find(option => option.id === id);
      if (item) {
        active = index;
        picks[index] = item;
        break;
      }
    }
    render();
  }

  for (const [index] of catalog.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", () => { location.hash = picks[index].id; });
    docks.append(button);
  }
  document.getElementById("fold-sizes").addEventListener("change", event => {
    docks.style.setProperty("--sample-width", event.target.value + "px");
  });
  window.addEventListener("hashchange", readLocation);
  readLocation();
})();
