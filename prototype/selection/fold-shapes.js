// Studies of the visible faces of published models. Knockouts represent true holes,
// including the two folded finger loops of the scissors.
(() => {
  const studies = {
    scissors: {
      transform: "translate(50 41) rotate(15) translate(-50 -41)",
      faces: [
        ["turned", "M50 29 43 22 42 14 48 7 59 4 66 6 69 10 67 26 58 33Z M47 17 56 11 62 15 53 25Z"],
        ["lit", "M42 14 48 7 59 4 55 10 47 17 43 21Z"],
        ["front", "M59 4 66 6 69 10 62 15 56 11Z"],
        ["back", "M44 21 47 17 53 25 57 27 52 30Z"],
        ["turned", "M60 34 69 25 85 24 89 27 88 40 83 46 74 46 66 40Z M66 36 77 29 84 33 78 41Z"],
        ["front", "M77 29 85 24 89 27 84 33Z"],
        ["lit", "M66 36 78 41 74 46 64 40Z"],
        ["back", "M88 37 88 40 83 46 74 46 78 41Z"],
        ["turned", "M12 69 28 46 54 30 67 25 60 34 41 47Z"],
        ["front", "M15 74 40 47 67 25 85 24 62 38 45 62Z"],
        ["lit", "M15 74 40 47 62 38 45 62Z"],
      ],
      edges: "M50 29 43 22 42 14 48 7 59 4 66 6 69 10 67 25 M47 17 56 11 62 15 53 25Z M42 14 47 17 M56 11 59 4 M62 15 69 10 M53 25 50 29 M85 24 89 27 88 40 83 46 74 46 64 39 M66 36 77 29 84 33 78 41Z M84 33 89 27 M78 41 74 46 M12 69 28 46 54 30 67 25 40 47Z M15 74 40 47 67 25 85 24 62 38 45 62Z",
    },
  };

  // Use the project’s actual exported visible edges inline on file:// pages.
  const craneEdges = "M15.262 12.117L4.361 6M5.802 9.789L4.361 6M13.035 13.759L4.361 6M21.113 16.568L37.44 6.746M37.44 6.746L21.116 16.574M37.44 6.746L21.127 16.595M17.701 23.315L17.687 23.327M37.44 6.746L21.142 16.622M14.309 20.771L17.687 23.327M14.312 20.761L17.704 23.318M17.704 23.318L19.561 21.758M23.692 18.29L37.44 6.746M17.704 23.318L17.695 23.311M17.664 23.287L17.664 23.287M17.687 23.327L17.695 23.311M17.704 23.318L18.739 21.315M21.147 16.631L21.159 16.632M14.295 20.701L18.184 21.016M17.075 20.966L18.262 21.058M24.369 18.733L21.153 16.648M21.159 16.632L24.369 18.733M21.157 16.65L17.744 10.285M14.332 20.704L14.306 20.779M14.306 20.779L9.431 22.69M9.315 22.586L9.318 22.584M14.295 20.761L14.293 20.762M21.153 16.648L15.384 16.197M10.515 15.817L10.506 15.816M17.744 10.285L11.539 14.863M10.516 15.797L10.585 15.744M11.366 15.148L17.744 10.285M9.382 22.576L9.323 22.598M10.497 15.795L10.496 15.802M9.435 22.686L14.306 20.779M10.496 15.797L10.487 15.791M10.425 15.709L13.501 15.989M13.613 16.083L10.497 15.795M17.744 10.285L15.76 16.226M14.775 19.178L14.261 20.716M13.501 15.989L10.442 15.732M10.497 15.795L15.818 16.233M10.481 15.814L10.515 15.817M14.324 18.935L13.179 19.304M13.501 15.989L9.402 14.375M12.143 17.76L10.481 15.814M5.897 9.801L5.872 9.769M14.295 20.761L10.712 16.085M10.506 15.816L5.874 9.771M14.306 20.779L10.684 16.052M10.503 15.816L5.876 9.777M10.497 15.795L12.143 17.76M12.143 17.76L13.613 16.083M27.43 26L24.369 18.733M9.323 22.598L9.308 22.562M7.053 17.253L4.792 11.928M4.097 10.293L5.872 9.769M5.875 9.774L5.871 9.775M4.889 10.062L4.097 10.293M5.872 9.769L4.104 10.297M4.794 11.924L9.315 22.586M4.104 10.297L5.826 9.785M9.431 22.69L5.726 14.056M4.123 10.321L5.875 9.774M5.874 9.771L4.116 10.311M4.802 11.907L9.435 22.686M5.876 9.777L4.123 10.321M4.116 10.311L5.525 9.883M5.873 9.778L5.876 9.777M27.43 26L12.143 17.76M27.43 26L15.818 16.233M5.871 9.772L5.872 9.769M4.097 10.293L1.56 18.341M5.875 9.774L5.873 9.778M1.56 18.341L4.104 10.297M5.874 9.771L5.871 9.776M1.56 18.341L4.116 10.311M1.56 18.341L5.876 9.777M4.123 10.321L1.56 18.341";

  function shape(id, outline = false) {
    if (id === "crane") {
      if (!outline) return '<img class="fold-glyph" src="../../public/art/crane-icon.png" alt="">';
      return `<svg class="fold-glyph fold-outline" viewBox="0 0 39 32" aria-hidden="true"><path d="${craneEdges}" vector-effect="non-scaling-stroke"/></svg>`;
    }
    const pose = window.foldPoses[id];
    if (pose) {
      const ink = outline
        ? `<path d="${pose.edges}" vector-effect="non-scaling-stroke"/>`
        : pose.fill.map(([shade, d]) => {
          const pigment = `color-mix(in srgb, var(--crane-shadow) ${shade / 120 * 100}%, var(--crane-paper))`;
          return `<path fill="${pigment}" stroke="${pigment}" stroke-width=".045" stroke-linejoin="round" d="${d}"/>`;
        }).join("");
      return `<svg class="fold-glyph${outline ? " fold-outline" : ""}" viewBox="0 0 39 32" aria-hidden="true" focusable="false">${ink}</svg>`;
    }
    const { transform, edges, faces } = studies[id];
    const art = outline
      ? `<path d="${edges}" vector-effect="non-scaling-stroke"/>`
      : faces.map(([tone, d]) => `<path class="fold-tone-${tone}" fill-rule="evenodd" d="${d}"/>`).join("");
    return `<svg class="fold-glyph${outline ? " fold-outline" : ""}" viewBox="0 0 100 82" aria-hidden="true" focusable="false"><g${transform ? ` transform="${transform}"` : ""}>${art}</g></svg>`;
  }

  window.foldArt = { shape };
})();
