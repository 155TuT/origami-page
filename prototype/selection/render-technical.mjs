import { readFile, writeFile } from "node:fs/promises";
import config from "../../astro.config.mjs";

// Keep the specimen usable from file://, including its original Markdown.
const sourceUrl = new URL("technical.md", import.meta.url);
const pageUrl = new URL("index.html", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const renderer = await config.markdown.processor.createRenderer({
  ...config.markdown,
  shikiConfig: { ...config.markdown.shikiConfig, theme: "css-variables" },
});
const { code } = await renderer.render(source, { fileURL: sourceUrl });
const escaped = source.trimEnd().replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const content = `<!-- technical:start -->
        <div class="technical-prose">${code}</div>
        <details class="technical-source"><summary>查看 Markdown 原文</summary><pre tabindex="0"><code>${escaped}</code></pre></details>
        <!-- technical:end -->`;
const page = await readFile(pageUrl, "utf8");
const markers = /<!-- technical:start -->[\s\S]*?<!-- technical:end -->/;
if (!markers.test(page)) throw new Error("Technical specimen markers are missing from index.html");
const result = page.replace(markers, () => content);
if (result !== page) await writeFile(pageUrl, result);
