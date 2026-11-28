(() => {
  const published = new Set(["crane", "crown", "paper-boat", "kawasaki-rose"]);

  function shape(id, outline = false) {
    if (published.has(id) && !outline) {
      return `<img class="fold-glyph" src="../../public/art/folds/${id}/solid.png" alt="">`;
    }
    const pose = window.foldPoses[id];
    const ink = outline
      ? `<path d="${pose.edges}" vector-effect="non-scaling-stroke"/>`
      : pose.fill.map(([shade, d]) => {
        const pigment = `color-mix(in srgb, var(--crane-shadow) ${shade / 120 * 100}%, var(--crane-paper))`;
        return `<path fill="${pigment}" stroke="${pigment}" stroke-width=".045" stroke-linejoin="round" d="${d}"/>`;
      }).join("");
    return `<svg class="fold-glyph${outline ? " fold-outline" : ""}" viewBox="0 0 39 32" aria-hidden="true" focusable="false">${ink}</svg>`;
  }

  window.foldArt = { shape };
})();
