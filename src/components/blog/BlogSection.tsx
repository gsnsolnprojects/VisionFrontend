import { Link } from "react-router-dom";
import { BLOG_POSTS } from "@/content/blog/posts";
import { BlogGrid } from "./BlogCard";

/** Landing page "From the blog" section: the latest 6 posts */
export const BlogSection = ({ eyebrow }: { eyebrow: string }) => (
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
      </div>
      <BlogGrid posts={BLOG_POSTS.slice(0, 6)} />
      <div className="blog-more">
        <Link className="btn light" to="/blogs">
          View all blogs ↗
        </Link>
      </div>
    </div>
  </section>
);
