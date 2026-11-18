import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;
export const siteName = "折间";
export const href = (path = "") => import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + path.replace(/^\/+/, "");
export const postURL = (entry: Post) => href("posts/" + encodeURIComponent(entry.id) + "/");
export const tagURL = (name: string) => href("tags/" + encodeURIComponent(name) + "/");
export const categoryURL = (name: string) => href("categories/" + encodeURIComponent(name) + "/");
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export const printedDate = (date: Date) => isoDate(date).replaceAll("-", ".");
export const artwork = {
  crane: { file: "crane.webp", alt: "一只银灰色的折纸鹤，双翼斜展，在纸面上投下轻轻的阴影", caption: "千纸鹤", english: "Paper crane" },
  river: { file: "river.webp", alt: "暮色中的河岸，淡紫色夕阳映在层叠的山影和水面上", caption: "河岸余晖", english: "Along the river" },
};

export async function allPosts() {
  return (await getCollection("posts")).sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export function groupPosts(posts: Post[], by: "category" | "tags" | "year") {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const keys = by === "year" ? [isoDate(post.data.date).slice(0, 4)] : by === "category" ? [post.data.category] : post.data.tags;
    for (const key of new Set(keys)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(post);
    }
  }
  return groups;
}
