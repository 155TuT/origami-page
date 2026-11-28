import { mesh } from "../mesh.mjs";

// Bodlaender's traditional newspaper boat. The central point is part of the
// unfolded hat. The rim dips at the middle where the two lapels overlap.
export default function paperBoat() {
  const m = mesh();
  const left = [-1.1, 0, 0.58],
    right = [1.1, 0, 0.58],
    peak = [-0.075, 0, 0.91];
  for (const side of [-1, 1]) {
    m.group(side === 1 ? "hull-near" : "hull-far");
    const middle = [0, side * 0.38, 0.3];
    const keelLeft = [-0.61, side * 0.07, 0],
      keelRight = [0.61, side * 0.07, 0];
    const collarLeft = [-0.47, side * 0.11, 0.22],
      collarRight = [0.47, side * 0.11, 0.22];
    m.panel([left, middle, keelLeft]);
    m.panel([middle, right, keelRight]);
    m.panel([middle, keelRight, keelLeft]);
    m.panel([left, collarLeft, middle]);
    m.panel([middle, collarRight, right]);
    m.panel([collarLeft, collarRight, middle]);
    m.group("peak");
    m.panel([collarLeft, peak, collarRight]);
  }
  for (const end of [-1, 1]) {
    m.panel([[end * 0.47, -0.11, 0.22], peak, [end * 0.47, 0.11, 0.22]]);
  }
  return m;
}
