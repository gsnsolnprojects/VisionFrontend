import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { BlogAudience } from "@/content/blog/types";
import { BLOG_AUDIENCES, BLOG_POSTS } from "@/content/blog/posts";
import { BlogGrid } from "@/components/blog/BlogCard";
import { BlogAudienceTabs } from "@/components/blog/BlogAudienceTabs";
import { PublicPageLayout, usePageMeta } from "@/components/blog/PublicPageLayout";

const PER_PAGE = 12;

/** /blogs — all posts, filter by reader (?for=students) and page (?page=2) */
const BlogListPage = () => {
  const [params, setParams] = useSearchParams();
  const forParam = params.get("for");
  const audience = BLOG_AUDIENCES.some((a) => a.id === forParam) ? (forParam as BlogAudience) : null;
  const filtered = BLOG_POSTS.filter((p) => !audience || p.audience === audience);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  usePageMeta({
    title: "Blog — Machine vision guides for students, engineers and teams | Vision-M",
    description:
      "Practical guides on computer vision and AI visual inspection for students, engineers, quality professionals and manufacturing businesses.",
    path: "/blogs",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [audience, page]);

  const update = (next: { for?: BlogAudience | null; page?: number }) => {
    const p = new URLSearchParams();
    const a = next.for !== undefined ? next.for : audience;
    if (a) p.set("for", a);
    const pg = next.page ?? 1;
    if (pg > 1) p.set("page", String(pg));
    setParams(p);
  };

  return (
    <PublicPageLayout>
      <div className="wrap blog-hero">
        <div className="eyebrow">Vision-M blog</div>
        <h1>Learn to see quality.</h1>
        <p>
          Practical guides on machine vision and AI visual inspection, for students, engineers, quality professionals
          and business teams.
        </p>
      </div>
      <section className="blog-list">
        <div className="wrap">
          <BlogAudienceTabs value={audience} onChange={(a) => update({ for: a })} />
          {shown.length ? <BlogGrid posts={shown} /> : <p className="blog-empty">No posts here yet. More are coming soon.</p>}
          {pages > 1 && (
            <div className="pager">
              <button disabled={page === 1} onClick={() => update({ page: page - 1 })} aria-label="Previous page">
                ←
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? "active" : ""} onClick={() => update({ page: n })}>
                  {n}
                </button>
              ))}
              <button disabled={page === pages} onClick={() => update({ page: page + 1 })} aria-label="Next page">
                →
              </button>
            </div>
          )}
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default BlogListPage;
