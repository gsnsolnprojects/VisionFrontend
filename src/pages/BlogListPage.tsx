import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { BLOG_POSTS } from "@/content/blog/posts";
import { BlogGrid } from "@/components/blog/BlogCard";
import { PublicPageLayout, usePageMeta } from "@/components/blog/PublicPageLayout";

const PER_PAGE = 12;

/** /blogs — all posts, newest first, 12 per page (?page=2) */
const BlogListPage = () => {
  const [params, setParams] = useSearchParams();
  const pages = Math.max(1, Math.ceil(BLOG_POSTS.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  const shown = BLOG_POSTS.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  usePageMeta({
    title: "Blog — Machine vision guides for students, engineers and teams | Vision-M",
    description:
      "Practical guides on computer vision and AI visual inspection for students, engineers, quality professionals and manufacturing businesses.",
    path: "/blogs",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  const goTo = (n: number) => setParams(n > 1 ? { page: String(n) } : {});

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
          <BlogGrid posts={shown} />
          {pages > 1 && (
            <div className="pager">
              <button disabled={page === 1} onClick={() => goTo(page - 1)} aria-label="Previous page">
                ←
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? "active" : ""} onClick={() => goTo(n)}>
                  {n}
                </button>
              ))}
              <button disabled={page === pages} onClick={() => goTo(page + 1)} aria-label="Next page">
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
