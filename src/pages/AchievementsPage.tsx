import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { BADGES, BADGE_GROUPS, BadgeMedal } from "@/components/playground/badges";
import { getBadges, type EarnedBadge } from "@/lib/api/badges";
import { cn } from "@/lib/utils";

/** The student's whole collection: what they've earned, and how to earn the rest */
const AchievementsPage: React.FC = () => {
  const [earned, setEarned] = useState<EarnedBadge[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { setItems: setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Overview", href: "/dashboard" }, { label: "Achievements" }]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  useEffect(() => {
    getBadges()
      .then(({ badges }) => setEarned(badges))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return <p className="mx-auto max-w-6xl rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Couldn&apos;t load your badges. Please try again.</p>;
  }
  if (!earned) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading your badges...
      </div>
    );
  }

  const byId = new Map(earned.map((b) => [b.id, b]));
  const earnedCount = BADGES.filter((b) => byId.has(b.id)).length;

  return (
    <motion.div className="mx-auto max-w-6xl space-y-8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Achievements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every badge you&apos;ve earned, and what it takes to earn the rest.</p>
      </div>

      <section className="rounded-2xl bg-[#171f1b] p-5 text-[#f5f5ee] md:p-6" aria-label="Your progress">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">Your collection</p>
          <p className="text-2xl font-bold">
            {earnedCount} <span className="text-sm font-normal text-[#bec9b0]">of {BADGES.length} badges</span>
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={BADGES.length}
          aria-valuenow={earnedCount}
          aria-label="Badges earned"
        >
          <div className="h-full rounded-full bg-[#e9ff65] transition-all duration-500" style={{ width: `${(earnedCount / BADGES.length) * 100}%` }} />
        </div>
      </section>

      {BADGE_GROUPS.map((group) => {
        const list = BADGES.filter((b) => b.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`badges-${group.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`badges-${group.id}`} className="text-lg font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {list.filter((b) => byId.has(b.id)).length} of {list.length} earned
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{group.text}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((badge) => {
                const got = byId.get(badge.id);
                return (
                  <li key={badge.id} className={cn("flex items-start gap-4 rounded-xl border p-4", got ? "bg-card" : "bg-background/40")}>
                    <BadgeMedal badge={badge} earned={!!got} size={64} />
                    <div className="min-w-0">
                      <p className={cn("font-semibold", got ? "text-foreground" : "text-muted-foreground")}>{badge.name}</p>
                      {got ? (
                        <>
                          <p className="mt-0.5 text-sm text-muted-foreground">{badge.learned}</p>
                          {got.detail && <p className="mt-1 text-sm font-medium text-foreground">{got.detail}</p>}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Earned {new Date(got.earnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            {got.mission && ` · ${got.mission}`}
                          </p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-sm text-muted-foreground">{badge.how}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </motion.div>
  );
};

export default AchievementsPage;
