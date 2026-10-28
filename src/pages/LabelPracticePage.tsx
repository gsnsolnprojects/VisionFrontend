import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LoadingState } from "@/components/pages/LoadingState";
import { PlaygroundLabelPractice } from "@/components/playground/PlaygroundLabelPractice";
import { guidedMissionForSample } from "@/components/dashboard/IndustryPicker";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { apiRequest } from "@/lib/api/config";
import { getSamples, type SampleDataset } from "@/lib/api/samples";

/**
 * Learn to label (/practice/:sampleId): label practice straight on a GSN library sample. It needs
 * no project, so it works at the project limit too: the server lets Playground customers read the
 * sample's photos and labels, and practice labels never leave the browser. "Continue: train &
 * test" goes back to the overview to start that sample's guided challenge.
 */

interface PracticeFile {
  id: string;
  storedName: string;
  originalName: string;
  folder: string | null;
}

const LabelPracticePage: React.FC = () => {
  const { sampleId = "" } = useParams<{ sampleId: string }>();
  const navigate = useNavigate();
  const [sample, setSample] = useState<SampleDataset | null>(null);
  const [files, setFiles] = useState<PracticeFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [{ datasets }, json] = await Promise.all([
          getSamples(),
          apiRequest<{ files: Record<string, unknown>[] }>(`/dataset/${encodeURIComponent(sampleId)}/files?type=image&limit=5000`),
        ]);
        if (cancelled) return;
        const found = datasets.find((d) => d.id === sampleId);
        if (!found) throw new Error("This GSN sample isn't available for practice.");
        setSample(found);
        setFiles(
          (json.files ?? []).map((f) => ({
            id: String(f._id ?? f.id ?? f.storedName),
            storedName: String(f.storedName ?? ""),
            originalName: String(f.originalName ?? f.storedName ?? ""),
            folder: (f.folder as string) ?? null,
          }))
        );
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sampleId]);

  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }, { label: "Learn to label" }, ...(sample ? [{ label: sample.name }] : [])]);
    return () => setBreadcrumbs(null);
  }, [sample, setBreadcrumbs]);

  const continueToGuided = () => {
    const guided = sample ? guidedMissionForSample(sample.project) : null;
    navigate("/dashboard", guided ? { state: { startMission: { ...guided, mode: "guided" } } } : undefined);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Couldn&apos;t open label practice: {error}</p>
      </div>
    );
  }
  if (!sample || !files) return <LoadingState message="Opening label practice..." />;

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {sample.industry} · {sample.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Learn to label.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practise on real inspection photos, with hints when you&apos;re stuck and feedback on every box.
        </p>
      </div>
      <PlaygroundLabelPractice datasetId={sampleId} files={files} onContinue={continueToGuided} />
    </motion.div>
  );
};

export default LabelPracticePage;
