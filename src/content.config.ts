import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const photo = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

const patterns = ["posts/*.md", "works/*.md", "albums/*.md"];
if (import.meta.env.DEV) patterns.push("posts/draft/*.md");

export const collections = {
  journal: defineCollection({
    loader: glob({ base: "./src/content", pattern: patterns }),
    schema: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      date: z.coerce.date(),
      tags: z.array(z.string().min(1)).default([]),
      ruling: z.enum(["ruled", "grid"]).default("ruled"),
      art: z.enum(["crane", "river"]).optional(),
      category: z.string().optional(),
      cover: photo.optional(),
      photos: z.array(photo).min(1).optional(),
    }),
  }),
};
