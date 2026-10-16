import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Folder, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { useToast } from "@/hooks/use-toast";
import {
  getSamples,
  importSampleDataset,
  sampleDatasetThumbnailUrl,
  INDUSTRY_COVERS,
  type SampleDataset,
} from "@/lib/api/samples";

interface SampleDatasetPickerProps {
  /** Project the chosen dataset is copied into */
  projectName: string;
  /** Called with the new dataset id once it is in the project */
  onAdded: (datasetId: string) => void;
}

/** One dataset card with its own preview picture */
const DatasetCard: React.FC<{
  dataset: SampleDataset;
  showIndustry: boolean;
  added: boolean;
  adding: boolean;
  disabled: boolean;
  onUse: () => void;
}> = ({ dataset: d, showIndustry, added, adding, disabled, onUse }) => (
  <div className="flex flex-col overflow-hidden rounded-lg border">
    <div className="aspect-video w-full overflow-hidden bg-muted">
      <AuthenticatedImage
        src={sampleDatasetThumbnailUrl(d.id)}
        alt={`Preview of ${d.name}`}
        className="h-full w-full object-cover"
      />
    </div>
    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
      <div className="space-y-1">
        <div className="font-medium">{d.name}</div>
        {showIndustry && <div className="text-xs text-muted-foreground">{d.industry}</div>}
        {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
        <p className="text-xs text-muted-foreground">
          {d.totalImages} images · train {d.trainCount} · val {d.valCount} · test {d.testCount}
        </p>
        {d.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {d.labels.slice(0, 5).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs font-normal">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Button size="sm" variant={added ? "secondary" : "default"} disabled={disabled || added} onClick={onUse}>
        {adding ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...
          </>
        ) : added ? (
          <>
            <Check className="mr-1 h-4 w-4" /> Added
          </>
        ) : (
          "Use this dataset"
        )}
      </Button>
    </div>
  </div>
);

/**
 * Playground projects: pick a ready-made GSN dataset instead of uploading one.
 * First the industry folders (each with a cover picture), then the datasets inside the
 * chosen folder, each with a preview picture. One click copies a dataset into the project.
 */
export const SampleDatasetPicker: React.FC<SampleDatasetPickerProps> = ({ projectName, onAdded }) => {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<SampleDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSamples()
      .then((res) => !cancelled && setDatasets(res.datasets))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load sample datasets"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of datasets) counts.set(d.industry, (counts.get(d.industry) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [datasets]);

  const q = search.trim().toLowerCase();
  // Searching looks across every folder; otherwise show the open folder's datasets
  const visible = useMemo(() => {
    if (q) {
      return datasets.filter((d) =>
        [d.name, d.industry, d.description, ...d.labels].some((v) => v?.toLowerCase().includes(q))
      );
    }
    return industry ? datasets.filter((d) => d.industry === industry) : [];
  }, [datasets, industry, q]);

  // The open folder disappears if its last dataset is hidden by the superadmin meanwhile
  useEffect(() => {
    if (industry && !industries.some(([name]) => name === industry)) setIndustry(null);
  }, [industries, industry]);

  const add = async (dataset: SampleDataset) => {
    setAddingId(dataset.id);
    try {
      const res = await importSampleDataset(dataset.id, projectName);
      setAddedIds((prev) => new Set(prev).add(dataset.id));
      toast({ title: "Dataset added", description: `"${dataset.name}" (${res.images} images) is ready to train in ${projectName}.` });
      onAdded(res.datasetId);
    } catch (err) {
      toast({
        title: "Couldn't add dataset",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingId(null);
    }
  };

  const renderDatasets = (list: SampleDataset[], showIndustry: boolean) =>
    list.length === 0 ? (
      <p className="py-8 text-sm text-muted-foreground">No datasets match your search.</p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d) => (
          <DatasetCard
            key={d.id}
            dataset={d}
            showIndustry={showIndustry}
            added={addedIds.has(d.id)}
            adding={addingId === d.id}
            disabled={!!addingId}
            onUse={() => add(d)}
          />
        ))}
      </div>
    );

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Choose a dataset</CardTitle>
        <CardDescription>
          Ready-made datasets from GSN. Open an industry, pick a dataset and it's added to this project, ready to train.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {industry && !q && (
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => setIndustry(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> All industries
            </Button>
          )}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search all datasets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading datasets...
          </div>
        ) : error ? (
          <p className="py-8 text-sm text-destructive">{error}</p>
        ) : datasets.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">No sample datasets are available yet.</p>
        ) : q ? (
          renderDatasets(visible, true)
        ) : industry ? (
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">
              {industry}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                · {visible.length} dataset{visible.length === 1 ? "" : "s"}
              </span>
            </h3>
            {renderDatasets(visible, false)}
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setIndustry(name)}
                className="group overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  {INDUSTRY_COVERS[name] ? (
                    <img
                      src={INDUSTRY_COVERS[name]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Folder className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 p-4">
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    · {count} dataset{count === 1 ? "" : "s"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
