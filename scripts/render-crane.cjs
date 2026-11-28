// Reprint the original crane and illustration from its committed animation clip.
const { renderFolds } = require("./render-folds.cjs");
renderFolds(["crane"], { benchmark: process.argv.includes("--benchmark") })
  .catch(error => { console.error(error); process.exitCode = 1; });
