import { Fragment, useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { BlogAudience, BlogBlock } from "@/content/blog/types";
import { BLOG_POSTS, audienceLabel, getBlogPost } from "@/content/blog/posts";
import { BlogCover } from "@/components/blog/BlogCover";
import { BlogGrid, formatBlogDate } from "@/components/blog/BlogCard";
import { PublicPageLayout, siteUrl, usePageMeta } from "@/components/blog/PublicPageLayout";

/** Call to action at the end of a post, by reader */
const CTA: Record<BlogAudience, { title: string; text: string; label: string; to: string }> = {
  students: {
    title: "Try it on real inspection images.",
    text: "Playground gives you guided lessons and sample datasets from real projects. Label, train and test in your browser.",
    label: "Explore Playground ↗",
    to: "/auth?mode=signup&plan=playground",
  },
  engineers: {
    title: "Test your idea on your own data.",
    text: "Label images, train nano or small models and check the results in Vision-M Studio, all in the browser.",
    label: "Sign up ↗",
    to: "/auth?mode=signup",
  },
  professionals: {
    title: "Build hands-on AI inspection skills.",
    text: "Start with guided steps and real sample datasets, then move on to your own inspection problem.",
    label: "Explore Playground ↗",
    to: "/auth?mode=signup&plan=playground",
  },
  corporate: {
    title: "Have an inspection challenge in mind?",
    text: "Tell us about your product, defect and line. We’ll help you scope a focused evaluation.",
    label: "Contact us ↗",
    to: "/contact",
  },
};

/** Renders **bold** inside a text block */
const inline = (text: string): ReactNode =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );

const Block = ({ block }: { block: BlogBlock }) => {
  switch (block.type) {
    case "p":
      return <p>{inline(block.text)}</p>;
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "callout":
      return (
        <div className="post-callout">
          <p>{inline(block.text)}</p>
        </div>
      );
    case "list": {
      const items = block.items.map((t, i) => <li key={i}>{inline(t)}</li>);
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "table":
      return (
        <div className="post-table-wrap">
          <table className="post-table">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
};

/** /blogs/:slug — one post */
const BlogPostPage = () => {
  const { slug = "" } = useParams();
  const post = getBlogPost(slug);

  usePageMeta(
    post
      ? {
          title: `${post.title} | Vision-M Blog`,
          description: post.description,
          path: `/blogs/${post.slug}`,
          ogType: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BlogPosting",
                headline: post.title,
                description: post.description,
                datePublished: post.date,
                author: { "@type": "Organization", name: "Vision-M" },
                publisher: { "@type": "Organization", name: "GSN Solutions" },
                mainEntityOfPage: siteUrl(`/blogs/${post.slug}`),
              },
              {
                "@type": "FAQPage",
                mainEntity: post.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ],
          },
        }
      : { title: "Post not found | Vision-M Blog", description: "This blog post could not be found.", path: `/blogs/${slug}` },
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  if (!post) {
    return (
      <PublicPageLayout>
        <div className="post">
          <h1>We couldn’t find that post.</h1>
          <p>It may have moved. Browse all posts instead.</p>
          <Link className="btn" to="/blogs">
            All blogs ↗
          </Link>
        </div>
      </PublicPageLayout>
    );
  }

  // Related: same reader first, then the newest others
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const related = [...others.filter((p) => p.audience === post.audience), ...others.filter((p) => p.audience !== post.audience)].slice(0, 3);
  const cta = CTA[post.audience];

  return (
    <PublicPageLayout>
      <article className="post">
        <div className="crumbs" role="navigation" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/blogs">Blogs</Link>
          <span>/</span>
          <Link to={`/blogs?for=${post.audience}`}>{audienceLabel(post.audience)}</Link>
        </div>
        <h1>{post.title}</h1>
        <span className="blog-meta">
          For {audienceLabel(post.audience)} · {formatBlogDate(post.date)} · {post.readMinutes} min read
        </span>
        <BlogCover art={post.cover} className="post-cover" />

        <div className="post-body">
          {post.body.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>

        {post.faqs.length > 0 && (
          <div className="post-faq">
            <h2>Frequently asked questions</h2>
            {post.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        )}

        <div className="post-cta">
          <h3>{cta.title}</h3>
          <p>{cta.text}</p>
          <Link className="btn lime" to={cta.to}>
            {cta.label}
          </Link>
        </div>

        <Link className="post-back" to="/blogs">
          ← Back to all blogs
        </Link>
      </article>

      {related.length > 0 && (
        <section className="related">
          <div className="wrap">
            <div className="eyebrow">Keep reading</div>
            <h2>More from the blog</h2>
            <BlogGrid posts={related} />
            <div className="blog-more">
              <Link className="btn light" to="/blogs">
                View more blogs ↗
              </Link>
            </div>
          </div>
        </section>
      )}
    </PublicPageLayout>
  );
};

export default BlogPostPage;
