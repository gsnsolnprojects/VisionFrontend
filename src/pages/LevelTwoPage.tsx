import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/pages/LoadingState";
import { levelTwoMission } from "@/components/dashboard/IndustryPicker";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { PhotoDropZone } from "@/components/playground/PhotoDropZone";
import { StepGuide } from "@/components/playground/StepGuide";
import { BILLING_ROUTE, usePlanAccess } from "@/contexts/plan-access-context";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { apiRequest } from "@/lib/api/config";
import { deleteProject } from "@/lib/api/dashboard";
import { uploadUnlabelledDataset } from "@/lib/api/datasets";
import { startLevel } from "@/lib/api/levels";
import { getSamples } from "@/lib/api/samples";
import { liveProjectFilter } from "@/lib/liveProjects";

/**
 * Level 2's first screen (/level-2/:industryId): the student's photos go here. The project is made
 * only now, at the first upload (or on choosing to label GSN's photos), and removed again if that
 * fails, so nothing counts towards the plan before there is real work in it. From there on the
 * project page (/dataset/:id) carries the level. A mission that has its project goes straight there.
 */

const LEVEL_STEPS = ["Upload", "Label", "More photos (optional)", "Train", "Test", "Report"];

const LevelTwoPage: React.FC = () => {
  const { industryId = "" } = useParams<{ industryId: string }>();
  const mission = levelTwoMission(industryId);
  const missionTitle = mission?.title;
  const missionIndustry = mission?.industryName;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company, profile, user } = useProfile();
  const planAccess = usePlanAccess();
  const limits = planAccess.data?.access?.limits;
  const [projects, setProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [busy, setBusy] = useState<"upload" | "sample" | null>(null);

  const projectLimit = limits?.projects;
  useEffect(() => {
    if (!profile?.company_id || !missionTitle || !missionIndustry || planAccess.loading) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .match(liveProjectFilter)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data as { id: string; name: string }[]) ?? [];
      const existing = list.find((p) => p.name.trim().toLowerCase() === missionTitle.toLowerCase());
      // No slot for it: only looking here, so "Continue" keeps pointing at the student's real work
      const noSlot = !existing && typeof projectLimit === "number" && list.length >= projectLimit;
      if (!noSlot) {
        await startLevel({ level: 2, mission: missionTitle, industry: missionIndustry, projectId: existing?.id ?? null }).catch(() => undefined);
      }
      if (cancelled) return;
      if (existing) navigate(`/dataset/${existing.id}`, { replace: true });
      else setProjects(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, missionTitle, missionIndustry, navigate, planAccess.loading, projectLimit]);

  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }, { label: "Level 2" }, ...(missionTitle ? [{ label: missionTitle }] : [])]);
    return () => setBreadcrumbs(null);
  }, [missionTitle, setBreadcrumbs]);

  if (!mission) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          This Level 2 doesn&apos;t exist any more. Pick an industry on the overview and start it there.
        </p>
      </div>
    );
  }
  if (!projects || (planAccess.loading && !planAccess.data)) return <LoadingState message="Opening Level 2..." />;

  const companyName = company?.name ?? "";
  const ownDatasetsAllowed = planAccess.data?.access?.features?.trainOnOwnDatasets ?? false;
  const projectsUsed = Math.max(projects.length, planAccess.data?.usage?.projects ?? 0);
  const atLimit = typeof projectLimit === "number" && projectsUsed >= projectLimit;
  const maxMB = typeof limits?.maxImageSizeMB === "number" ? limits.maxImageSizeMB : null;
  const maxImages = typeof limits?.imagesPerDataset === "number" ? limits.imagesPerDataset : null;

  /** Makes the project, puts the first work in it, and opens it; without that work there is no project */
  const startProject = async (kind: "upload" | "sample", addWork: (projectName: string) => Promise<void>) => {
    if (!user || !profile?.company_id) return;
    setBusy(kind);
    let created: { id: string; name: string } | null = null;
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: mission.title,
          description: `${mission.industryName} · ${mission.title}`,
          company_id: profile.company_id,
          created_by: user.id,
          project_type: "generic",
        })
        .select()
        .single();
      if (error || !data) throw error || new Error("Failed to create the project");
      created = data;
      await addWork(data.name);
    } catch (err) {
      if (created) await deleteProject(companyName, created.name).catch(() => undefined);
      toast({
        title: kind === "upload" ? "Upload failed" : "Couldn't add the sample",
        description: (err as Error).message,
        variant: "destructive",
      });
      setBusy(null);
      return;
    }
    await startLevel({ level: 2, mission: mission.title, industry: mission.industryName, projectId: created.id }).catch(() => undefined);
    planAccess.refresh().catch(() => undefined);
    navigate(`/dataset/${created.id}`, { replace: true });
  };

  const uploadPhotos = (images: File[]) =>
    startProject("upload", async (projectName) => {
      await uploadUnlabelledDataset(companyName, projectName, "my-images", images);
      toast({ title: "Images uploaded", description: `${images.length} image(s) added. Now label them to teach your model.` });
    });

  const labelGsnPhotos = () =>
    startProject("sample", async (projectName) => {
      const { datasets } = await getSamples();
      const wanted = mission.sample?.trim().toLowerCase();
      const sample = datasets.find((d) => d.project.trim().toLowerCase() === wanted);
      if (!sample) throw new Error("This sample isn't in the library right now.");
      await apiRequest(`/samples/datasets/${encodeURIComponent(sample.id)}/label-yourself`, {
        method: "POST",
        body: JSON.stringify({ project: projectName }),
        maxRetries: 1,
      });
      toast({ title: "GSN's photos added", description: "They're being prepared. Then label at least 20 of them." });
    });

  return (
    <motion.div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Level 2 · {mission.industryName}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{mission.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build your own model on your own photos. You can leave and continue any time.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Steps in this level">
        {LEVEL_STEPS.map((step, i) => (
          <li
            key={step}
            aria-current={i === 0 ? "step" : undefined}
            className={
              i === 0
                ? "rounded-full border border-ring bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                : "rounded-full border px-3 py-1 text-xs text-muted-foreground"
            }
          >
            {i + 1}. {step}
          </li>
        ))}
      </ol>

      {!ownDatasetsAllowed ? (
        <section className="rounded-2xl border bg-card p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" /> Your plan doesn&apos;t include this level
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Level 2 needs a plan that lets you train on your own photos.</p>
          <Button className="mt-4 gap-1.5" onClick={() => navigate(BILLING_ROUTE)}>
            See plans <ArrowRight className="h-4 w-4" />
          </Button>
        </section>
      ) : atLimit ? (
        <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="limit-heading">
          <h2 id="limit-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" /> Your project slot is in use
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan includes {projectLimit} project{projectLimit === 1 ? "" : "s"}. To start this one, open your project and choose
            &ldquo;Delete this project&rdquo; in its project menu. Everything in it goes, so download any reports you want first.
          </p>
          {projects.length > 0 && (
            <ul className="mt-4 space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/40 px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{p.name}</span>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/dataset/${p.id}`)}>
                    Open <ArrowRight className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="upload-heading">
          <div>
            <h2 id="upload-heading" className="text-xl font-semibold text-foreground">
              Upload your photos
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Your first upload makes this your project.</p>
          </div>
          <StepGuide
            what={`Pick one defect to look for, for example ${mission.example}, and take clear photos of it.`}
            why="You'll need at least 20 photos, and more is better. Include some good parts too, so the model learns the difference."
          />
          <PhotoDropZone uploading={busy === "upload"} maxMB={maxMB} spaceLeft={maxImages} onPhotos={(images) => void uploadPhotos(images)} />
          {mission.sample && (
            <div className="rounded-xl border bg-secondary/30 p-4">
              <p className="text-sm font-medium text-foreground">No photos of your own?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use GSN&apos;s photos and label them yourself. This counts as your project too.
              </p>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" disabled={!!busy} onClick={() => void labelGsnPhotos()}>
                {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                Label GSN&apos;s photos
              </Button>
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
};

export default LevelTwoPage;
