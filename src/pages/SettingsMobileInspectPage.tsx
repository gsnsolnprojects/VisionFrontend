import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { LoadingState } from "@/components/pages/LoadingState";
import { EmptyState } from "@/components/pages/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { fadeInUpVariants } from "@/utils/animations";
import { Smartphone, Loader2, Info } from "lucide-react";
import {
  getMobileInspectConfig,
  putMobileInspectConfig,
  listInferenceModels,
  type MobileInspectConfig,
  type InferenceModelOption,
} from "@/lib/api/mobileInspect";

const PIXEL_DISCLAIMER =
  "% of this photo’s pixels tagged as rust, not % of the real steel surface. Phone photos at different distances are not comparable without a framing guide.";

export const SettingsMobileInspectPage: React.FC = () => {
  const { sessionReady, user, profile, company, hasPermission, loading: profileLoading } = useProfile();
  const { toast } = useToast();

  const companyName = company?.name || (profile as { companies?: { name?: string } })?.companies?.name || "";

  const canPin =
    hasPermission("startTraining") ||
    hasPermission("uploadDatasets") ||
    hasPermission("manageProjects");

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState("");

  const [models, setModels] = useState<InferenceModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [confidence, setConfidence] = useState("0.25");

  const [pin, setPin] = useState<MobileInspectConfig | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });
      if (error) throw error;
      setProjects((data || []).map((p) => ({ id: String(p.id), name: String(p.name) })));
    } catch (err: unknown) {
      console.error("Failed to load projects:", err);
      toast({
        title: "Could not load projects",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  }, [profile?.company_id, toast]);

  useEffect(() => {
    if (!sessionReady || profileLoading) return;
    if (user && profile?.company_id) {
      loadProjects();
    }
  }, [sessionReady, user, profile?.company_id, profileLoading, loadProjects]);

  const loadPinAndModels = useCallback(async () => {
    if (!companyName || !selectedProjectName) {
      setModels([]);
      setPin(null);
      setSelectedModelId("");
      return;
    }

    setLoadingModels(true);
    setLoadingPin(true);
    try {
      const [modelList, pinRes] = await Promise.all([
        listInferenceModels(companyName, selectedProjectName),
        getMobileInspectConfig(companyName, selectedProjectName),
      ]);
      const segModels = modelList.filter(
        (m) => String(m.modelType || "").toUpperCase() === "YOLO_SEG"
      );
      setModels(segModels);

      const cfg = pinRes.config;
      setPin(cfg);
      if (cfg?.modelId) {
        setSelectedModelId(cfg.modelId);
        setConfidence(String(cfg.confidenceThreshold ?? 0.25));
      } else {
        setSelectedModelId("");
        setConfidence("0.25");
      }
    } catch (err: unknown) {
      console.error("Failed to load mobile inspect config:", err);
      toast({
        title: "Could not load pin config",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingModels(false);
      setLoadingPin(false);
    }
  }, [companyName, selectedProjectName, toast]);

  useEffect(() => {
    loadPinAndModels();
  }, [loadPinAndModels]);

  const handleSave = async () => {
    if (!canPin) return;
    if (!companyName || !selectedProjectName || !selectedModelId) {
      toast({
        title: "Missing fields",
        description: "Pick a project and a YOLO_SEG model.",
        variant: "destructive",
      });
      return;
    }
    const conf = parseFloat(confidence);
    if (Number.isNaN(conf) || conf < 0 || conf > 1) {
      toast({
        title: "Invalid confidence",
        description: "Use a number between 0 and 1 (for example 0.25).",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await putMobileInspectConfig({
        company: companyName,
        project: selectedProjectName,
        modelId: selectedModelId,
        confidenceThreshold: conf,
      });
      setPin(res.config);
      toast({
        title: "Pinned for Android",
        description: `${res.config.modelVersion || res.config.modelId} will be used by the inspect app. The phone does not choose a model.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Could not save pin",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!sessionReady || profileLoading) {
    return <LoadingState message="Loading mobile inspect settings..." />;
  }

  if (sessionReady && !user) {
    return null;
  }

  if (!profile?.company_id) {
    return (
      <div>
        <PageHeader title="Mobile Inspect" />
        <EmptyState
          icon={Smartphone}
          title="No workspace"
          description="You need to be part of a workspace to pin a model for the Android app."
        />
      </div>
    );
  }

  const busy = loadingProjects || loadingModels || loadingPin;

  return (
    <div>
      <PageHeader
        title="Mobile Inspect"
        description="Pin the YOLO_SEG corrosion model used by the Android inspect app"
      />

      <motion.div className="space-y-4 max-w-2xl" variants={fadeInUpVariants} initial="hidden" animate="visible">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>The Android app uses this model</AlertTitle>
          <AlertDescription>
            Phone users never pick a model. They log in with the same VisionM account, name a region, and upload photos.
            Coverage numbers are {PIXEL_DISCLAIMER}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              Pinned model
            </CardTitle>
            <CardDescription>
              One pin per project. Must be a trained YOLO_SEG checkpoint (best.pt).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-inspect-project">Project</Label>
              <Select
                value={selectedProjectName}
                onValueChange={setSelectedProjectName}
                disabled={loadingProjects || projects.length === 0}
              >
                <SelectTrigger id="mobile-inspect-project">
                  <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {busy && selectedProjectName ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading models…
              </div>
            ) : selectedProjectName ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mobile-inspect-model">YOLO_SEG model</Label>
                  {models.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No YOLO_SEG models in this project. Train a segmentation model first.
                    </p>
                  ) : (
                    <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={!canPin}>
                      <SelectTrigger id="mobile-inspect-model">
                        <SelectValue placeholder="Select a YOLO_SEG model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.modelId} value={m.modelId}>
                            {m.name || m.modelVersion || m.modelId}
                            {Number.isFinite(m.metrics?.mAP50) ? ` · mAP50 ${m.metrics!.mAP50!.toFixed(3)}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile-inspect-conf">Confidence threshold</Label>
                  <Input
                    id="mobile-inspect-conf"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    disabled={!canPin}
                  />
                  <p className="text-xs text-muted-foreground">Default 0.25. Range 0–1.</p>
                </div>

                {pin?.modelId ? (
                  <p className="text-sm text-muted-foreground">
                    Currently pinned: <span className="font-medium text-foreground">{pin.modelVersion || pin.modelId}</span>
                    {" "}at confidence {pin.confidenceThreshold}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No model is pinned for this project yet. The Android app will return an error until you save one.
                  </p>
                )}

                <Button onClick={handleSave} disabled={!canPin || saving || !selectedModelId}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save pin
                </Button>

                {!canPin && (
                  <p className="text-sm text-muted-foreground">
                    You can view the pin, but only workspace admins or ML engineers can change it.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a project to pin a model.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
