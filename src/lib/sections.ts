// Each top-level section owns a dock and its resting artwork.
// All four currently use the original crane while their individual icons are being designed.
export const sections = [
  { id: "home", label: "首页", path: "", icon: "art/crane-icon.png" },
  { id: "articles", label: "文章", path: "archives/", icon: "art/crane-icon.png" },
  { id: "tags", label: "标签", path: "tags/", icon: "art/crane-icon.png" },
  { id: "about", label: "关于", path: "about/", icon: "art/crane-icon.png" },
] as const;

export type Section = typeof sections[number]["id"];

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
