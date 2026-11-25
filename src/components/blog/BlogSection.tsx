import { useState } from "react";
import { Link } from "react-router-dom";
import type { BlogAudience } from "@/content/blog/types";
import { BLOG_POSTS } from "@/content/blog/posts";
import { BlogGrid } from "./BlogCard";
import { BlogAudienceTabs } from "./BlogAudienceTabs";

/** Landing page "From the blog" section: latest 6 posts, filterable by reader */
export const BlogSection = ({ eyebrow }: { eyebrow: string }) => {
  const [audience, setAudience] = useState<BlogAudience | null>(null);
  const posts = BLOG_POSTS.filter((p) => !audience || p.audience === audience).slice(0, 6);

  return (
    <section id="blogs">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2>
              Read, learn,
              <br />
              then look closer.
            </h2>
          </div>
          <p>Practical guides on machine vision for students, engineers, professionals and business teams.</p>
        </div>
        <BlogAudienceTabs value={audience} onChange={setAudience} />
        <BlogGrid posts={posts} />
        <div className="blog-more">
          <Link className="btn light" to={audience ? `/blogs?for=${audience}` : "/blogs"}>
            View all blogs ↗
          </Link>
        </div>
      </div>
    </section>
  );
};
