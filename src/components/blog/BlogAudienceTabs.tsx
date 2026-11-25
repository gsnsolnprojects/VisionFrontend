import type { BlogAudience } from "@/content/blog/types";
import { BLOG_AUDIENCES } from "@/content/blog/posts";

/** "All / Students / Engineers / Professionals / Corporate" filter buttons. `null` means All. */
export const BlogAudienceTabs = ({
  value,
  onChange,
}: {
  value: BlogAudience | null;
  onChange: (v: BlogAudience | null) => void;
}) => (
  <div className="blog-tabs" role="group" aria-label="Filter blogs by reader">
    {[{ id: null, label: "All" }, ...BLOG_AUDIENCES].map((a) => (
      <button
        key={a.label}
        className={value === a.id ? "active" : ""}
        aria-pressed={value === a.id}
        onClick={() => onChange(a.id)}
      >
        {a.label}
      </button>
    ))}
  </div>
);
