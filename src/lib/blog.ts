import { getCollection, type CollectionEntry } from "astro:content";
import { href, sectionURL } from "./sections";
export { href } from "./sections";

export type Post = CollectionEntry<"journal">;
export type Photo = NonNullable<Post["data"]["cover"]>;
export type PublicEntry = {
  kind: "work" | "post" | "album";
  title: string;
  description: string;
  date: Date;
  tags: string[];
  url: string;
  text: string;
  cover?: { src: string; alt: string };
};
export const siteName = "折间";
export const tagURL = (name: string) => href("search/") + "?" + new URLSearchParams({ tag: name });
export const tagAnchor = (name: string) => "tag-" + encodeURIComponent(name);
const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});
export const isoDate = (date: Date) => calendar.format(date);
export const printedDate = (date: Date) => isoDate(date).replaceAll("-", ".");
export const artwork = {
  crane: { file: "crane.webp", alt: "一只赤陶色的折纸鹤，双翼斜展，在纸面上投下轻轻的阴影", caption: "千纸鹤", english: "Paper crane" },
  river: { file: "river.webp", alt: "暮色中的河岸，淡紫色夕阳映在层叠的山影和水面上", caption: "河岸余晖", english: "Along the river" },
};
export const entrySlug = (entry: Post) => entry.id.slice(entry.id.lastIndexOf("/") + 1);
export const isDraft = (entry: Post) => entry.id.startsWith("posts/draft/");
export const localDraftPreview = (url: URL) => import.meta.env.DEV &&
  (url.hostname === "localhost" || url.hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(url.hostname));

export function entryKind(entry: Post): PublicEntry["kind"] {
  if (entry.id.startsWith("works/")) return "work";
  if (entry.id.startsWith("albums/")) return "album";
  return "post";
}

export function postURL(entry: Post) {
  const slug = encodeURIComponent(entrySlug(entry)) + "/";
  if (isDraft(entry)) return sectionURL("articles", "draft/" + slug);
  const section = { post: "articles", work: "works", album: "albums" } as const;
  return sectionURL(section[entryKind(entry)], slug);
}

export function photoURL(src: string) {
  return /^https?:\/\//i.test(src) ? src : href(src);
}

export function albumCover(entry: Post) {
  const photos = entry.data.photos;
  if (!photos?.length) throw new Error(`影集 ${entry.id} 需要在 photos 中按阅读顺序填写照片。`);
  return entry.data.cover ?? photos[0];
}

const newestFirst = (a: Post, b: Post) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);
export async function published(kind?: PublicEntry["kind"]) {
  const entries = await getCollection("journal", entry => !isDraft(entry) && (!kind || entryKind(entry) === kind));
  // This path belongs to the local draft index, even when there are no drafts.
  if (entries.some(entry => entry.id === "posts/draft")) throw new Error("文章文件名 draft 已由草稿列表使用。");
  return entries.sort(newestFirst);
}

export const allPosts = () => published("post");
export async function allDrafts() {
  return import.meta.env.DEV ? (await getCollection("journal", isDraft)).sort(newestFirst) : [];
}

export function toEntry(entry: Post): PublicEntry {
  const { title, description, date, tags, photos, art } = entry.data;
  const kind = entryKind(entry);
  const cover = kind === "album" ? albumCover(entry) : entry.data.cover;
  return {
    kind, title, description, date, tags: [...new Set(tags)], url: postURL(entry),
    text: [entry.body, ...(photos ?? []).map(photo => [photo.alt, photo.caption].join(" "))].join("\n"),
    cover: cover ? { src: photoURL(cover.src), alt: cover.alt }
      : art ? { src: href("art/" + artwork[art].file), alt: artwork[art].alt } : undefined,
  };
}

export async function allPublicEntries() {
  return (await published()).map(toEntry);
}
