import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IsoBadge } from "@/components/landing/IsoBadge";
import { VM2_CSS } from "@/components/landing/vm2Styles";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

const SITE = "https://visionm.gsnsoln.in";

interface PageMeta {
  title: string;
  description: string;
  /** Path on this site, e.g. "/blogs/my-post" */
  path: string;
  /** Structured data for search engines (schema.org) */
  jsonLd?: object;
  ogType?: "website" | "article";
}

const setMeta = (attr: "name" | "property", key: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const prev = el.content;
  el.content = value;
  return () => (created ? el!.remove() : (el!.content = prev));
};

/** Sets the page title, description, social tags, canonical link and JSON-LD; restores them on leave */
export const usePageMeta = ({ title, description, path, jsonLd, ogType = "website" }: PageMeta) => {
  const json = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    const url = SITE + path;
    const undo = [
      setMeta("name", "description", description),
      setMeta("property", "og:title", title),
      setMeta("property", "og:description", description),
      setMeta("property", "og:type", ogType),
      setMeta("property", "og:url", url),
    ];
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = url;
    document.head.appendChild(canonical);
    let script: HTMLScriptElement | null = null;
    if (json) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = json;
      document.head.appendChild(script);
    }
    return () => {
      document.title = prevTitle;
      undo.forEach((u) => u());
      canonical.remove();
      script?.remove();
    };
  }, [title, description, path, json, ogType]);
};

export const siteUrl = (path: string) => SITE + path;

/** Light Vision-M header + footer for public pages other than the landing page (blog pages) */
export const PublicPageLayout = ({ children }: { children: ReactNode }) => {
  // Light theme while this page is shown (same as the landing page)
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  return (
    <div className="vm2">
      <style>{VM2_CSS}</style>
      <header>
        <nav className="wrap">
          <Link className="brand" to="/">
            Vision-M<span></span>
          </Link>
          <Link to="/#journeys">Who it’s for</Link>
          <Link to="/#industries">Industries</Link>
          <Link to="/#plans">Plans</Link>
          <Link to="/blogs">Blogs</Link>
          <Link to="/#faq">FAQs</Link>
          <Link to="/showcase">Showcase</Link>
          <span className="nav-divider" aria-hidden="true"></span>
          <Link className="nav-login" to="/auth?mode=signin">
            Log in
          </Link>
          <Link className="btn light nav-signup" to="/auth?mode=signup">
            Sign up
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      <footer>
        <div className="wrap">
          <Link className="brand" to="/">
            Vision-M<span></span>
          </Link>
          <div className="iso-badges">
            <IsoBadge id="iso9001" top="QUALITY MANAGEMENT" std="ISO" num="9001" year="2015" />
            <IsoBadge id="iso27001" top="INFORMATION SECURITY" std="ISO/IEC" num="27001" year="2022" />
          </div>
          <p>
            © 2026 Vision-M · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> ·{" "}
            <Link to="/refunds">Refunds</Link> · <Link to="/contact">Contact</Link>
          </p>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
};
