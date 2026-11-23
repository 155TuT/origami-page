export interface Experience {
  period: string;
  title: string;
  description?: string;
}

// Only publish identity and contact details that the author supplies here.
export const profile = {
  name: "",
  introduction: "我在这里整理设计与代码作品，写文章，也用影集记录路上的风景。",
  experience: [] as Experience[],
  email: "",
};

export const contactEmail = (import.meta.env.PUBLIC_CONTACT_EMAIL || profile.email).trim();
