import assert from "node:assert/strict";
import test from "node:test";
import { latestArticle, syncFriends } from "./sync-friends.mjs";

const feed = "https://example.org/blog/feed.xml";

test("choose the latest published RSS item, resolve its URL and preserve XML text", () => {
  const xml = `<rss version="2.0"><channel>
    <item><title>较早</title><link>/old</link><pubDate>Sun, 01 Nov 2026 00:00:00 GMT</pubDate></item>
    <item><title><![CDATA[光 & 影]]></title><link>photo</link><pubDate>Tue, 03 Nov 2026 00:00:00 GMT</pubDate></item>
  </channel></rss>`;
  assert.deepEqual(latestArticle(xml, feed), {
    title: "光 & 影", url: "https://example.org/blog/photo", date: "2026-11-03T00:00:00.000Z",
  });
});

test("read prefixed Atom feeds and resolve the article's alternate link against xml:base", () => {
  const xml = `<a:feed xmlns:a="http://www.w3.org/2005/Atom" xml:base="/photo/"><a:entry>
    <a:title>光与影</a:title><a:link rel="self" href="api"/>
    <a:link href="album"/><a:updated>2026-11-03T00:00:00Z</a:updated>
  </a:entry></a:feed>`;
  assert.deepEqual(latestArticle(xml, feed), {
    title: "光与影", url: "https://example.org/photo/album", updated: "2026-11-03T00:00:00.000Z",
  });
});

test("retain the last snapshot after an empty or unavailable feed and drop removed sites", async () => {
  const previous = {[feed]: {title: "上次更新", url: "https://example.org/photo/"}};
  for (const response of [new Response("<rss><channel/></rss>"), new Response("", {status: 503})]) {
    let count = 0;
    const updates = await syncFriends([{feed}, {feed}], previous, async () => { count++; return response; });
    assert.equal(count, 1);
    assert.deepEqual(updates, previous);
  }
  assert.deepEqual(await syncFriends([], previous), {});
});
