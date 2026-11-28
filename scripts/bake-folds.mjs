// Rebuild the committed animation clips first, then print their exact last frames.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { writeMotionClips } from "./bake-motion.mjs";
import { projectMesh, token } from "./fold-projection.mjs";
import renderer from "./render-folds.cjs";

const root = new URL("../", import.meta.url);
const ids = ["crown", "paper-boat", "kawasaki-rose"];
const path = name => fileURLToPath(new URL(name, root));

// Store every triangle edge, including the flat subdivisions used for shading.
// B = boundary, U = a modelled fold with unspecified mountain/valley sign.
// This labelled 3D topology is what the printer uses to remove hidden edges.
function foldedTopology(id, model) {
  const edges = new Map();
  function edge(a, b) {
    const key = a < b ? a + "/" + b : b + "/" + a;
    if (!edges.has(key)) edges.set(key, { pair: [a, b], faces: 0, crease: false });
    return edges.get(key);
  }
  for (const face of model.faces) {
    face.forEach((a, i) => { edge(a, face[(i + 1) % face.length]).faces++; });
  }
  for (const [a, b] of model.creases) edge(a, b).crease = true;
  const lines = [...edges.values()];
  return {
    file_spec: 1.1,
    file_creator: "scripts/bake-folds.mjs",
    file_title: id,
    frame_classes: ["foldedForm"],
    vertices_coords: model.points,
    edges_vertices: lines.map(line => line.pair),
    edges_assignment: lines.map(line => line.faces === 1 ? "B" : line.crease ? "U" : "F"),
    faces_vertices: model.faces,
  };
}

await mkdir(new URL("src/lib/fold/generated/", root), { recursive: true });
execFileSync(process.env.PYTHON || (process.platform === "win32" ? "python" : "python3"), [
  path("scripts/pack_fold.py"), path("models/crane/poses.fold"), "--out", path("src/lib/fold/generated/crane-data.js"),
], { stdio: "inherit" });

if (process.argv.includes("--from-poses")) {
  execFileSync(process.execPath, [path("scripts/bake-motion.mjs"), "--pack"], { stdio: "inherit" });
} else {
  const poses = [];
  for (const id of ids) {
    const author = await import(new URL(`models/${id}/model.mjs`, root));
    const model = author.default();
    const scale = author.scaleToken ? Number(token(author.scaleToken)) : author.opticalScale;
    const mesh = projectMesh(model, author.elevation, scale);
    await writeFile(new URL(`models/${id}/creases.fold`, root), JSON.stringify(foldedTopology(id, model)) + "\n");
    poses.push({ id, mesh, elevation: author.elevation ?? 30 });
  }
  await writeMotionClips(poses);
}
await renderer.renderFolds(["crane", ...ids], { benchmark: process.argv.includes("--benchmark") });
