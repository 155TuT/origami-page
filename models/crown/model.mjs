import { mesh } from "../mesh.mjs";

export const scaleToken = "dock-crown-scale";

// The four points of 折纸王子's one-sheet crown (2019-01-18).
// The front point has one continuous ridge from the tip to the base.
// The doubled paper on the two side points shows along their inner edges.
// https://www.youtube.com/watch?v=P4gDGANNtBo
export default function crown() {
  const model = mesh();
  // In the top view +y points down. Offset the front ridge from the rear tip.
  const alignment = 17 * Math.PI / 180;
  function point(x, y, z) {
    return [x * Math.cos(alignment) - y * Math.sin(alignment),
      x * Math.sin(alignment) + y * Math.cos(alignment), z];
  }

  // In this orientation the front and rear corners have been pressed inwards
  // slightly. The lower rim touches the table, while the left and right
  // points flare out to expose their return folds.
  const walls = [
    { group: "peak-front", foot: point(0, .96, 0), tip: point(0, .62, 1.39) },
    { group: "peak-right", foot: point(.91, 0, 0), tip: point(1.01, 0, 1.4) },
    { group: "peak-back", foot: point(0, -.96, 0), tip: point(0, -.62, 1.39) },
    { group: "peak-left", foot: point(-.91, 0, 0), tip: point(-1.01, 0, 1.4) },
  ];
  const quarters = [[1,1], [1,-1], [-1,-1], [-1,1]];
  const lowerRim = [];

  quarters.forEach(([sx, sy], i) => {
    const a = walls[i], b = walls[(i + 1) % walls.length];
    const foot = point(sx * .63, sy * .64, 0);
    const notch = point(sx * .66, sy * .48, .62);
    lowerRim.push(a.foot, foot);

    // The diagonal edge of the broad front/back flap continues below the V
    // down to the lateral foot. Both halves meet on one uninterrupted ridge.
    const broadFirst = i % 2 === 0;
    const ridge = broadFirst ? a : b;
    const side = broadFirst ? b : a;
    const broadRim = [ridge.tip, ridge.foot, foot, side.foot];
    const sideFace = [side.foot, side.tip, notch];
    model.group(ridge.group);
    model.panel([notch, ...(broadFirst ? broadRim : broadRim.reverse())]);
    model.group(side.group);
    model.panel(broadFirst ? sideFace : sideFace.reverse());

    // Narrow folded-back flap on the INSIDE of each lateral point. Let its
    // two free edges converge at the very tip. The crown remains open above.
    const returnCorner = point(sx * .57, sy * .34, .54);
    model.panel([side.tip, returnCorner, notch], false);
    model.edge(side.tip, returnCorner);
    model.edge(returnCorner, notch);
  });

  model.group("band");
  model.panel(lowerRim, false);
  return model;
}
