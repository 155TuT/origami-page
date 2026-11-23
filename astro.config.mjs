import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import katex from "katex";

const base = process.env.BASE_PATH || "/";
function renderMath(node, context) {
  const value = katex.renderToString(node.value, {
    displayMode: node.type === "math",
    output: "mathml",
  });
  context.replaceNode(node, { type: "html", value });
}

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base,
  markdown: {
    processor: satteri({
      features: { math: true },
      mdastPlugins: [{
        name: "journal-markdown",
        math: renderMath,
        inlineMath: renderMath,
        image(node, context) {
          if (node.url.startsWith("/media/")) {
            context.setField(node, "url", base.replace(/\/$/, "") + node.url);
          }
        },
      }],
    }),
  },
  output: "static",
  trailingSlash: "always",
  // Only the reader's navigation starts a document request in either loading mode.
  prefetch: false,
  devToolbar: { enabled: false },
});
