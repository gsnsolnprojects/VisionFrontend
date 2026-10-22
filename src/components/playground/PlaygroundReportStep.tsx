import React, { useCallback, useEffect, useState } from "react";
import { Clock, Download, FileText, FlaskConical, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";

/**
 * Step 4 of a Playground project: the PDF reports made from this project's tests. Reports are
 * deleted by the server 24 hours after they're made, so students download what they want to keep.
 */

interface Report {
  id: string;
  title: string;
  industry: string | null;
  modelName: string | null;
  photos: number;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
}

const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expiring now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${m} min left` : `${m} min left`;
};

export const PlaygroundReportStep: React.FC<{ projectId: string; onGoToTest: () => void }> = ({ projectId, onGoToTest }) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await apiRequest<{ reports: Report[] }>(`/playground/reports?projectId=${encodeURIComponent(projectId)}`);
      setReports(json.reports);
    } catch {
      setReports([]);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    // refresh the "time left" labels and drop expired reports
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const download = async (r: Report) => {
    setBusyId(r.id);
    try {
      const res = await fetch(apiUrl(`/playground/reports/${encodeURIComponent(r.id)}/download`), {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error(res.status === 404 ? "This report has expired." : `Download failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.title} - test report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toast({ title: "Couldn't download", description: (err as Error).message, variant: "destructive" });
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: Report) => {
    setBusyId(r.id);
    try {
      await apiRequest(`/playground/reports/${encodeURIComponent(r.id)}`, { method: "DELETE", maxRetries: 1 });
      setReports((prev) => (prev ?? []).filter((x) => x.id !== r.id));
    } catch (err) {
      toast({ title: "Couldn't delete", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Your project, on paper.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports from your tests, with every photo and what the model found. Each one is kept for 24 hours, so download
          the ones you want to keep.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="reports-heading">
        <h3 id="reports-heading" className="text-lg font-semibold text-foreground">
          Reports
        </h3>
        {reports === null ? (
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
        ) : reports.length === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed p-5">
            <p className="text-sm text-muted-foreground">
              No reports yet. Run a test in step 3, then click <strong className="text-foreground">Generate report</strong>.
            </p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onGoToTest}>
              <FlaskConical className="h-3.5 w-3.5" /> Go to Test &amp; evaluate
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#171f1b] text-[#e9ff65]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      {r.modelName && ` · ${r.modelName}`} · {r.photos} photo{r.photos === 1 ? "" : "s"} ·{" "}
                      {(r.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {timeLeft(r.expiresAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" className="gap-1.5" onClick={() => void download(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Download PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void remove(r)} disabled={busyId === r.id} aria-label={`Delete ${r.title} report`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
