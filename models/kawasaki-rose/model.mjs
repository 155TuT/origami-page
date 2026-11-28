import { mesh } from "../mesh.mjs";

export const elevation = 60;
export const scaleToken = "dock-rose-scale";

// Asahi Press identifies the open rose separately from the bud. Four curling
// lips wrap a square twist. Each strip runs from an attached fold up to its
// free edge and over the lip: the two rims have different radii and heights.
export default function rose() {
  const m = mesh();
  const rad = Math.PI / 180;
  const polar = (radius, theta, height) => [radius * Math.cos(theta), radius * Math.sin(theta), height];

  // A radial section runs from the sunken square twist, up the open crown,
  // over its rolled free rim, down a broad side petal and into the tucked base.
  // The change in bearing follows the four corners wrapping around the twist.
  // The fourth coordinate is the height of the overlap along that margin.
  const profile = [
    [0.08, -225, 0.8, 0.05],
    [0.15, -194, 0.86, 0.12],
    [0.24, -158, 0.94, 0.17],
    [0.39, -113, 0.98, 0.22],
    [0.62, -85, 1.01, 0.24],
    [0.77, -53, 0.83, 0.2],
    [0.98, -24, 0.88, 0.18],
    [1.04, -10, 0.75, 0.14],
    [0.94, -3, 0.58, 0.1],
    [0.74, 6, 0.25, 0.04],
    [0.55, 13, 0.03, 0],
  ];
  const across = [0, 0.1, 0.23, 0.38, 0.53, 0.68, 0.84, 1];
  const quarters = [];
  for (let petal = 0; petal < 4; petal++) {
    m.group("petal-" + petal);
    const grid = profile.map(([r, twist, h, overlap], i) =>
      across.map((t) => {
        // The free corners extend beyond the middle of each folded edge.
        const bulge = Math.sin(Math.PI * t);
        const turn = (1 - t) ** 3 * Math.sin((i / (profile.length - 1)) * Math.PI);
        const radius = r * (1 - 0.14 * bulge + 0.05 * turn);
        const angle = (petal * 90 + twist + t * 90 + 26 - 13 * turn) * rad;
        const arch = 0.085 * bulge * Math.sin((i / (profile.length - 1)) * Math.PI);
        const z = h + overlap * (0.56 - t) + arch;
        return polar(radius, angle, z);
      }),
    );
    quarters.push(grid);
    for (let i = 0; i < grid.length - 1; i++) {
      const inner = grid[i],
        outer = grid[i + 1];
      for (let j = 0; j < across.length - 1; j++) {
        m.panel([inner[j], outer[j], outer[j + 1], inner[j + 1]], false);
      }
      m.edge(inner[0], outer[0]);
    }
    // Only the rolled free rim, not its shading subdivisions, is an ink edge.
    for (let j = 0; j < across.length - 1; j++) m.edge(grid[7][j], grid[7][j + 1]);
    for (let j = 0; j < across.length - 1; j++) m.edge(grid[4][j], grid[4][j + 1]);
  }
  // The returning underside of each petal disappears under the next lip.
  // These four narrow connecting surfaces keep the turned edges solid in
  // profile while allowing the near lip to conceal the inner paper.
  const centre = [0, 0, 0.77],
    bottom = [0, 0, 0.03];
  quarters.forEach((grid, k) => {
    m.group("petal-" + k);
    const previous = quarters[(k + 3) % 4];
    for (let i = 0; i < profile.length - 1; i++) {
      m.panel([grid[i][0], previous[i].at(-1), previous[i + 1].at(-1), grid[i + 1][0]], false);
    }
    m.panel([centre, grid[0][0], previous[0].at(-1)], false);
    for (let j = 0; j < across.length - 1; j++) {
      m.panel([centre, grid[0][j], grid[0][j + 1]], false);
      const end = grid.at(-1);
      m.panel([bottom, end[j + 1], end[j]], false);
    }
  });
  return m;
}
