import test from "node:test";
import assert from "node:assert/strict";
import { visibleFoldEdges } from "./fold-outline.mjs";

const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
const faces = [[0, 1, 2], [0, 2, 3]];

test("a physical fold remains visible inside the silhouette, a flat subdivision disappears", () => {
  assert.equal(visibleFoldEdges(square, faces, []).length, 4);
  const creased = visibleFoldEdges(square, faces, [[0, 2]]);
  assert.equal(creased.length, 5);
  assert.ok(creased.some(([a, b]) => a[0] === a[1] && b[0] === b[1] && Math.abs(a[0] - b[0]) === 10));
});

test("a foreground strip hides only the covered middle of a crease", () => {
  const points = [...square, [2, -1], [8, -1], [8, 11], [2, 11]];
  const layers = [...faces, [4, 5, 6], [4, 6, 7]];
  const segments = visibleFoldEdges(points, layers, [[0, 2]]);
  const alongCrease = segments.filter(([a, b]) => a[0] === a[1] && b[0] === b[1]);
  const intervals = alongCrease.map(([a, b]) => [Math.min(a[0], b[0]), Math.max(a[0], b[0])])
    .sort((a, b) => a[0] - b[0]);
  assert.deepEqual(intervals, [[0, 2], [8, 10]]);
});
