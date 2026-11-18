import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || "/",
  output: "static",
  trailingSlash: "always",
  // Only the reader's navigation starts a document request in either loading mode.
  prefetch: false,
  devToolbar: { enabled: false },
});
