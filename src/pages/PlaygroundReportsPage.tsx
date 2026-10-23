import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Download, FileSpreadsheet, FileText, FlaskConical, ImageOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";
import { cn } from "@/lib/utils";

/**
 * Playground: every test report the company still has, from all its projects, newest first.
 * Reports are deleted by the server 24 hours after they're made, so students download the PDF
 * (or the spreadsheet of results) they want to keep.
 */

interface Report {
  id: string;
  title: string;
  project: string;
  projectId: string | null;
  industry: string | null;
  modelName: string | null;
  photos: number;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
  hasCsv?: boolean;
  hasPreview?: boolean;
}

const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expiring now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${m} min left` : `${m} min left`;
};

const lastProjectKey = (userId?: string) => `visionm_playground_last_project_${userId ?? "anon"}`;

async function fetchBlob(path: string) {
  const res = await fetch(apiUrl(path), { headers: await getAuthHeaders() });
  if (!res.ok) {
    let message = res.status === 404 ? "This report has expired." : `Download failed (${res.status})`;
    try {
      message = (await res.json()).message || message;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return res.blob();
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The report's first photo, loaded with the sign-in headers */
function ReportPreview({ report }: { report: Report }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(!report.hasPreview);

  useEffect(() => {
    if (!report.hasPreview) return;
    let url: string | null = null;
    let cancelled = false;
    fetchBlob(`/playground/reports/${encodeURIComponent(report.id)}/preview`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [report.id, report.hasPreview]);

  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-t-2xl bg-[#171f1b]">
      {src ? (
        <img src={src} alt={`First photo in ${report.title}`} className="h-full w-full object-cover" />
      ) : failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-[#bec9b0]">
          <ImageOff className="h-6 w-6" />
          <span className="text-xs">No preview</span>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#bec9b0]" />
        </div>
      )}
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#171f1b]/85 px-2.5 py-1 text-[11px] font-medium text-[#e9ff65]">
        <Clock className="h-3 w-3" /> {timeLeft(report.expiresAt)}
      </span>
    </div>
  );
}

const PlaygroundReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useProfile();
  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  const load = useCallback(async () => {
    try {
      const json = await apiRequest<{ reports: Report[] }>("/playground/reports");
      setReports(json.reports);
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => {
    void load();
    // refresh the "time left" labels and drop expired reports
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of reports ?? []) {
      const key = r.projectId ?? r.project;
      if (!seen.has(key)) seen.set(key, r.project);
    }
    return [...seen];
  }, [reports]);

  const shown = useMemo(
    () => (reports ?? []).filter((r) => projectFilter === "all" || (r.projectId ?? r.project) === projectFilter),
    [reports, projectFilter]
  );

  useEffect(() => {
    if (projectFilter !== "all" && !projects.some(([key]) => key === projectFilter)) setProjectFilter("all");
  }, [projects, projectFilter]);

  const download = async (r: Report, kind: "pdf" | "csv") => {
    setBusy(`${r.id}:${kind}`);
    try {
      const blob = await fetchBlob(`/playground/reports/${encodeURIComponent(r.id)}/${kind === "pdf" ? "download" : "csv"}`);
      saveBlob(blob, `${r.title} - test report.${kind}`);
    } catch (err) {
      toast({ title: "Couldn't download", description: (err as Error).message, variant: "destructive" });
      void load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r: Report) => {
    setBusy(`${r.id}:delete`);
    try {
      await apiRequest(`/playground/reports/${encodeURIComponent(r.id)}`, { method: "DELETE", maxRetries: 1 });
      setReports((prev) => (prev ?? []).filter((x) => x.id !== r.id));
    } catch (err) {
      toast({ title: "Couldn't delete", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const goToTest = () => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(lastProjectKey(user?.id));
    } catch {
      last = null;
    }
    navigate(last ? `/dataset/${last}?step=test` : "/dashboard");
  };

  return (
    <motion.div className="mx-auto max-w-6xl space-y-8 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <section className="overflow-hidden rounded-2xl bg-[#171f1b] text-[#f5f5ee]">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:items-end md:p-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bec9b0]">Reports</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Your tests,
              <br />
              <span className="text-[#e9ff65]">ready to share.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#bec9b0]">
              Every report shows each photo and what the model found on it. Download the PDF to read or share, or the
              spreadsheet to sort and count the results yourself.
            </p>
          </div>
          <div className="rounded-xl border border-[#485840] p-5">
            <p className="text-sm text-[#bec9b0]">Reports available</p>
            <p className="mt-1 text-2xl font-bold">{reports === null ? "…" : reports.length}</p>
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-[#bec9b0]">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Reports are kept for 24 hours, then deleted with their photos. Download the ones you want to keep.
            </p>
          </div>
        </div>
      </section>

      {reports === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#171f1b] text-[#e9ff65]">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">No reports yet</h2>
            <ol className="mx-auto mt-3 max-w-sm space-y-1.5 text-left text-sm text-muted-foreground">
              <li>1. Open <strong className="text-foreground">Test &amp; evaluate</strong> in your project.</li>
              <li>2. Run a test on the held-out photos or your own.</li>
              <li>3. When it finishes, click <strong className="text-foreground">Generate report</strong>.</li>
            </ol>
          </div>
          <Button className="gap-1.5" onClick={goToTest}>
            <FlaskConical className="h-4 w-4" /> Go to Test &amp; evaluate
          </Button>
        </section>
      ) : (
        <section className="space-y-4" aria-label="Reports">
          {projects.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by project">
              {[["all", "All projects"] as [string, string], ...projects].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setProjectFilter(key)}
                  aria-pressed={projectFilter === key}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    projectFilter === key
                      ? "border-[#171f1b] bg-[#171f1b] text-[#e9ff65]"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-col rounded-2xl border bg-card">
                <ReportPreview report={r} />
                <div className="flex flex-1 flex-col p-4">
                  {r.industry && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.industry}</p>
                  )}
                  <p className="mt-1 line-clamp-2 font-semibold text-foreground">{r.title}</p>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between gap-3">
                      <dt>Model</dt>
                      <dd className="truncate text-right text-foreground">{r.modelName ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Photos</dt>
                      <dd className="text-foreground">{r.photos}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Made</dt>
                      <dd className="text-foreground">
                        {new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2 pt-1 sm:mt-auto sm:pt-4">
                    <Button size="sm" className="flex-1 gap-1.5" onClick={() => void download(r, "pdf")} disabled={busy?.startsWith(r.id)}>
                      {busy === `${r.id}:pdf` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => void download(r, "csv")}
                      disabled={!r.hasCsv || busy?.startsWith(r.id)}
                      title={r.hasCsv ? "Download the results as a spreadsheet" : "Reports made earlier have no spreadsheet"}
                    >
                      {busy === `${r.id}:csv` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void remove(r)}
                      disabled={busy?.startsWith(r.id)}
                      aria-label={`Delete ${r.title} report`}
                    >
                      {busy === `${r.id}:delete` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  );
};

export default PlaygroundReportsPage;
