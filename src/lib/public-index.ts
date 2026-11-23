import type { PublicEntry } from "./blog";

export function groupByTag(entries: PublicEntry[]) {
  const groups = new Map<string, PublicEntry[]>();
  for (const entry of entries) {
    for (const tag of new Set(entry.tags)) {
      const matches = groups.get(tag) ?? [];
      matches.push(entry);
      groups.set(tag, matches);
    }
  }
  return groups;
}
