// The two images share a transparent frame, including its optical margins.
const crane = { icon: "art/crane-icon.png", outline: "art/crane-outline.svg" };
export const sections = [
  { id: "home", label: "首页", path: "", ...crane },
  { id: "articles", label: "文章", path: "archives/", ...crane },
  { id: "tags", label: "标签", path: "tags/", ...crane },
  { id: "about", label: "关于", path: "about/", ...crane },
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
