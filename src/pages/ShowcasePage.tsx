import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, FolderOpen, Maximize2, Minimize2, Moon, Plus, Sun, X } from "lucide-react";
import {
  PLACEHOLDER_SLOTS,
  SHOWCASE_CATEGORIES,
  findCategory,
  findProjectAnywhere,
  projectPath,
  type ShowcaseCategory,
  type ShowcaseProject,
} from "@/components/demo/projects";

const PAGE_BG = "bg-[rgb(var(--sc-bg))]";

function StatusPill({ status }: { status: ShowcaseProject["status"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--sc-accent)/0.4)] bg-[rgb(var(--sc-deep)/0.75)] px-2.5 py-1 backdrop-blur text-[11px] font-semibold text-[rgb(var(--sc-accent))]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--sc-accent))]" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--sc-accent))]" />
      </span>
      {status}
    </span>
  );
}

function ProjectCard({ project, onOpen }: { project: ShowcaseProject; onOpen: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cursor-following spotlight.
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.button
      layoutId={`project-${project.id}`}
      onClick={onOpen}
      onMouseMove={onMove}
      onMouseEnter={() => videoRef.current?.play().catch(() => undefined)}
      onMouseLeave={() => videoRef.current?.pause()}
      className="group relative flex h-full min-h-[520px] w-full flex-col overflow-hidden rounded-3xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel))] text-left outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sc-accent))]"
      style={{ borderRadius: 24 }}
    >
      <div className="relative h-[300px] shrink-0 overflow-hidden">
        <img
          src={project.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
          style={{ objectPosition: project.posterPosition }}
        />
        {project.previewVideo && (
          <video
            ref={videoRef}
            src={project.previewVideo}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full scale-[1.35] object-cover object-[50%_38%] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--sc-panel))] via-[rgb(var(--sc-panel)/0.4)] to-transparent" />
        <div className="absolute left-5 top-5">
          <StatusPill status={project.status} />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--mx) var(--my), rgb(var(--sc-accent)/0.10), transparent 45%)" }}
      />

      <div className="relative p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--sc-accent))]">{project.kicker}</p>
        <h3 className="mt-2 text-3xl font-bold text-[rgb(var(--sc-fg))] sm:text-4xl">{project.name}</h3>
        <p className="mt-2 max-w-xl text-[rgb(var(--sc-muted))]">{project.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="rounded-full border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.05)] px-2.5 py-1 text-xs text-[rgb(var(--sc-muted))]">
              {t}
            </span>
          ))}
        </div>
        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--sc-accent))] transition group-hover:gap-2.5">
          Open interactive demo <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${project.accent} opacity-60 transition group-hover:opacity-100`} />
    </motion.button>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07 }}
      className="relative flex min-h-[200px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.015)]"
    >
      <div className="absolute inset-0 -translate-x-full animate-[showcase-shimmer_3.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[rgb(var(--sc-tint)/0.04)] to-transparent" style={{ animationDelay: `${index * 0.4}s` }} />
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgb(var(--sc-tint)/0.1)] text-[rgb(var(--sc-subtle))]">
        <Plus className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-medium text-[rgb(var(--sc-subtle))]">Coming soon</p>
    </motion.div>
  );
}

function CategoryCard({ category, index, onOpen }: { category: ShowcaseCategory; index: number; onOpen: () => void }) {
  const { Icon, projects } = category;
  const empty = projects.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className="relative pt-4"
    >
      {/* Folder tab */}
      <div className="absolute left-8 top-0 h-8 w-36 rounded-t-2xl border border-b-0 border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel2))]" />
      <motion.button
        onClick={onOpen}
        className="group relative flex h-full min-h-[460px] w-full flex-col overflow-hidden rounded-3xl rounded-tl-xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel2))] text-left outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sc-accent))]"
      >
        <div className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${category.accent} opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-35`} />

        {/* Designed cover for the folder */}
        <div className="relative h-[260px] overflow-hidden">
          <category.Art />
        </div>

        <div className="relative mt-auto p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgb(var(--sc-tint)/0.1)] text-[rgb(var(--sc-fg))]">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-3xl font-bold text-[rgb(var(--sc-fg))] sm:text-4xl">{category.name}</h3>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                empty ? "border border-[rgb(var(--sc-warn)/0.3)] bg-[rgb(var(--sc-warn)/0.1)] text-[rgb(var(--sc-warntext))]" : "border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.05)] text-[rgb(var(--sc-muted))]"
              }`}
            >
              {empty ? "Coming soon" : `${projects.length} project${projects.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <p className="mt-3 text-[rgb(var(--sc-muted))]">{category.tagline}</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--sc-accent))] transition group-hover:gap-2.5">
            <FolderOpen className="h-4 w-4" /> Open folder <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${category.accent} opacity-60 transition group-hover:opacity-100`} />
      </motion.button>
    </motion.div>
  );
}

function EmptyFolder({ category, onBack }: { category: ShowcaseCategory; onBack: () => void }) {
  const { Icon } = category;
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-[rgb(var(--sc-tint)/0.15)] bg-[rgb(var(--sc-tint)/0.02)] px-6 py-20 text-center">
      <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${category.accent}`}>
        <Icon className="h-8 w-8 text-[rgb(var(--sc-fg))]" />
      </span>
      <h2 className="mt-6 text-2xl font-bold text-[rgb(var(--sc-fg))]">{category.name} demos are on the way</h2>
      <p className="mt-2 max-w-md text-[rgb(var(--sc-muted))]">We're preparing hands-on demos of our {category.name} projects. Check back soon.</p>
      <button
        onClick={onBack}
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--sc-tint)/0.15)] bg-[rgb(var(--sc-tint)/0.05)] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--sc-fg))] transition hover:bg-[rgb(var(--sc-tint)/0.1)]"
      >
        <ArrowLeft className="h-4 w-4" /> All categories
      </button>
    </div>
  );
}

function ProjectOverlay({
  project,
  backLabel,
  onClose,
  themeButton,
}: {
  project: ShowcaseProject;
  backLabel: string;
  onClose: () => void;
  themeButton: ReactNode;
}) {
  const { Demo } = project;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-[rgb(var(--sc-shade)/0.7)] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        layoutId={`project-${project.id}`}
        className={`fixed inset-0 z-50 overflow-hidden ${PAGE_BG}`}
        // Full-bleed when open; framer animates the radius from the card's 24px down to 0.
        style={{ borderRadius: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={`${project.name} demo`}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
      >
        <motion.div
          className="h-full overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.18, duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <div className={`sticky top-0 z-30 border-b border-[rgb(var(--sc-tint)/0.05)] bg-[rgb(var(--sc-deep)/0.8)] backdrop-blur-xl`}>
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
              <button onClick={onClose} className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--sc-muted))] hover:text-[rgb(var(--sc-fg))]">
                <ArrowLeft className="h-4 w-4" /> {backLabel}
              </button>
              <div className="flex items-center gap-3">
                <span className="hidden text-sm font-semibold text-[rgb(var(--sc-fg))] sm:inline">{project.name}</span>
                <StatusPill status={project.status} />
                {themeButton}
                <FullscreenButton />
                <button
                  onClick={onClose}
                  aria-label="Close demo"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.05)] text-[rgb(var(--sc-muted))] transition hover:rotate-90 hover:bg-[rgb(var(--sc-tint)/0.1)] hover:text-[rgb(var(--sc-fg))]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <Demo onClose={onClose} />
        </motion.div>
      </motion.div>
    </>
  );
}

type ShowcaseTheme = "dark" | "light";
const THEME_KEY = "visionm_showcase_theme";

/** The showcase's own light / dark switch (remembered in this browser; dark by default) */
function useShowcaseTheme(): [ShowcaseTheme, () => void] {
  const [theme, setTheme] = useState<ShowcaseTheme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // remembering is a convenience only
      }
      return next;
    });
  return [theme, toggle];
}

function ThemeButton({ theme, onToggle }: { theme: ShowcaseTheme; onToggle: () => void }) {
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--sc-tint)/0.15)] bg-[rgb(var(--sc-tint)/0.05)] text-[rgb(var(--sc-fg2))] transition hover:bg-[rgb(var(--sc-tint)/0.1)] hover:text-[rgb(var(--sc-fg))]"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Toggles browser fullscreen for the whole page; hidden where the Fullscreen API is unavailable (e.g. iPhone Safari). */
function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const supported = typeof document.documentElement.requestFullscreen === "function";

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    action.catch(() => undefined);
  };
  const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--sc-tint)/0.15)] bg-[rgb(var(--sc-tint)/0.05)] text-[rgb(var(--sc-fg))] transition hover:bg-[rgb(var(--sc-tint)/0.1)] hover:text-[rgb(var(--sc-fg))]"
    >
      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );
}

/**
 * Routes: /showcase (category folders) → /showcase/:categoryId (projects in a folder)
 * → /showcase/:categoryId/:projectId (demo overlay on top of its folder).
 */
export default function ShowcasePage() {
  const { categoryId, projectId } = useParams();
  const navigate = useNavigate();
  const category = findCategory(categoryId);
  const active = category?.projects.find((p) => p.id === projectId);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = active
      ? `${active.name} · GSN Showcase`
      : category
        ? `${category.name} · GSN Showcase`
        : "GSN Solutions · Project Showcase";
    return () => {
      document.title = prevTitle;
    };
  }, [active, category]);

  const categoryPath = category ? `/showcase/${category.id}` : "/showcase";
  const close = useCallback(() => navigate(categoryPath), [navigate, categoryPath]);
  const [theme, toggleTheme] = useShowcaseTheme();
  const themeButton = <ThemeButton theme={theme} onToggle={toggleTheme} />;

  if (categoryId && !category) {
    // Old links were /showcase/:projectId; send them to the project's new home.
    const legacy = findProjectAnywhere(categoryId);
    return <Navigate to={legacy ? projectPath(legacy.category.id, legacy.project.id) : "/showcase"} replace />;
  }
  if (projectId && !active) return <Navigate to={categoryPath} replace />;

  return (
    <div data-sc-theme={theme} className={`sc relative min-h-screen overflow-x-hidden ${PAGE_BG} text-[rgb(var(--sc-fg))]`}>
      <style>{`@keyframes showcase-shimmer { 0% { transform: translateX(-100%) } 60%, 100% { transform: translateX(100%) } }`}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_520px_at_80%_-10%,rgb(var(--sc-accent2)/0.22),transparent_60%),radial-gradient(800px_420px_at_0%_0%,rgb(var(--sc-accent)/0.08),transparent_65%)]" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="rounded-xl bg-[rgb(var(--sc-tint))] px-2.5 py-1.5 shadow-lg shadow-[color:rgb(var(--sc-shade)/0.3)]">
            <img src="/demo/gsn-logo.png" alt="GSN" className="h-6 w-auto" />
          </span>
          <span className="hidden text-sm font-semibold text-[rgb(var(--sc-fg))] sm:inline">GSN Solutions</span>
        </Link>
        <div className="flex items-center gap-2">
          {themeButton}
          <FullscreenButton />
          <Link to="/auth" className="rounded-lg border border-[rgb(var(--sc-tint)/0.15)] bg-[rgb(var(--sc-tint)/0.05)] px-4 py-2 text-sm font-semibold text-[rgb(var(--sc-fg))] transition hover:bg-[rgb(var(--sc-tint)/0.1)]">
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <AnimatePresence mode="wait">
          {!category ? (
            <motion.div key="home" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
              <div className="max-w-5xl py-12 sm:py-20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--sc-accent))]">Project showcase</p>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[rgb(var(--sc-fg))] sm:text-6xl">
                  What we’re building{" "}
                  <span className="whitespace-nowrap bg-gradient-to-r from-[rgb(var(--sc-accent))] via-[rgb(var(--sc-accent))] to-[rgb(var(--sc-accent2))] bg-clip-text text-transparent">
                    right now
                  </span>
                </h1>
                <p className="mt-5 text-lg text-[rgb(var(--sc-muted))]">Live, hands-on demos of GSN's current projects. Pick an area to explore its projects.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {SHOWCASE_CATEGORIES.map((c, i) => (
                  <CategoryCard key={c.id} category={c} index={i} onOpen={() => navigate(`/showcase/${c.id}`)} />
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {Array.from({ length: PLACEHOLDER_SLOTS }, (_, i) => (
                  <PlaceholderCard key={i} index={i} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key={category.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
              <div className="max-w-4xl py-10 sm:py-16">
                <button onClick={() => navigate("/showcase")} className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--sc-muted))] transition hover:text-[rgb(var(--sc-fg))]">
                  <ArrowLeft className="h-4 w-4" /> All categories
                </button>
                <div className="mt-6 flex items-center gap-4">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${category.accent} shadow-lg`}>
                    <category.Icon className="h-7 w-7 text-[rgb(var(--sc-fg))]" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--sc-accent))]">{category.tagline}</p>
                    <h1 className="text-4xl font-extrabold tracking-tight text-[rgb(var(--sc-fg))] sm:text-5xl">{category.name}</h1>
                  </div>
                </div>
                <p className="mt-5 text-lg text-[rgb(var(--sc-muted))]">{category.description}</p>
              </div>

              {category.projects.length === 0 ? (
                <EmptyFolder category={category} onBack={() => navigate("/showcase")} />
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {category.projects.map((p) => (
                    <ProjectCard key={p.id} project={p} onOpen={() => navigate(projectPath(category.id, p.id))} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative border-t border-[rgb(var(--sc-tint)/0.05)] py-8 text-center text-xs text-[rgb(var(--sc-subtle))]">
        © {new Date().getFullYear()} GSN Solutions
      </footer>

      <AnimatePresence>
        {active && category && <ProjectOverlay key={active.id} project={active} backLabel={category.name} onClose={close} themeButton={themeButton} />}
      </AnimatePresence>
    </div>
  );
}
