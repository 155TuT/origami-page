// Two views of each paper study share its projected, visible faces.
// Each letter identifies one paper corner; adjacent faces reuse the same corner.
(() => {
  const paper = "var(--crane-paper, #df9671)";
  const shadow = "var(--crane-shadow, #643321)";
  // The solid models share the crane's lighting in both desk themes.
  const tones = {
    reverse: `color-mix(in srgb, ${paper} 36%, white)`,
    highlight: `color-mix(in srgb, ${paper} 76%, white)`,
    light: paper,
    mid: `color-mix(in srgb, ${paper} 74%, ${shadow})`,
    shade: `color-mix(in srgb, ${paper} 46%, ${shadow})`,
    deep: `color-mix(in srgb, ${paper} 20%, ${shadow})`,
    dark: shadow,
  };

  const shapes = {
    house: {
      corners: {
        A: [2.7, 16], B: [12.7, 5.2], C: [19.6, 17.8], D: [27.2, 3.8],
        E: [36.3, 14.5], F: [34.6, 15.8], G: [34.1, 24.2], H: [18.2, 27.6],
        I: [5.1, 25.6], J: [4.6, 16.3], K: [18.4, 17.7], L: [10.3, 26.4],
        M: [10.1, 20.1], N: [14.1, 20.7], O: [14.2, 27], P: [11.5, 20.8],
        Q: [11.6, 26.6],
      },
      faces: [
        ["mid", "ABCKJ"], ["light", "BDEC"], ["deep", "CEFK"],
        ["shade", "KFGH"], ["highlight", "JKHONMLI"], ["deep", "MPQL"],
        ["mid", "PNOQ"],
      ],
    },
    box: {
      corners: {
        A: [2.6, 12], B: [20.8, 4.1], C: [36.1, 10.7], D: [18.5, 19.3],
        E: [4.2, 21.8], F: [18.7, 28.5], G: [34.9, 20.5], H: [5.1, 12.1],
        I: [20.8, 5.5], J: [33.8, 10.8], K: [18.5, 17.9], L: [20.8, 11.2],
        M: [11.2, 14.7], N: [27.9, 13.6],
      },
      faces: [
        ["highlight", "ABIH"], ["light", "BCJI"], ["reverse", "CDKJ"],
        ["highlight", "DAHK"], ["deep", "HILM"], ["shade", "IJNL"],
        ["mid", "MLNK"], ["mid", "ADFE"], ["shade", "DCGF"],
      ],
    },
    book: {
      corners: {
        A: [4.3, 6.2], B: [10.4, 5], C: [15.7, 6], D: [19.7, 8.5],
        E: [24.8, 5], F: [30.8, 3.7], G: [33.7, 4], H: [36, 21.5],
        I: [29.4, 22.5], J: [24.1, 24.1], K: [20.5, 26.1],
        L: [14.9, 23.5], M: [9.9, 22.8], N: [3, 23.4],
        O: [2, 24.8], P: [9.8, 24.2], Q: [14.8, 24.9], R: [20.4, 27.5],
        S: [24.5, 25.4], T: [29.6, 23.9], U: [37.1, 22.6],
      },
      faces: [
        ["highlight", "ABCDKLMN"], ["light", "DEFGHIJK"],
        ["shade", "NMLKRQPO"], ["mid", "KJIHUTSR"],
      ],
    },
    bookmark: {
      corners: {
        A: [5.8, 7.4], B: [14.6, 6.6], C: [29.9, 5.2], D: [31.7, 19.6],
        E: [32.5, 25.8], F: [8.6, 28], G: [22.8, 13.4], H: [14.6, 8.3],
        I: [30.1, 20.4], J: [21.9, 14.4],
      },
      faces: [
        ["reverse", "ABHJIDEF"], ["light", "BCG"], ["mid", "CDG"],
        ["shade", "BGJH"], ["deep", "GDIJ"],
      ],
    },
    accordion: {
      corners: {
        A: [2, 9], B: [9.9, 4.7], C: [18.1, 8.4], D: [26.1, 4.1],
        E: [34.1, 7.5], F: [36.5, 23.6], G: [28.2, 20.3], H: [20.1, 24.6],
        I: [12, 21], J: [4, 25.6], K: [4.7, 27.5], L: [12.2, 23.1],
        M: [20.4, 26.8], N: [28.6, 22.5], O: [36.9, 25.8],
      },
      faces: [
        ["highlight", "ABIJ"], ["shade", "BCHI"], ["light", "CDGH"],
        ["mid", "DEFG"], ["mid", "JILK"], ["deep", "IHML"],
        ["mid", "HGNM"], ["deep", "GFON"],
      ],
    },
    camera: {
      corners: {
        A: [2.8, 11.9], B: [7.1, 11.6], C: [9.6, 7], D: [16.5, 6.5],
        E: [19.1, 10.8], F: [31.1, 10], G: [32, 24.9], H: [3.8, 26.8],
        I: [7.3, 9], J: [8.7, 8.9], K: [13.2, 4.7], L: [19.3, 4.3],
        M: [22, 8.4], N: [35.3, 7.5], O: [36, 22.1],
        P: [12.4, 15.7], Q: [15.5, 12.8], R: [22.6, 12.3], S: [25.9, 14.6],
        T: [26.2, 20.3], U: [23.2, 23.3], V: [16, 23.8], W: [12.7, 21.5],
        a: [14.8, 16.6], b: [17, 14.8], c: [22.2, 14.4], d: [24, 16],
        e: [24.2, 19.8], f: [22, 21.7], g: [16.9, 22], h: [15, 20.3],
      },
      faces: [
        ["light", "ABCDEFGH"], ["mid", "AIJB"], ["highlight", "CKLD"],
        ["shade", "DLME"], ["highlight", "EMNF"], ["deep", "FNOG"],
        ["highlight", "PQRSdcba"], ["mid", "STUfed"], ["shade", "UVWPahgf"],
        ["dark", "abcdefgh"],
      ],
    },
    shirt: {
      corners: {
        A: [2.5, 12.5], B: [9.1, 6.8], C: [14.9, 5.7], D: [16.5, 3.8],
        E: [22.6, 3.8], F: [24.4, 5.7], G: [30.1, 6.8], H: [36.4, 12.4],
        I: [32, 17.7], J: [28.2, 15.2], K: [28.6, 27.3], L: [19.6, 28.5],
        M: [10.4, 27.3], N: [10.8, 15.2], O: [7, 17.8], P: [19.6, 9.8],
        Q: [15.8, 12.5], R: [23.5, 12.4],
      },
      faces: [
        ["mid", "ABNO"], ["shade", "GHIJ"], ["light", "BCQPLMN"],
        ["mid", "PRFGJKL"], ["deep", "DEP"], ["highlight", "CDPQ"],
        ["light", "PEFR"],
      ],
    },
    envelope: {
      corners: {
        A: [2.8, 8.8], B: [34.7, 6.5], C: [36.1, 24.1], D: [4.3, 26.6],
        E: [14.5, 15.7], F: [19.4, 18.6], G: [24.8, 14.7],
        H: [14.9, 16.5], I: [19.5, 19.6], J: [24.6, 15.7],
      },
      faces: [
        ["light", "ABGFE"], ["mid", "AEHD"], ["mid", "BCJG"],
        ["shade", "EFIH"], ["deep", "FGJI"], ["highlight", "DHIJC"],
      ],
    },
  };

  // Each blade shows the outer sheet and the tucked-under return. Neighbouring
  // blades meet along half of the next blade's diagonal.
  const wheel = { corners: { O: [19.5, 16] }, faces: [] };
  const bladeCorners = [[-12, -12], [2, -12], [6, -6]];
  const bladeTones = [["highlight", "shade"], ["light", "deep"], ["mid", "deep"], ["light", "shade"]];
  for (let turn = 0; turn < 4; turn++) {
    const names = "ABCDEFGHIJKL".slice(turn * 3, turn * 3 + 3);
    bladeCorners.forEach(([x, y], index) => {
      for (let step = 0; step < turn; step++) [x, y] = [-y, x];
      wheel.corners[names[index]] = [19.5 + x, 16 + y];
    });
    const neighbouringTip = "LCFI"[turn];
    wheel.faces.push([bladeTones[turn][0], "O" + neighbouringTip + names.slice(0, 2)]);
    wheel.faces.push([bladeTones[turn][1], "O" + names.slice(1, 3)]);
  }
  shapes.pinwheel = wheel;

  function studySvg(shape, outline) {
    const paths = [];
    const edges = new Set();
    for (const [tone, route] of shape.faces) {
      const corners = [...route];
      if (outline) {
        corners.forEach((from, index) => {
          const to = corners[(index + 1) % corners.length];
          const key = [from, to].sort().join("");
          if (edges.has(key)) return;
          edges.add(key);
          paths.push(`M${shape.corners[from]}L${shape.corners[to]}`);
        });
      } else {
        const points = corners.map(corner => shape.corners[corner]).join(" ");
        paths.push(`<polygon points="${points}" fill="${tones[tone]}" />`);
      }
    }
    const drawing = outline
      ? `<path d="${paths.join("")}" fill="none" stroke="var(--dock-outline-ink, #785139)" style="stroke-width:var(--dock-outline-stroke, .65px)" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`
      : paths.join("");
    return `<svg class="fold-shape" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 32" width="39" height="32" aria-hidden="true" focusable="false">${drawing}</svg>`;
  }

  // Chrome restricts cross-file SVG masks when the comparison is opened from
  // disk. This path is copied verbatim from public/art/crane-outline.svg.
  const offlineCraneEdges = "M15.262 12.117L4.361 6M5.802 9.789L4.361 6M13.035 13.759L4.361 6M21.113 16.568L37.44 6.746M37.44 6.746L21.116 16.574M37.44 6.746L21.127 16.595M17.701 23.315L17.687 23.327M37.44 6.746L21.142 16.622M14.309 20.771L17.687 23.327M14.312 20.761L17.704 23.318M17.704 23.318L19.561 21.758M23.692 18.29L37.44 6.746M17.704 23.318L17.695 23.311M17.664 23.287L17.664 23.287M17.687 23.327L17.695 23.311M17.704 23.318L18.739 21.315M21.147 16.631L21.159 16.632M14.295 20.701L18.184 21.016M17.075 20.966L18.262 21.058M24.369 18.733L21.153 16.648M21.159 16.632L24.369 18.733M21.157 16.65L17.744 10.285M14.332 20.704L14.306 20.779M14.306 20.779L9.431 22.69M9.315 22.586L9.318 22.584M14.295 20.761L14.293 20.762M21.153 16.648L15.384 16.197M10.515 15.817L10.506 15.816M17.744 10.285L11.539 14.863M10.516 15.797L10.585 15.744M11.366 15.148L17.744 10.285M9.382 22.576L9.323 22.598M10.497 15.795L10.496 15.802M9.435 22.686L14.306 20.779M10.496 15.797L10.487 15.791M10.425 15.709L13.501 15.989M13.613 16.083L10.497 15.795M17.744 10.285L15.76 16.226M14.775 19.178L14.261 20.716M13.501 15.989L10.442 15.732M10.497 15.795L15.818 16.233M10.481 15.814L10.515 15.817M14.324 18.935L13.179 19.304M13.501 15.989L9.402 14.375M12.143 17.76L10.481 15.814M5.897 9.801L5.872 9.769M14.295 20.761L10.712 16.085M10.506 15.816L5.874 9.771M14.306 20.779L10.684 16.052M10.503 15.816L5.876 9.777M10.497 15.795L12.143 17.76M12.143 17.76L13.613 16.083M27.43 26L24.369 18.733M9.323 22.598L9.308 22.562M7.053 17.253L4.792 11.928M4.097 10.293L5.872 9.769M5.875 9.774L5.871 9.775M4.889 10.062L4.097 10.293M5.872 9.769L4.104 10.297M4.794 11.924L9.315 22.586M4.104 10.297L5.826 9.785M9.431 22.69L5.726 14.056M4.123 10.321L5.875 9.774M5.874 9.771L4.116 10.311M4.802 11.907L9.435 22.686M5.876 9.777L4.123 10.321M4.116 10.311L5.525 9.883M5.873 9.778L5.876 9.777M27.43 26L12.143 17.76M27.43 26L15.818 16.233M5.871 9.772L5.872 9.769M4.097 10.293L1.56 18.341M5.875 9.774L5.873 9.778M1.56 18.341L4.104 10.297M5.874 9.771L5.871 9.776M1.56 18.341L4.116 10.311M1.56 18.341L5.876 9.777M4.123 10.321L1.56 18.341";

  window.foldShape = function foldShape(id, outline = false) {
    if (id === "crane") {
      if (!outline) return '<img class="fold-shape" src="../../public/art/crane-icon.png" width="39" height="32" alt="" aria-hidden="true">';
      if (window.location.protocol === "file:") {
        return `<svg class="fold-shape" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 32" width="39" height="32" aria-hidden="true" focusable="false"><path d="${offlineCraneEdges}" fill="none" stroke="var(--dock-outline-ink, #785139)" style="stroke-width:var(--dock-outline-stroke, .65px)" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" /></svg>`;
      }
      const mask = 'url(../../public/art/crane-outline.svg) center / contain no-repeat';
      return `<span class="fold-shape" aria-hidden="true" style="display:inline-block;aspect-ratio:39/32;background:var(--dock-outline-ink,#785139);-webkit-mask:${mask};mask:${mask}"></span>`;
    }
    return Object.hasOwn(shapes, id) ? studySvg(shapes[id], outline) : "";
  };
})();
