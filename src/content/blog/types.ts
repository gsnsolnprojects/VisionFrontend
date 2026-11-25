/**
 * Blog post format. Each post lives in its own file under ./posts and is listed in ./posts/index.ts.
 * Keep these files free of "@/" imports: vite.config.ts reads them to build sitemap.xml.
 *
 * Text in `p`, `list` and `callout` blocks may use **bold** for emphasis.
 */

export type BlogAudience = "students" | "engineers" | "professionals" | "corporate";

/** Which drawing the cover shows (see src/components/blog/BlogCover.tsx) */
export type BlogCoverArt = "eye" | "labels" | "models" | "dataset" | "inspector" | "metrics" | "costs" | "pilot" | "projects" | "augment";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "callout"; text: string }
  | { type: "table"; head: string[]; rows: string[][] };

export interface BlogPost {
  /** Address of the post: /blogs/<slug> */
  slug: string;
  title: string;
  /** Shown on search results (about 150 characters) */
  description: string;
  /** One or two lines shown on the cards */
  excerpt: string;
  audience: BlogAudience;
  /** YYYY-MM-DD */
  date: string;
  readMinutes: number;
  cover: BlogCoverArt;
  body: BlogBlock[];
  faqs: { q: string; a: string }[];
}
