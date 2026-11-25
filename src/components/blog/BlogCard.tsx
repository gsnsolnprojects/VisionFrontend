import { Link } from "react-router-dom";
import type { BlogPost } from "@/content/blog/types";
import { audienceLabel } from "@/content/blog/posts";
import { BlogCover } from "./BlogCover";

export const formatBlogDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** One blog card (cover, audience tag, title, excerpt, date and read time). Needs the .vm2 styles. */
export const BlogCard = ({ post }: { post: BlogPost }) => (
  <Link className="blog-card" to={`/blogs/${post.slug}`}>
    <BlogCover art={post.cover} className="blog-cover" />
    <div className="blog-card-body">
      <span className="blog-tag">For {audienceLabel(post.audience)}</span>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
      <span className="blog-meta">
        {formatBlogDate(post.date)} · {post.readMinutes} min read
      </span>
    </div>
  </Link>
);

export const BlogGrid = ({ posts }: { posts: BlogPost[] }) => (
  <div className="blog-grid">
    {posts.map((p) => (
      <BlogCard key={p.slug} post={p} />
    ))}
  </div>
);
