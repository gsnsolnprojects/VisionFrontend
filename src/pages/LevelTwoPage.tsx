import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, HelpCircle, Loader2, Lock, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/pages/LoadingState";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { GuidedTour, useFirstTimeTour } from "@/components/playground/GuidedTour";
import { LEVEL_TWO_START_TOUR } from "@/components/playground/levelTwoGuides";
import { PhotoDropZone } from "@/components/playground/PhotoDropZone";
import { StepGuide } from "@/components/playground/StepGuide";
import { BILLING_ROUTE, usePlanAccess } from "@/contexts/plan-access-context";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { apiRequest } from "@/lib/api/config";
import { deleteProject } from "@/lib/api/dashboard";
import { uploadUnlabelledDataset } from "@/lib/api/datasets";
import { getLevels, startLevel } from "@/lib/api/levels";
import { getSamples, type SampleDataset } from "@/lib/api/samples";
import { liveProjectFilter } from "@/lib/liveProjects";

/**
 * Level 2's first screen (/level-2): the student names their project and adds their photos. The
 * project is made only now, at the first upload (or on choosing to label GSN's photos), and removed
 * again if that fails, so nothing counts towards the plan before there is real work in it. From there
 * on the project page (/dataset/:id) carries the level. A student whose Level 2 has its project goes
 * straight there.
 */

const LEVEL_STEPS = ["Upload", "Label", "More photos (optional)", "Train", "Test", "Report"];

/** The server keeps a project's files in a folder of this name, so only plain characters */
const nameProblem = (name: string, taken: string[]) => {
  if (name.length < 2) return "Use at least 2 characters.";
  if (name.length > 30) return "Use at most 30 characters.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(name)) return "Use only letters, numbers, spaces, - and _.";
  if (name.toLowerCase() === "level 1" || taken.includes(name.toLowerCase())) return "This name is already in use. Try another.";
  return null;
};

const LevelTwoPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company, profile, user } = useProfile();
  const planAccess = usePlanAccess();
  const limits = planAccess.data?.access?.limits;
  const [projects, setProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [busy, setBusy] = useState<"upload" | "sample" | null>(null);
  const [typedName, setTypedName] = useState("");
  const [samples, setSamples] = useState<SampleDataset[]>([]);
  const [sampleId, setSampleId] = useState("");

  useEffect(() => {
    if (!profile?.company_id) return;
    let cancelled = false;
    (async () => {
      const [{ data }, { levels }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .match(liveProjectFilter)
          .order("created_at", { ascending: false }),
        getLevels().catch(() => ({ levels: [] as Awaited<ReturnType<typeof getLevels>>["levels"] })),
      ]);
      if (cancelled) return;
      const list = (data as { id: string; name: string }[]) ?? [];
      const own = levels.find((l) => l.level === 2 && list.some((p) => p.id === l.projectId));
      if (own) navigate(`/dataset/${own.projectId}`, { replace: true });
      else setProjects(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, navigate]);

  useEffect(() => {
    getSamples()
      .then(({ datasets }) => {
        setSamples(datasets);
        setSampleId((current) => current || datasets[0]?.id || "");
      })
      .catch(() => undefined);
  }, []);

  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([{ label: "Overview", href: "/dashboard" }, { label: "Level 2" }]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  // Only when the form is on the page: not for a plan without this level, or when the project slot is in use
  const projectLimitNow = limits?.projects;
  const canStart =
    !!projects &&
    !!planAccess.data?.access?.features?.trainOnOwnDatasets &&
    !(typeof projectLimitNow === "number" && Math.max(projects.length, planAccess.data?.usage?.projects ?? 0) >= projectLimitNow);
  const [showTour, setShowTour] = useFirstTimeTour("l2_start", canStart);

  if (!projects || (planAccess.loading && !planAccess.data)) return <LoadingState message="Opening Level 2..." />;

  const companyName = company?.name ?? "";
  const ownDatasetsAllowed = planAccess.data?.access?.features?.trainOnOwnDatasets ?? false;
  const projectLimit = limits?.projects;
  const projectsUsed = Math.max(projects.length, planAccess.data?.usage?.projects ?? 0);
  const atLimit = typeof projectLimit === "number" && projectsUsed >= projectLimit;
  const maxMB = typeof limits?.maxImageSizeMB === "number" ? limits.maxImageSizeMB : null;
  const maxImages = typeof limits?.imagesPerDataset === "number" ? limits.imagesPerDataset : null;

  const projectName = typedName.trim();
  const problem = nameProblem(projectName, projects.map((p) => p.name.trim().toLowerCase()));

  /** Makes the project, puts the first work in it, and opens it; without that work there is no project */
  const startProject = async (kind: "upload" | "sample", addWork: () => Promise<void>) => {
    if (!user || !profile?.company_id || problem) return;
    setBusy(kind);
    let created: { id: string; name: string } | null = null;
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: null,
          company_id: profile.company_id,
          created_by: user.id,
          project_type: "generic",
        })
        .select()
        .single();
      if (error || !data) throw error || new Error("Failed to create the project");
      created = data;
      await addWork();
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
    await startLevel({ level: 2, mission: projectName, projectId: created.id }).catch(() => undefined);
    planAccess.refresh().catch(() => undefined);
    navigate(`/dataset/${created.id}`, { replace: true });
  };

  const uploadPhotos = (images: File[]) =>
    startProject("upload", async () => {
      await uploadUnlabelledDataset(companyName, projectName, "my-images", images);
      toast({ title: "Images uploaded", description: `${images.length} image(s) added. Now label them to teach your model.` });
    });

  const labelGsnPhotos = () =>
    startProject("sample", async () => {
      await apiRequest(`/samples/datasets/${encodeURIComponent(sampleId)}/label-yourself`, {
        method: "POST",
        body: JSON.stringify({ project: projectName }),
        maxRetries: 1,
      });
      toast({ title: "GSN's photos added", description: "They're being prepared. Then label at least 20 of them." });
    });

  return (
    <motion.div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Level 2</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Your own inspection</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your own model on your own photos. You can leave and continue any time.
          </p>
        </div>
        {canStart && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTour(true)}>
            <HelpCircle className="h-4 w-4" aria-hidden="true" /> Show guide
          </Button>
        )}
      </div>
      <GuidedTour steps={LEVEL_TWO_START_TOUR} open={showTour} onClose={() => setShowTour(false)} />

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
          <div data-tour="l2-name">
            <Label htmlFor="project-name" className="text-sm font-medium text-foreground">
              Name your project
            </Label>
            <Input
              id="project-name"
              className="mt-1.5"
              value={typedName}
              maxLength={30}
              disabled={!!busy}
              placeholder="For example: Bottle cap check"
              aria-invalid={!!typedName && !!problem}
              aria-describedby="project-name-help"
              onChange={(e) => setTypedName(e.target.value)}
            />
            <p id="project-name-help" className={typedName && problem ? "mt-1.5 text-xs text-destructive" : "mt-1.5 text-xs text-muted-foreground"}>
              {typedName && problem ? problem : "Name it after what you will inspect."}
            </p>
          </div>
          <div>
            <h2 id="upload-heading" className="text-xl font-semibold text-foreground">
              Upload your photos
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Your first upload makes this your project.</p>
          </div>
          <div data-tour="l2-scope">
            <StepGuide
              what="Pick one defect to look for, for example a scratch or a missing part, and take clear photos of it."
              why="You'll need at least 20 photos, and more is better. Include some good parts too, so the model learns the difference."
            />
          </div>
          <div data-tour="l2-upload">
            {problem ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Name your project above to add photos.</p>
            ) : (
              <PhotoDropZone uploading={busy === "upload"} maxMB={maxMB} spaceLeft={maxImages} onPhotos={(images) => void uploadPhotos(images)} />
            )}
          </div>
          {samples.length > 0 && (
            <div data-tour="l2-gsn" className="rounded-xl border bg-secondary/30 p-4">
              <p className="text-sm font-medium text-foreground">No photos of your own?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use GSN&apos;s photos and label them yourself. This counts as your project too.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  disabled={!!busy}
                  className="h-9 min-w-0 rounded-md border bg-card px-3 text-sm"
                  aria-label="GSN sample"
                >
                  {samples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={!!busy || !!problem || !sampleId} onClick={() => void labelGsnPhotos()}>
                  {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Label GSN&apos;s photos
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
};

export default LevelTwoPage;
