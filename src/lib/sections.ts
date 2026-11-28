const navigation = [
  { id: "home", label: "首页", path: "", model: "crane" },
  { id: "works", label: "作品集", path: "works/", model: "crown" },
  { id: "articles", label: "文章", path: "archives/", model: "paper-boat" },
  { id: "albums", label: "影集", path: "albums/", model: "kawasaki-rose" },
] as const;

export const sections = navigation.map(section => ({
  ...section,
  icon: `art/folds/${section.model}/solid.png`,
  outline: `art/folds/${section.model}/outline.svg`,
}));

export type NavSection = typeof sections[number];
export type Section = NavSection["id"];

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const href = (path = "") => base + path.replace(/^\/+/, "");
export function sectionURL(id: Section, child = "") {
  return href(sections.find(section => section.id === id)!.path + child);
}

// Include the trailing slash so /archives-extra/ cannot match /archives/.
export function sectionForPath(pathname: string): Section | undefined {
  const path = pathname.replace(/\/?$/, "/");
  if (!path.startsWith(base)) return;
  const relative = path.slice(base.length);
  return sections.find(section => section.path ? relative.startsWith(section.path) : relative === "")?.id;
}
