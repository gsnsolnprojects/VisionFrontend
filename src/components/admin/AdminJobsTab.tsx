import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { getAdminAudit, getAdminJobs, type AdminAuditEntry, type AdminJob } from "@/lib/api/admin";
import { errorMessage, formatDateTime } from "./adminFormat";

type View = "training" | "inference" | "activity";

const JOB_STATUS_STYLE: Record<string, string> = {
  queued: "text-muted-foreground",
  running: "border-blue-500/40 text-blue-700 dark:text-blue-400",
  completed: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  failed: "border-destructive/40 text-destructive",
  cancelled: "text-muted-foreground",
};

/** One readable line for an audit entry's details */
const describeDetails = (details: Record<string, unknown>): string => {
  if (typeof details.change === "string") return details.change;
  const parts = Object.entries(details)
    .filter(([k, v]) => ["string", "number", "boolean"].includes(typeof v) && !["by"].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`);
  return parts.join(" · ");
};

export const AdminJobsTab: React.FC = () => {
  const [view, setView] = useState<View>("training");
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "activity") setEntries((await getAdminAudit()).entries);
      else setJobs((await getAdminJobs(view)).jobs);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const companies = useMemo(() => {
    const names = view === "activity" ? entries.map((e) => e.company) : jobs.map((j) => j.company);
    return [...new Set(names.filter(Boolean) as string[])].sort();
  }, [view, jobs, entries]);

  const filteredJobs = jobs.filter(
    (j) => (companyFilter === "all" || j.company === companyFilter) && (statusFilter === "all" || j.status === statusFilter)
  );
  const filteredEntries = entries.filter((e) => companyFilter === "all" || e.company === companyFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={view}
          onValueChange={(v) => {
            setView(v as View);
            setCompanyFilter("all");
            setStatusFilter("all");
          }}
        >
          <TabsList>
            <TabsTrigger value="training">Training jobs</TabsTrigger>
            <TabsTrigger value="inference">Inference jobs</TabsTrigger>
            <TabsTrigger value="activity">Activity log</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-1 flex-wrap items-center gap-3 sm:justify-end">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view !== "activity" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(JOB_STATUS_STYLE).map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading..." />
      ) : error ? (
        <ErrorState title="Couldn't load this list" message={error} onRetry={load} />
      ) : view === "activity" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No activity recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDateTime(e.timestamp)}</TableCell>
                        <TableCell className="text-sm">{e.userEmail || e.userId || "System"}</TableCell>
                        <TableCell className="text-sm">{e.company || "—"}</TableCell>
                        <TableCell className="text-sm capitalize">
                          {e.action} {e.resourceType.replace("_", " ")}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                          {describeDetails(e.details) || e.resourceId || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>{view === "training" ? "Model" : "Source"}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Finished</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDateTime(j.createdAt)}</TableCell>
                        <TableCell className="text-sm">{j.company}</TableCell>
                        <TableCell className="text-sm">{j.project}</TableCell>
                        <TableCell className="text-sm">{j.detail || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${JOB_STATUS_STYLE[j.status] ?? ""}`}>
                            {j.status}
                          </Badge>
                          {j.error && <div className="mt-1 max-w-xs truncate text-xs text-destructive">{j.error}</div>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDateTime(j.completedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <p className="text-xs text-muted-foreground">Showing the latest 200 {view === "activity" ? "entries" : "jobs"}.</p>
      )}
    </div>
  );
};
