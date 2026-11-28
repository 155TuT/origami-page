// The two images share a transparent frame, including its optical margins.
export const sections = [
  { id: "home", label: "首页", path: "", model: "crane", icon: "art/crane-icon.png", outline: "art/crane-outline.svg" },
  { id: "works", label: "作品集", path: "works/", model: "scissors", icon: "art/scissors-icon.svg", outline: "art/scissors-outline.svg" },
  { id: "articles", label: "文章", path: "archives/", model: "paper-boat", icon: "art/paper-boat-icon.svg", outline: "art/paper-boat-outline.svg" },
  { id: "albums", label: "影集", path: "albums/", model: "kawasaki-rose", icon: "art/kawasaki-rose-icon.svg", outline: "art/kawasaki-rose-outline.svg" },
] as const;

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
