(() => {
  const root = document.getElementById("fonts");
  if (!root) return;

  const chinese = [
    { id: "letterpress", label: "汇文明朝体 GBK", source: "https://huozi.cool/article/1780107027757.html",
      origin: "特里王 · 五号铅字", coverage: 6763, license: "作者授权",
      note: "五六十年代的简化字保留旧铅字的微小起伏。把「纸」放大看笔端，再缩到正文看墨色是否舒适。" },
    { id: "huiwen-fangsong", label: "汇文仿宋", source: "https://huozi.cool/article/1780107161300.html",
      origin: "特里王 · 新华字模厂 59-4 仿宋", coverage: 6762, license: "作者授权",
      note: "字样取自旧电码本，横画微微上扬，撇捺尖细。与汇文明朝并排看「纸、笔」，尤其留意 14 px 下笔尖的轻重。字库缺单独的笔画「丶」。" },
    { id: "ud", label: "TRW UD 明朝", source: "https://huozi.cool/article/1780107481576.html",
      origin: "特里王 · BIZ UD 明朝改作", coverage: 6732, license: "OFL 1.1",
      note: "较宽的字腔适合小字。作者补了简体，部分偏旁采用旧形，另以思源字形补缺，可重点看「线、记、钉」。" },
    { id: "heritage", label: "一点明体", source: "https://github.com/ichitenfont/I.Ming",
      origin: "一点字坊 · I.Ming 8.10", coverage: 6763, license: "IPA 1.0",
      note: "也称一点明朝体。横画纤细，折角利落。GB 2312 的汉字全部收录，部件写法依一点字坊的传承字形标准。" }
  ];
  const latin = [
    { id: "fell", label: "IM FELL English", source: "https://github.com/google/fonts/tree/main/ofl/imfellenglish",
      note: "站点采用的西文衬线体。Igino Marini 将牛津的 Fell 活字数字化，正体保留细微的印痕，斜体用于站标和英文图注。" },
    { id: "garamond", label: "EB Garamond", source: "https://github.com/google/fonts/tree/main/ofl/ebgaramond",
      note: "小写字面偏小，斜体笔势舒展。与汇文明朝体搭配，可从站标观察两种活字的节奏。" },
    { id: "cardo", label: "Cardo", source: "https://scholarsfonts.net/cardofnt.html",
      note: "David J. Perry 取法威尼斯早期印本《De Aetna》的活字。看 Paper 的 P 和小写 e，字腔舒展，适合与汇文仿宋细长的笔画一起读。" },
    { id: "caslon", label: "Libre Caslon Text", source: "https://github.com/impallari/Libre-Caslon-Text",
      note: "取法 1960 年代美国手绘的 Caslon 字样。小写字面较大，笔画饱满，切到 14 px 可以看出英文与中文各占多少墨色。" }
  ];
  const commonLine = "纸鹤停在窗边";
  const figures = [
    { id: "huiwen", label: "汇文明朝体 GBK", note: "站点采用的原生齐线数字，每个半角宽 0.5 em。保留原字号，观察 1 两侧的空白。" },
    { id: "garamond", label: "EB Garamond", note: "齐线、比例宽的数字放大到 107%。1 窄，0 宽，年份与西文字母相接时较紧凑。" },
    { id: "caslon", label: "Libre Caslon Text", note: "原生齐线、比例宽的数字缩到 87.5%。留意 2 的弯笔和 5 的字重。" },
    { id: "follow", label: "跟随正文西文", note: "选择 IM FELL English 可查看原来的旧式数字。6、8 较高，3、4、5、7、9 向下伸出。" },
  ];
  const options = (faces) => faces.map(({ id, label }) => `<option value="${id}">${label}</option>`).join("");
  root.innerHTML = `
    <h2 id="specimen">正文与标题</h2>
    <div class="type-workbench">
      <article class="type-sheet" aria-label="中英混排样张">
        <header class="type-masthead">
          <div><strong>折间</strong> <i lang="en">Fold Journal</i></div>
          <span aria-hidden="true"><svg><use href="#ph-magnifying-glass"></use></svg><svg><use href="#ph-sliders-horizontal"></use></svg></span>
        </header>
        <div class="type-prose">
          <time datetime="2026-11-16">2026.11.16</time>
          <h3>纸上生风 03 <span lang="en">Field Notes</span></h3>
          <p>午后折了一只纸鹤。拇指压住翼根，轻轻提起纸尖，桌面上便多了一道细长的影子。我在 <span lang="en">Field Notes</span> 里记下这道折痕。</p>
          <p>翻到 2026 年的手记，第 18 页夹着一张边长 12.5 <span lang="en">cm</span> 的方纸。斜着抬高一角，迎光的边缘忽然亮起来。</p>
          <p lang="en">A single sheet of paper catches the afternoon light.</p>
          <p class="type-caption">图 02 · 折线与纸影 <i lang="en">Paper in light</i></p>
        </div>
      </article>
      <div class="type-settings">
        <div><label for="type-chinese">正文中文</label><select id="type-chinese">${options(chinese)}</select></div>
        <div><label for="type-latin">正文西文</label><select id="type-latin">${options(latin)}</select></div>
        <div><label for="type-digits">正文半角数字</label><select id="type-digits">${options(figures)}</select></div>
        <div class="type-size-setting"><label for="type-size">正文字号</label>
          <select id="type-size"><option value="14">14 px</option><option value="17" selected>17 px</option><option value="20">20 px</option></select>
        </div>
        <p class="type-pair-note"><span id="type-latin-note"></span> <a id="type-latin-source">字体来源</a></p>
      </div>
    </div>
    <h3 class="type-subhead" id="figures">正文数字与大写字高</h3>
    <p class="type-guide">两端的 H、A 均取 IM FELL English。点选一组，比较上方标题、日期、小数和页码里的半角数字。</p>
    <fieldset class="type-latin-list type-figure-list" aria-labelledby="figures">${figures.map(face => `
      <label>
        <span class="type-latin-name"><input type="radio" name="type-figure-choice" value="${face.id}" aria-label="${face.label}">${face.label}</span>
        <span class="type-figure-run" style="--figure-face: ${face.id === "follow" ? "var(--type-en)" : `'Figures ${face.id}'`}" aria-hidden="true"><span>H</span>0123456789<span>A</span></span>
        <small>${face.note}</small>
      </label>`).join("")}</fieldset>
    <h3 class="type-subhead" id="type-latin-heading">西文字样对照</h3>
    <fieldset class="type-latin-list" aria-labelledby="type-latin-heading">${latin.map(face => `
      <label style="--type-en: 'Sample ${face.id}'">
        <span class="type-latin-name"><input type="radio" name="type-latin-choice" value="${face.id}" aria-label="${face.label}"><span lang="en">${face.label}</span></span>
        <span class="type-latin-sample">纸上生风 <span lang="en">Paper &amp; ink</span><i lang="en">Fold Journal</i></span>
      </label>`).join("")}</fieldset>
    <h3 class="type-subhead">中文字样对照</h3>
    <p class="type-guide">同一句分别排成标题和正文。简体覆盖按原版字库在 GB 2312 的 6,763 个汉字中逐字核对。</p>
    <div class="type-rows">${chinese.map(face => `
      <div class="type-row">
        <div class="type-name"><h4>${face.label}</h4><span>${face.origin}</span></div>
        <div class="type-glyph" style="--type-zh: 'Sample ${face.id}'"><div>${commonLine}</div><p>纸线、铜钉与一页笔记。</p></div>
        <div class="type-evidence"><p>${face.note}</p><small>收录 ${face.coverage.toLocaleString("en-US")} 字 · ${face.license} · <a href="${face.source}">作者资料</a></small></div>
      </div>`).join("")}</div>
    <p class="type-sources">页面随附样文所需字形。<a href="fonts/README.md">字库版本、覆盖检查与许可</a></p>`;

  const board = root.closest("main");
  const chineseSelect = root.querySelector("#type-chinese");
  const latinSelect = root.querySelector("#type-latin");
  const digitsSelect = root.querySelector("#type-digits");
  const sizeSelect = root.querySelector("#type-size");
  function update() {
    const currentLatin = latin.find(face => face.id === latinSelect.value);
    board.style.setProperty("--type-zh", `"Sample ${chineseSelect.value}"`);
    board.style.setProperty("--type-body-size", sizeSelect.value + "px");
    board.style.setProperty("--type-en", `"Sample ${currentLatin.id}"`);
    if (digitsSelect.value === "follow") board.style.removeProperty("--type-digits");
    else board.style.setProperty("--type-digits", `"Figures ${digitsSelect.value}"`);
    root.querySelector(`input[name="type-latin-choice"][value="${currentLatin.id}"]`).checked = true;
    root.querySelector(`input[name="type-figure-choice"][value="${digitsSelect.value}"]`).checked = true;
    root.querySelector("#type-latin-note").textContent = currentLatin.note;
    root.querySelector("#type-latin-source").href = currentLatin.source;
  }
  root.addEventListener("change", event => {
    if (event.target.name === "type-latin-choice") latinSelect.value = event.target.value;
    if (event.target.name === "type-figure-choice") digitsSelect.value = event.target.value;
    update();
  });
  update();

  const technical = document.getElementById("technical");
  const advances = {
    dejavu: "DejaVu 的半角约为 0.602 em，八个数字会比上行四个汉字宽。",
    plex: "Plex 的半角为 0.6 em，适合看长行代码的疏密。",
    inconsolata: "Inconsolata 的半角为 0.5 em，两行在原始字号下正好对齐。",
  };
  function updateTechnical() {
    const mono = technical.querySelector("input[name=tech-mono]:checked").value;
    const zh = technical.querySelector("#tech-zh").value;
    const math = technical.querySelector("#tech-math").value;
    technical.style.setProperty("--tech-mono", `"Tech ${mono}"`);
    technical.style.setProperty("--tech-zh", `"Tech ${zh}"`);
    technical.style.setProperty("--tech-math", math === "stix" ? '"STIX specimen"' : '"LM specimen"');
    technical.querySelector("#tech-width-note").textContent = advances[mono];
  }
  technical.addEventListener("change", updateTechnical);
  updateTechnical();

  for (const equation of technical.querySelectorAll('math[display="block"]')) {
    const scroller = equation.parentElement;
    const hint = document.createElement("p");
    hint.className = "math-scroll-hint";
    hint.textContent = "横向滚动可读完整公式。";
    scroller.after(hint);
    const resize = new ResizeObserver(() => {
      const clipped = scroller.scrollWidth > scroller.clientWidth + 1;
      hint.hidden = !clipped;
      if (clipped) {
        scroller.tabIndex = 0;
        scroller.setAttribute("role", "group");
        scroller.setAttribute("aria-label", "完整公式，可横向滚动");
      } else {
        scroller.removeAttribute("tabindex");
        scroller.removeAttribute("role");
        scroller.removeAttribute("aria-label");
      }
    });
    resize.observe(equation);
    resize.observe(scroller);
  }
})();
