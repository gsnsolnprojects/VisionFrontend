import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { useToast } from "@/hooks/use-toast";
import { PLAYGROUND_INDUSTRIES } from "@/components/dashboard/IndustryPicker";
import { DifficultyBar } from "@/components/playground/DifficultyBar";
import {
  DIFFICULTY_LABEL,
  getAdminIndustrySettings,
  setIndustryDifficulty,
  type Difficulty,
  type IndustrySettings,
} from "@/lib/api/playgroundIndustries";
import { getSampleLibrary, type SampleLibraryItem } from "@/lib/api/admin";
import { errorMessage } from "./adminFormat";

const NONE = "none";
const CHOICES: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Superadmin: settings for the Playground's industry cards. For now the difficulty bar each card
 * shows; a change is saved straight away and every student sees it on their next visit.
 */
export const AdminPlaygroundTab: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<IndustrySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [library, setLibrary] = useState<SampleLibraryItem[] | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getAdminIndustrySettings();
      setSettings(res.industries || {});
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
    // For "is this world's Level 1 sample ready?"; the page works without it
    getSampleLibrary()
      .then((res) => setLibrary(res.items))
      .catch(() => setLibrary([]));
  }, [load]);

  /** A world's Level 1 sample: in the library and shown to students? */
  const level1Status = (sample: string | null) => {
    if (!sample) return { tone: "text-muted-foreground", text: "No Level 1 yet" };
    if (!library) return { tone: "text-muted-foreground", text: sample };
    const items = library.filter((i) => i.dataset?.project.trim().toLowerCase() === sample.trim().toLowerCase());
    if (items.some((i) => i.isVisible)) return { tone: "text-success", text: `${sample} · ready` };
    if (items.length) return { tone: "text-amber-600 dark:text-amber-400", text: `${sample} · hidden in Samples` };
    return { tone: "text-destructive", text: `${sample} · not in Samples` };
  };

  const change = async (industryId: string, name: string, value: string) => {
    const difficulty = value === NONE ? null : (value as Difficulty);
    setSaving(industryId);
    try {
      await setIndustryDifficulty(industryId, difficulty);
      setSettings((prev) => ({ ...(prev || {}), [industryId]: { difficulty } }));
      toast({ title: `${name}: ${difficulty ? DIFFICULTY_LABEL[difficulty] : "no difficulty shown"}` });
    } catch (err) {
      toast({ title: "Couldn't save the difficulty", description: errorMessage(err), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (!settings && error) return <ErrorState title="Could not load Playground settings" message={error} onRetry={load} />;
  if (!settings) return <LoadingState message="Loading Playground settings..." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Industries</CardTitle>
        <CardDescription>
          The bar on each industry card in the Playground ("Choose your industry"). Changes save straight away; choose
          "Not shown" to hide the bar on a card.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">World</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Level 1 sample</TableHead>
                <TableHead>On the card</TableHead>
                <TableHead className="w-48">Difficulty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PLAYGROUND_INDUSTRIES.map(({ id, name, tagline, Icon, level1Sample }, i) => {
                const difficulty = settings[id]?.difficulty ?? null;
                const status = level1Status(level1Sample);
                return (
                  <TableRow key={id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium">{name}</div>
                          <div className="truncate text-xs text-muted-foreground">{tagline}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`whitespace-nowrap text-sm ${status.tone}`}>{status.text}</TableCell>
                    <TableCell>
                      {difficulty ? <DifficultyBar difficulty={difficulty} /> : <span className="text-xs text-muted-foreground">No bar</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select value={difficulty ?? NONE} onValueChange={(v) => void change(id, name, v)} disabled={saving === id}>
                          <SelectTrigger className="h-9 w-36" aria-label={`Difficulty for ${name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHOICES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {DIFFICULTY_LABEL[c]}
                              </SelectItem>
                            ))}
                            <SelectItem value={NONE}>Not shown</SelectItem>
                          </SelectContent>
                        </Select>
                        {saving === id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
