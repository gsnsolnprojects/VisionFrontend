import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { BLOG_POSTS } from "./src/content/blog/posts";

const SITE = "https://visionm.gsnsoln.in";

/** Writes sitemap.xml (public pages + every blog post) into the build output */
const sitemap = () => ({
  name: "vm-sitemap",
  apply: "build" as const,
  generateBundle(this: { emitFile: (f: { type: "asset"; fileName: string; source: string }) => void }) {
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: "/", lastmod: today },
      { loc: "/showcase", lastmod: today },
      { loc: "/blogs", lastmod: BLOG_POSTS[0]?.date ?? today },
      ...BLOG_POSTS.map((p) => ({ loc: `/blogs/${p.slug}`, lastmod: p.date })),
    ];
    const body = urls.map((u) => `  <url><loc>${SITE}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n");
    this.emitFile({
      type: "asset",
      fileName: "sitemap.xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`,
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false, // Disable error overlay to prevent refresh issues
    },
  },
  plugins: [
    react({
      // Fast Refresh configuration
      // Context files with hooks + components will cause full reload (expected behavior)
      jsxRuntime: "automatic",
    }),
    mode === "development" && componentTagger(),
    sitemap(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
