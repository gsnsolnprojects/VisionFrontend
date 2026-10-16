import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { useToast } from "@/hooks/use-toast";
import {
  addAllToSampleLibrary,
  addToSampleLibrary,
  deleteSampleLibraryItem,
  getSampleLibrary,
  updateSampleLibraryItem,
  type SampleLibraryItem,
  type SampleLibraryResponse,
} from "@/lib/api/admin";
import { ConfirmByTypingDialog } from "./ConfirmByTypingDialog";
import { errorMessage } from "./adminFormat";

const ALL = "__all__";

/** Edit name / industry / description of a library entry */
const EditItemDialog: React.FC<{
  item: SampleLibraryItem | null;
  industries: string[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ item, industries, onClose, onSaved }) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("General");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setIndustry(item.industry);
      setDescription(item.description);
    }
  }, [item]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await updateSampleLibraryItem(item.id, { name: name.trim(), industry, description: description.trim() });
      toast({ title: "Saved", description: `"${name.trim()}" was updated for every customer.` });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save", description: errorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit sample dataset</DialogTitle>
          <DialogDescription>
            Source: {item?.dataset ? `${item.dataset.project} / ${item.dataset.version}` : "dataset missing"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sample-name">Name shown to customers</Label>
            <Input id="sample-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {industries.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sample-description">Description (optional)</Label>
            <Textarea
              id="sample-description"
              value={description}
              maxLength={300}
              rows={3}
              placeholder="What the dataset shows, e.g. scratches and dents on car seat leather"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Superadmin: the Playground sample dataset library. Everything here applies to every
 * customer immediately. Deleting an entry also permanently deletes GSN's original dataset.
 */
export const AdminSampleLibraryTab: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<SampleLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [toAdd, setToAdd] = useState("");
  const [editing, setEditing] = useState<SampleLibraryItem | null>(null);
  const [deleting, setDeleting] = useState<SampleLibraryItem | null>(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setData(await getSampleLibrary());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (i) =>
        (industryFilter === ALL || i.industry === industryFilter) &&
        (!q ||
          [i.name, i.industry, i.description, i.dataset?.project, i.dataset?.version].some((v) =>
            v?.toLowerCase().includes(q)
          ))
    );
  }, [data, search, industryFilter]);

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await action();
      toast({ title: success });
      await load(false);
    } catch (err) {
      toast({ title: "Something went wrong", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const addAll = async () => {
    setAddingAll(true);
    try {
      const res = await addAllToSampleLibrary();
      toast({ title: res.added > 0 ? `Added ${res.added} datasets` : "Nothing new to add" });
      await load(false);
    } catch (err) {
      toast({ title: "Couldn't add datasets", description: errorMessage(err), variant: "destructive" });
    } finally {
      setAddingAll(false);
    }
  };

  const addOne = () => {
    if (!toAdd) return;
    const id = toAdd;
    run(id, () => addToSampleLibrary({ datasetId: id }), "Added to the library").then(() => setToAdd(""));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const item = deleting;
    setBusyId(item.id);
    try {
      await deleteSampleLibraryItem(item.id, item.name);
      toast({ title: "Dataset deleted", description: `"${item.name}" was removed from the library and deleted from GSN.` });
      setDeleting(null);
      await load(false);
    } catch (err) {
      toast({ title: "Couldn't delete", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Loading sample library..." />;
  if (error || !data) return <ErrorState title="Couldn't load the sample library" message={error ?? ""} onRetry={() => load()} />;

  const visibleCount = data.items.filter((i) => i.isVisible).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add datasets to the library</CardTitle>
          <CardDescription>
            Playground customers can only pick datasets from this library. {data.items.length} in the library ·{" "}
            {visibleCount} shown to customers · {data.available.length} more GSN datasets can be added.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={toAdd} onValueChange={setToAdd} disabled={data.available.length === 0}>
            <SelectTrigger className="sm:w-96">
              <SelectValue placeholder={data.available.length ? "Choose a GSN dataset" : "All GSN datasets are in the library"} />
            </SelectTrigger>
            <SelectContent>
              {data.available.map((d) => (
                <SelectItem key={d.datasetId} value={d.datasetId}>
                  {d.suggestedName} ({d.totalImages} images)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addOne} disabled={!toAdd || !!busyId}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
          <Button variant="outline" onClick={addAll} disabled={addingAll || data.available.length === 0}>
            {addingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add all ({data.available.length})
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search the library" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All industries</SelectItem>
            {data.industries.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Images</TableHead>
                  <TableHead>Shown</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {data.items.length === 0 ? 'The library is empty. Use "Add all" to start with every GSN dataset.' : "No datasets match"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((i) => {
                    const problem = !i.dataset
                      ? "Original dataset missing"
                      : !i.dataset.usable
                        ? "Original dataset is not ready"
                        : !i.dataset.onThisServer
                          ? "Files are not on this server"
                          : null;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.dataset ? `${i.dataset.project} / ${i.dataset.version}` : "—"}
                          </div>
                          {i.description && <div className="max-w-md truncate text-xs text-muted-foreground">{i.description}</div>}
                          {problem && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" /> {problem} (hidden from customers)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={i.industry}
                            disabled={busyId === i.id}
                            onValueChange={(industry) =>
                              run(i.id, () => updateSampleLibraryItem(i.id, { industry }), `Moved to ${industry}`)
                            }
                          >
                            <SelectTrigger className="h-8 w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {data.industries.map((ind) => (
                                <SelectItem key={ind} value={ind}>
                                  {ind}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{i.dataset?.totalImages ?? 0}</TableCell>
                        <TableCell>
                          <Switch
                            checked={i.isVisible}
                            disabled={busyId === i.id}
                            onCheckedChange={(isVisible) =>
                              run(
                                i.id,
                                () => updateSampleLibraryItem(i.id, { isVisible }),
                                isVisible ? "Now shown to customers" : "Hidden from customers"
                              )
                            }
                            aria-label={`Show ${i.name} to customers`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busyId === i.id}
                              onClick={() => setEditing(i)}
                              aria-label={`Edit ${i.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={busyId === i.id}
                              onClick={() => setDeleting(i)}
                              aria-label={`Delete ${i.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-1">Tip</Badge>
        Turn "Shown" off to hide a dataset without deleting it. Deleting removes it from the library and permanently deletes
        GSN's original dataset.
      </p>

      <EditItemDialog item={editing} industries={data.industries} onClose={() => setEditing(null)} onSaved={() => load(false)} />

      <ConfirmByTypingDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name ?? ""}"?`}
        consequences={[
          "Remove it from the sample library for every customer",
          `Permanently delete GSN's original dataset${deleting?.dataset ? ` (${deleting.dataset.project} / ${deleting.dataset.version})` : ""}: its images, labels and annotations`,
          "Copies that customers already added to their projects are not affected",
        ]}
        confirmText={deleting?.name ?? ""}
        confirmLabel="Delete dataset"
        busy={!!deleting && busyId === deleting.id}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
