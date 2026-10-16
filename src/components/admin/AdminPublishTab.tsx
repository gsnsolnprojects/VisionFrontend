import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CloudUpload, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { useToast } from "@/hooks/use-toast";
import {
  getPublishDatasets,
  savePublishSelection,
  setPublishProject,
  type PublishProject,
  type PublishVersion,
} from "@/lib/api/admin";
import { errorMessage, formatDate } from "./adminFormat";

const formatBytes = (bytes: number): string => {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
};

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((id) => b.has(id));

/**
 * Superadmin: choose which dataset versions (and the models trained on them) get copied to
 * the live AWS setup. Saving only stores the choice; the copy is a separate step.
 * Shown only on the local setup.
 */
export const AdminPublishTab: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<PublishProject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [onlySelected, setOnlySelected] = useState(false);
  const [projectBusy, setProjectBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublishDatasets();
      const picked = new Set(data.projects.flatMap((p) => p.versions.filter((v) => v.selected).map((v) => v.id)));
      setProjects(data.projects);
      setSaved(picked);
      setSelected(new Set(picked));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allVersions = useMemo(() => (projects ?? []).filter((p) => p.publish).flatMap((p) => p.versions), [projects]);

  // What the current ticks add up to; a model folder shared by two models is counted once
  const summary = useMemo(() => {
    const picked = allVersions.filter((v) => selected.has(v.id));
    const modelFolders = new Map<string, number>();
    let models = 0;
    for (const v of picked) {
      for (const m of v.models.filter((m) => m.onThisServer)) {
        models++;
        modelFolders.set(m.folder, m.sizeBytes);
      }
    }
    const datasetBytes = picked.reduce((sum, v) => sum + v.sizeBytes, 0);
    const modelBytes = [...modelFolders.values()].reduce((sum, b) => sum + b, 0);
    return { versions: picked.length, models, datasetBytes, modelBytes, total: datasetBytes + modelBytes };
  }, [allVersions, selected]);

  const changed = !sameSet(saved, selected);

  const toggle = (version: PublishVersion, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(version.id);
      else next.delete(version.id);
      return next;
    });
  };

  const switchProject = async (project: PublishProject, publish: boolean) => {
    if (!project.projectId) return;
    setProjectBusy(project.projectId);
    try {
      const result = await setPublishProject(project.projectId, publish);
      setProjects((prev) => (prev ?? []).map((p) => (p.projectId === project.projectId ? { ...p, publish } : p)));
      if (!publish) {
        // The backend also unticked this project's datasets
        const ids = new Set(project.versions.map((v) => v.id));
        const drop = (set: Set<string>) => new Set([...set].filter((id) => !ids.has(id)));
        setSelected(drop);
        setSaved(drop);
      }
      toast({
        title: publish ? "Project published" : "Project hidden on the live site",
        description: publish
          ? `${project.project} shows on the live site.`
          : `${project.project} won't show on the live site${result.unticked ? `; ${result.unticked} ticked dataset${result.unticked === 1 ? " was" : "s were"} unticked` : ""}.`,
      });
    } catch (err) {
      toast({ title: "Couldn't change the project", description: errorMessage(err), variant: "destructive" });
    } finally {
      setProjectBusy(null);
    }
  };

  const toggleProject = (project: PublishProject, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const v of project.versions.filter((v) => v.onThisServer)) {
        if (on) next.add(v.id);
        else next.delete(v.id);
      }
      return next;
    });
  };

  const save = async () => {
    if (!changed) {
      toast({ title: "Nothing to save", description: "Your selection is already saved." });
      return;
    }
    setSaving(true);
    try {
      const result = await savePublishSelection([...selected]);
      setSaved(new Set(selected));
      toast({
        title: "Selection saved",
        description: `${result.selected} dataset version${result.selected === 1 ? "" : "s"} marked for the live site.`,
      });
    } catch (err) {
      toast({ title: "Couldn't save", description: errorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Measuring datasets and models on this computer..." />;
  if (error) return <ErrorState title="Couldn't load datasets" message={error} onRetry={load} />;
  if (!projects) return null;

  const visibleProjects = projects
    .map((p) => ({ ...p, versions: onlySelected ? p.versions.filter((v) => selected.has(v.id)) : p.versions }))
    .filter((p) => !onlySelected || p.versions.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" aria-hidden="true" />
            Publish to live
          </CardTitle>
          <CardDescription>
            Choose which projects show on the live AWS site, and tick the dataset versions to copy there. Models
            trained on them come along. Nothing is copied, moved, or deleted here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Dataset versions</div>
              <div className="text-xl font-medium">{summary.versions}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Models</div>
              <div className="text-xl font-medium">{summary.models}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Datasets + models</div>
              <div className="text-xl font-medium">
                {formatBytes(summary.datasetBytes)} + {formatBytes(summary.modelBytes)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">To upload</div>
              <div className="text-xl font-medium">{formatBytes(summary.total)}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="only-selected" checked={onlySelected} onCheckedChange={setOnlySelected} />
              <Label htmlFor="only-selected">Show only ticked</Label>
            </div>
            {changed && (
              <Button variant="outline" onClick={() => setSelected(new Set(saved))} disabled={saving}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Undo changes
              </Button>
            )}
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {changed ? "Save selection" : "Saved"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {visibleProjects.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing ticked yet. Turn off "Show only ticked" to see every dataset.</p>
      )}

      {visibleProjects.map((project) => {
        const usable = project.publish ? project.versions.filter((v) => v.onThisServer) : [];
        const tickedHere = usable.filter((v) => selected.has(v.id)).length;
        const allTicked = usable.length > 0 && tickedHere === usable.length;
        const switchId = `publish-${project.projectId ?? project.project}`;
        return (
          <Card key={`${project.company}/${project.project}`} className={project.publish ? undefined : "opacity-70"}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{project.project}</CardTitle>
                <CardDescription>
                  {project.company ?? "Unknown company"} ·{" "}
                  {project.publish ? `${tickedHere} of ${project.versions.filter((v) => v.onThisServer).length} ticked` : "Hidden on the live site"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {project.projectId && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id={switchId}
                      checked={project.publish}
                      disabled={projectBusy === project.projectId}
                      onCheckedChange={(on) => void switchProject(project, on)}
                    />
                    <Label htmlFor={switchId}>Publish project</Label>
                  </div>
                )}
                {usable.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => toggleProject(project, !allTicked)}>
                    {allTicked ? "Untick all" : "Tick all"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Images</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead>Models trained on it</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.versions.map((v) => (
                    <TableRow key={v.id} className={v.onThisServer ? undefined : "text-muted-foreground"}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(v.id)}
                          onCheckedChange={(on) => toggle(v, on === true)}
                          disabled={!v.onThisServer || !project.publish}
                          aria-label={`Publish ${project.project} ${v.version}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{v.version}</div>
                        {!v.onThisServer && (
                          <Badge variant="outline" className="mt-1 gap-1">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Files missing on this computer
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{v.totalImages}</TableCell>
                      <TableCell className="text-right">{v.onThisServer ? formatBytes(v.sizeBytes) : "—"}</TableCell>
                      <TableCell>
                        {v.models.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {v.models.map((m) => (
                              <Badge key={m.id} variant={m.onThisServer ? "secondary" : "outline"} title={m.modelId}>
                                {m.modelType} {m.modelVersion}
                                {m.onThisServer ? ` · ${formatBytes(m.sizeBytes)}` : " · files missing"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(v.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
