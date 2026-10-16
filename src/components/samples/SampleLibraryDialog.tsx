import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getSamples,
  importSampleDataset,
  importSampleModel,
  type SampleDataset,
  type SampleModel,
} from "@/lib/api/samples";

type Kind = "datasets" | "models";

interface SampleLibraryDialogProps {
  kind: Kind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name of the project the sample is added to */
  projectName: string;
  /** Called with the new dataset id / model id once the sample is added */
  onAdded: (id: string) => void;
}

const MODEL_TYPE_LABEL: Record<string, string> = { YOLO: "YOLO", YOLO_SEG: "YOLO Segmentation", RF_DETR: "RF-DETR" };

/**
 * Pick a GSN sample dataset or model and add it to the current project as a read-only
 * link to GSN's shared copy: the user can train on it, run inference with it or remove it.
 */
export const SampleLibraryDialog: React.FC<SampleLibraryDialogProps> = ({
  kind,
  open,
  onOpenChange,
  projectName,
  onAdded,
}) => {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<SampleDataset[]>([]);
  const [models, setModels] = useState<SampleModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setAddedIds(new Set());
    setLoading(true);
    setError(null);
    getSamples()
      .then((res) => {
        setDatasets(res.datasets);
        setModels(res.models);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load samples"))
      .finally(() => setLoading(false));
  }, [open]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => {
    if (kind === "datasets") {
      return datasets
        .filter((d) => !q || [d.name, d.industry, d.description, ...d.labels].some((v) => v?.toLowerCase().includes(q)))
        .map((d) => ({
          id: d.id,
          title: d.name,
          details: `${d.industry} · ${d.totalImages} images (train ${d.trainCount} · val ${d.valCount} · test ${d.testCount})`,
          tags: d.labels.slice(0, 4),
        }));
    }
    return models
      .filter((m) => !q || [m.project, m.modelVersion, m.modelType].some((v) => v?.toLowerCase().includes(q)))
      .map((m) => ({
        id: m.id,
        title: `${m.project} · ${m.modelVersion}`,
        details: [
          MODEL_TYPE_LABEL[m.modelType] ?? m.modelType,
          m.mAP50 != null ? `mAP50 ${(m.mAP50 * 100).toFixed(1)}%` : null,
          `trained on ${m.datasetVersion}`,
        ]
          .filter(Boolean)
          .join(" · "),
        tags: [] as string[],
      }));
  }, [kind, datasets, models, q]);

  const add = async (id: string) => {
    setAddingId(id);
    try {
      if (kind === "datasets") {
        const res = await importSampleDataset(id, projectName);
        toast({ title: "Sample dataset added", description: `"${res.version}" (${res.images} images) is now in ${projectName}.` });
        onAdded(res.datasetId);
      } else {
        const res = await importSampleModel(id, projectName);
        toast({ title: "Sample model added", description: `"${res.modelVersion}" is now in ${projectName}.` });
        onAdded(res.modelId);
      }
      setAddedIds((prev) => new Set(prev).add(id));
    } catch (err) {
      toast({
        title: kind === "datasets" ? "Couldn't add sample dataset" : "Couldn't add sample model",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingId(null);
    }
  };

  const noun = kind === "datasets" ? "dataset" : "model";

  return (
    <Dialog open={open} onOpenChange={(next) => !addingId && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a sample {noun}</DialogTitle>
          <DialogDescription>
            Ready-made {noun}s from GSN. Adding one puts it in <span className="font-medium">{projectName}</span>, so
            you can {kind === "datasets" ? "train a model on it" : "run inference with it"} straight away. Samples are
            shared and read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={kind === "datasets" ? "Search by name, industry or label" : "Search by name or type"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading samples...
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No sample {noun}s found</p>
          ) : (
            rows.map((row) => {
              const added = addedIds.has(row.id);
              return (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.details}</div>
                    {row.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={added ? "secondary" : "default"}
                    disabled={!!addingId || added}
                    onClick={() => add(row.id)}
                    className="shrink-0"
                  >
                    {addingId === row.id ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...
                      </>
                    ) : added ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" /> Add
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
