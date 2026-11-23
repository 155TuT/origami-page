import type { APIRoute } from "astro";
import { allPublicEntries, href, siteName } from "../lib/blog";

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export const GET: APIRoute = async ({ site, request }) => {
  // A published feed needs SITE_URL. Use Astro's local origin during development.
  const origin = site ?? (import.meta.env.DEV ? new URL(request.url) : new URL("http://localhost:4321"));
  const absolute = (path: string) => xml(new URL(path, origin).href);
  const entries = await allPublicEntries();
  const items = entries.map(entry => `    <item>
      <title>${xml(entry.title)}</title>
      <link>${absolute(entry.url)}</link>
      <guid isPermaLink="true">${absolute(entry.url)}</guid>
      <pubDate>${entry.date.toUTCString()}</pubDate>
      <description>${xml(entry.description)}</description>
    </item>`);
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(siteName)}</title>
    <link>${absolute(href())}</link>
    <atom:link href="${absolute(href("feed.xml"))}" rel="self" type="application/rss+xml" />
    <description>作品、文章和影集</description>
    <language>zh-CN</language>
${items.join("\n")}
  </channel>
</rss>\n`;
  return new Response(feed, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
