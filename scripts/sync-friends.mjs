import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sax from "sax";

function webLink(value, base) {
  if (!value) return;
  const url = URL.parse(value, base);
  if (url && (url.protocol === "https:" || url.protocol === "http:")) return url.href;
}

function timestamp(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

// RSS 2.0 / 1.0 and Atom all expose entry metadata directly below item or entry.
export function latestArticle(xml, feedURL) {
  const parser = sax.parser(true, {xmlns: true});
  const stack = [];
  let entry, field, latest;
  let entryDepth = 0, latestTime = -Infinity;
  parser.onopentag = node => {
    const name = node.local.toLowerCase();
    const attribute = key => node.attributes[key]?.value;
    const parent = stack.at(-1);
    const base = webLink(attribute("xml:base"), parent?.base ?? feedURL) ?? parent?.base ?? feedURL;
    stack.push({name, base});
    if (!entry && ((name === "entry" && parent?.name === "feed")
      || (name === "item" && (parent?.name === "channel" || parent?.name === "rdf")))) {
      entry = {};
      entryDepth = stack.length;
    } else if (entry && stack.length === entryDepth + 1) {
      const isCore = !node.uri || node.uri === "http://www.w3.org/2005/Atom" || node.uri === "http://purl.org/rss/1.0/";
      const isDcDate = name === "date" && node.uri === "http://purl.org/dc/elements/1.1/";
      if (!isCore && !isDcDate) return;
      if (name === "link" && attribute("href")) {
        const rel = attribute("rel") ?? "alternate";
        const type = attribute("type");
        const href = attribute("href");
        if (rel === "alternate" && (!entry.url || type === "text/html")) {
          entry.url = webLink(href, base) ?? entry.url;
        }
      } else if (["title", "link", "pubdate", "published", "updated", "guid"].includes(name) || isDcDate) {
        field = {key: name, base, text: "", permalink: attribute("isPermaLink") !== "false"};
      }
    }
  };
  parser.ontext = parser.oncdata = value => { if (field) field.text += value; };
  parser.onclosetag = () => {
    if (entry && field && stack.length === entryDepth + 1) {
      const {key, base, text, permalink} = field;
      const value = text.trim();
      if (key === "title") entry.title = value;
      else if (key === "link") entry.url = webLink(value, base) ?? entry.url;
      else if (key === "guid" && permalink) entry.guidURL = webLink(value);
      else if (key === "updated") entry.updated = timestamp(value);
      else if (key !== "guid") entry.date = timestamp(value) ?? entry.date;
      field = undefined;
    }
    if (entry && stack.length === entryDepth) {
      const url = entry.url ?? entry.guidURL;
      const time = Date.parse(entry.date ?? entry.updated);
      const order = Number.isFinite(time) ? time : -Infinity;
      if (entry.title && url && (!latest || order > latestTime)) {
        latest = {title: entry.title, url};
        if (entry.date) latest.date = entry.date;
        else if (entry.updated) latest.updated = entry.updated;
        latestTime = order;
      }
      entry = undefined;
    }
    stack.pop();
  };
  parser.write(xml).close();
  if (!latest) throw new Error("订阅源没有可用的文章");
  return latest;
}

export async function syncFriends(sites, previous, fetchFeed = fetch) {
  const urls = new Set(sites.map(site => site.feed).filter(Boolean));
  const results = await Promise.all([...urls].map(async url => {
    try {
      if (!webLink(url)) throw new Error("订阅地址须为 HTTP 或 HTTPS");
      const response = await fetchFeed(url, {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return [url, latestArticle(await response.text(), response.url || url)];
    } catch (error) {
      console.warn(`友链同步失败 ${url}  ${error.message}`);
      return [url, previous[url]];
    }
  }));
  return Object.fromEntries(results.filter(([, article]) => article));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const file = fileURLToPath(new URL("../src/data/friend-updates.json", import.meta.url));
  const directory = JSON.parse(await readFile(new URL("../src/data/friends.json", import.meta.url), "utf8"));
  const previous = JSON.parse(await readFile(file, "utf8"));
  const updates = await syncFriends(directory, previous);
  if (JSON.stringify(updates) !== JSON.stringify(previous)) {
    const temporary = file + "." + randomUUID() + ".tmp";
    await writeFile(temporary, JSON.stringify(updates, null, 2) + "\n", "utf8");
    await rename(temporary, file);
  }
}
