// Each top-level section owns a dock and its resting artwork.
// All four currently use the original crane while their individual icons are being designed.
export const sections = [
  { id: "home", label: "首页", path: "", icon: "art/crane-icon.png" },
  { id: "archive", label: "归档", path: "archives/", icon: "art/crane-icon.png" },
  { id: "tags", label: "标签", path: "tags/", icon: "art/crane-icon.png" },
  { id: "about", label: "关于", path: "about/", icon: "art/crane-icon.png" },
] as const;

export type Section = typeof sections[number]["id"];
