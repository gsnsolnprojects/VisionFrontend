import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api/config";
import { useProfile } from "@/hooks/useProfile";
import { isSuperadmin } from "@/lib/utils/superadmin";
import { cn } from "@/lib/utils";

/**
 * Settings -> Usage: who did what and when this month. GPU training time per person and the
 * month's totals, then every session (training, test, extra photos, upload) with its start, end
 * and duration. The superadmin can pick any company or all, and also sees the GPU server's real
 * on-time and its cost. Data: GET /api/dashboard/usage.
 */

interface Person {
  userId: string | null;
  name: string | null;
  email: string | null;
}

interface Session {
  type: "training" | "test" | "practice" | "more-photos" | "upload" | "sample-to-label";
  id: string;
  company: string;
  project: string;
  person: Person;
  detail: string;
  device: "gpu" | "cpu" | null;
  queuedAt?: string;
  startedAt: string | null;
  endedAt: string | null;
  minutes: number | null;
  waitMinutes?: number | null;
  status: string;
}

interface UsageResponse {
  month: string;
  company: string;
  summary: {
    gpuTrainingMinutes: number;
    cpuTrainingMinutes: number;
    trainings: number;
    tests: number;
    photosPredicted: number;
    morePhotos: number;
    uploads: number;
  };
  people: (Person & { gpuTrainingMinutes: number; trainings: number; tests: number; photosPredicted: number })[];
  sessions: Session[];
  gpuServer?: {
    sessions: { startedAt: string; stoppedAt: string | null; running: boolean; minutes: number | null }[];
    totalMinutes: number;
    inrPerHour: number;
    costInr: number;
  };
}

const TYPE_LABEL: Record<Session["type"], string> = {
  training: "Training",
  test: "Test",
  practice: "Practice auto-label",
  "more-photos": "Extra photos",
  upload: "Upload",
  "sample-to-label": "Sample to label",
};

/** 95 -> "1 h 35 min", 0.4 -> "under 1 min" */
const duration = (minutes: number | null | undefined) => {
  if (minutes == null) return "—";
  if (minutes < 1) return "under 1 min";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const personLabel = (p: Person) => p.name || p.email || "Unknown";

/** This month and the 5 before it, as YYYY-MM */
const recentMonths = () => {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};
const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export const UsageActivitySettings: React.FC = () => {
  const { userRole, company } = useProfile();
  const admin = isSuperadmin(userRole, company?.name);
  const months = useMemo(recentMonths, []);
  const [month, setMonth] = useState(months[0]);
  const [scope, setScope] = useState<string>(admin ? "all" : "");
  const [type, setType] = useState<string>("all");
  const [person, setPerson] = useState<string>("all");
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    const q = new URLSearchParams({ month, ...(admin && scope ? { company: scope } : {}) });
    apiRequest<UsageResponse>(`/dashboard/usage?${q}`)
      .then((json) => !cancelled && setData(json))
      .catch((err) => !cancelled && setError((err as Error).message));
    return () => {
      cancelled = true;
    };
  }, [month, scope, admin]);

  const companies = useMemo(() => [...new Set((data?.sessions ?? []).map((s) => s.company))].sort(), [data]);
  const visible = (data?.sessions ?? []).filter(
    (s) => (type === "all" || s.type === type) && (person === "all" || (s.person.userId ?? "unknown") === person)
  );

  const select = "h-9 rounded-md border bg-card px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <select className={select} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        {admin && (
          <select className={select} value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Company">
            <option value="all">All companies</option>
            {[...new Set([...companies, ...(scope !== "all" ? [scope] : [])])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</p>}
      {!data && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading usage...
        </p>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["GPU training time", duration(data.summary.gpuTrainingMinutes)],
              ["Trainings", String(data.summary.trainings)],
              ["Tests", String(data.summary.tests)],
              ["Photos predicted", data.summary.photosPredicted.toLocaleString("en-IN")],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{v}</p>
              </div>
            ))}
          </div>

          {/* GPU server on-time (superadmin) */}
          {data.gpuServer && (
            <section className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">GPU server on-time (what AWS bills)</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {duration(data.gpuServer.totalMinutes)} switched on this month, including start-up and idle minutes ·
                about <strong className="text-foreground">₹{data.gpuServer.costInr.toLocaleString("en-IN")}</strong> at ₹
                {data.gpuServer.inrPerHour} an hour
              </p>
              {data.gpuServer.sessions.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-4 font-medium">Switched on</th>
                        <th className="py-1 pr-4 font-medium">Switched off</th>
                        <th className="py-1 font-medium">On for</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.gpuServer.sessions.map((s) => (
                        <tr key={s.startedAt} className="border-t">
                          <td className="py-1.5 pr-4">{when(s.startedAt)}</td>
                          <td className="py-1.5 pr-4">{s.running ? "Still on" : when(s.stoppedAt)}</td>
                          <td className="py-1.5">{duration(s.minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Per person */}
          <section>
            <h3 className="text-sm font-semibold text-foreground">By person</h3>
            {data.people.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No activity this month.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Person</th>
                      <th className="px-3 py-2 font-medium">GPU training time</th>
                      <th className="px-3 py-2 font-medium">Trainings</th>
                      <th className="px-3 py-2 font-medium">Tests</th>
                      <th className="px-3 py-2 font-medium">Photos predicted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.people.map((p) => (
                      <tr key={p.userId ?? "unknown"} className="border-t">
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground">{personLabel(p)}</span>
                          {p.email && p.name && <span className="block text-xs text-muted-foreground">{p.email}</span>}
                        </td>
                        <td className="px-3 py-2">{duration(p.gpuTrainingMinutes)}</td>
                        <td className="px-3 py-2">{p.trainings}</td>
                        <td className="px-3 py-2">{p.tests}</td>
                        <td className="px-3 py-2">{p.photosPredicted.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Sessions */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Sessions</h3>
              <div className="flex flex-wrap gap-2">
                <select className={select} value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
                  <option value="all">All types</option>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select className={select} value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Person">
                  <option value="all">Everyone</option>
                  {data.people.map((p) => (
                    <option key={p.userId ?? "unknown"} value={p.userId ?? "unknown"}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing to show.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">What</th>
                      <th className="px-3 py-2 font-medium">Person</th>
                      {admin && scope === "all" && <th className="px-3 py-2 font-medium">Company</th>}
                      <th className="px-3 py-2 font-medium">Project</th>
                      <th className="px-3 py-2 font-medium">Started</th>
                      <th className="px-3 py-2 font-medium">Ended</th>
                      <th className="px-3 py-2 font-medium">Duration</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s) => (
                      <tr key={`${s.type}-${s.id}`} className="border-t align-top">
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground">{TYPE_LABEL[s.type]}</span>
                          {s.type === "training" && s.device && (
                            <span
                              className={cn(
                                "ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                s.device === "gpu" ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {s.device}
                            </span>
                          )}
                          <span className="block text-xs text-muted-foreground">{s.detail}</span>
                          {s.type === "training" && s.waitMinutes != null && s.waitMinutes >= 1 && (
                            <span className="block text-xs text-muted-foreground">waited {duration(s.waitMinutes)} to start</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{personLabel(s.person)}</td>
                        {admin && scope === "all" && <td className="px-3 py-2">{s.company}</td>}
                        <td className="px-3 py-2">{s.project}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{when(s.startedAt ?? s.queuedAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{when(s.endedAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{duration(s.minutes)}</td>
                        <td className="px-3 py-2 capitalize">{s.status.replace(/_/g, " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
