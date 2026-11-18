import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    category: z.string().min(1),
    tags: z.array(z.string().min(1)).default([]),
    ruling: z.enum(["ruled", "grid"]).default("ruled"),
    art: z.enum(["crane", "river"]).optional(),
  }),
});

export const collections = { posts };
