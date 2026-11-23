import type { PublicEntry } from "./blog";
import tagGroups from "../data/tag-groups.json";

export const searchText = (value: string) => value.normalize("NFKC").toLowerCase();

export function groupedTags(entries: PublicEntry[]) {
  const groups = new Map<string, PublicEntry[]>();
  for (const entry of entries) {
    for (const tag of new Set(entry.tags)) {
      const matches = groups.get(tag) ?? [];
      matches.push(entry);
      groups.set(tag, matches);
    }
  }
  const categories = new Map(Object.entries(tagGroups).flatMap(([label, names]) =>
    names.map(name => [name, label] as const)));
  const tags = [...groups].map(([name, matches]) => ({
    name, count: matches.length, matches, category: categories.get(name) ?? "其他",
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));

  return [...new Set([...Object.keys(tagGroups), "其他"])]
    .map(label => ({ label, tags: tags.filter(tag => tag.category === label) }))
    .filter(group => group.tags.length > 0);
}
