import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { getAdminGpuUsage, type AdminGpuUsage } from "@/lib/api/admin";
import { errorMessage, formatDateTime, formatInr, timeAgo } from "./adminFormat";

/** "1 h 25 min", "40 min", "0.5 min" */
const duration = (minutes: number): string => {
  if (minutes < 1) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};

/** "Mumbai · ap-south-1a", or a note for records from before zones were noted */
const place = (regionName: string | null, zone: string | null) =>
  zone ? (
    <span>
      <span className="font-medium text-foreground">{regionName || "Unknown"}</span>
      <span className="text-muted-foreground"> · {zone}</span>
    </span>
  ) : (
    <span className="text-muted-foreground">Not recorded (before 16 Nov)</span>
  );

/** "16 Nov, 08:32 am" */
const shortTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Time of day only, for an end on the same day as the start */
const clock = (value: string) => new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

const RESULT_STYLE: Record<string, string> = {
  started: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  full: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  error: "border-destructive/40 text-destructive",
};
const RESULT_LABEL: Record<string, string> = { started: "Started", full: "No GPU free", error: "Error" };

/** Colour of one hourly availability cell: green = easy to get a GPU, red = hard */
const scoreClass = (score: number | undefined) =>
  score === undefined
    ? "bg-muted"
    : score >= 7
      ? "bg-emerald-500"
      : score >= 4
        ? "bg-amber-400"
        : "bg-red-500";

/**
 * Superadmin → GPU: where (AWS region and zone) and when our GPU training server ran, for how
 * long and at what cost; how the dispatcher got on finding a GPU; and the hourly spare-GPU
 * check across regions. Only the superadmin sees any of this.
 */
export const AdminGpuTab: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminGpuUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [showAllAttempts, setShowAllAttempts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminGpuUsage(days));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <LoadingState message="Loading GPU usage..." />;
  if (error && !data) return <ErrorState title="Could not load GPU usage" message={error} onRetry={load} />;
  if (!data) return null;

  const { totals, sessions, zones, dispatch, availability } = data;
  const attempts = showAllAttempts ? dispatch.recent : dispatch.recent.slice(0, 15);
  // Hourly checks, oldest first, for the availability strips
  const checks = availability.checks;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <p className="text-sm text-muted-foreground">
          Prices per hour: {data.regions.map((r) => `${r.name} ₹${r.inrPerHour}`).join(" · ")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "GPU switched on", value: duration(totals.minutes), note: "What AWS bills, incl. start-up and idle" },
          { label: "Cost", value: formatInr(totals.costInr), note: "At each region's hourly price" },
          { label: "Switch-ons", value: String(totals.switchOns), note: "Times a GPU server was started" },
          { label: "Trainings run", value: String(totals.trainings), note: "On the GPU in this period" },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where it ran</CardTitle>
          <CardDescription>Total time and cost per AWS zone in this period.</CardDescription>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-sm text-muted-foreground">The GPU server hasn't run in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Switch-ons</TableHead>
                    <TableHead className="text-right">Time on</TableHead>
                    <TableHead className="text-right">Trainings</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow key={z.zone || "unknown"}>
                      <TableCell className="whitespace-nowrap">{place(z.regionName, z.zone)}</TableCell>
                      <TableCell className="text-right">{z.switchOns}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">{duration(z.minutes)}</TableCell>
                      <TableCell className="text-right">{z.trainings}</TableCell>
                      <TableCell className="text-right">{formatInr(z.costInr)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Every switch-on</CardTitle>
          <CardDescription>When the GPU server ran, where, for how long, and which trainings it ran. Click a row for the trainings.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Time on</TableHead>
                    <TableHead className="text-right">Trainings</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <React.Fragment key={s.id}>
                      <TableRow
                        className={s.trainings.length ? "cursor-pointer" : undefined}
                        onClick={() => s.trainings.length && setOpenSession(openSession === s.id ? null : s.id)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {place(s.regionName, s.zone)}
                          {s.instanceType && <div className="text-xs text-muted-foreground">{s.instanceType}</div>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {shortTime(s.startedAt)} →{" "}
                          {s.running || !s.stoppedAt ? (
                            <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-400">
                              Still on
                            </Badge>
                          ) : (
                            <>
                              {sameDay(s.startedAt, s.stoppedAt) ? clock(s.stoppedAt) : shortTime(s.stoppedAt)}
                              {s.endEstimated && (
                                <span className="ml-1 text-xs text-muted-foreground" title="The server went off without writing its stop time; this is its last sign of life">
                                  (approx.)
                                </span>
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">{duration(s.minutes)}</TableCell>
                        <TableCell className="text-right">{s.trainings.length || "—"}</TableCell>
                        <TableCell className="text-right">{formatInr(s.costInr)}</TableCell>
                      </TableRow>
                      {openSession === s.id && (
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={5} className="py-3">
                            <p className="mb-2 text-xs text-muted-foreground">
                              Trainings on this switch-on. Their times are the training itself; the GPU's time on also covers starting up and the idle minutes before it switches off.
                            </p>
                            <div className="overflow-x-auto rounded-md border bg-background">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">Started by</th>
                                    <th className="px-3 py-2 font-medium">Organisation</th>
                                    <th className="px-3 py-2 font-medium">Project</th>
                                    <th className="px-3 py-2 font-medium">Model</th>
                                    <th className="px-3 py-2 font-medium">Training start</th>
                                    <th className="px-3 py-2 font-medium">Training end</th>
                                    <th className="px-3 py-2 text-right font-medium">Took</th>
                                    <th className="px-3 py-2 font-medium">Result</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {s.trainings.map((t) => (
                                    <tr key={t.id} className="border-b last:border-0">
                                      <td className="px-3 py-2">
                                        {t.userName || t.userEmail ? (
                                          <>
                                            <div className="font-medium">{t.userName || "—"}</div>
                                            <div className="text-xs text-muted-foreground">{t.userEmail || ""}</div>
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground">Not recorded</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">{t.company || "—"}</td>
                                      <td className="px-3 py-2">{t.project || "—"}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{t.model || "—"}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">{t.startedAt ? shortTime(t.startedAt) : "—"}</td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {t.completedAt ? (t.startedAt && sameDay(t.startedAt, t.completedAt) ? clock(t.completedAt) : shortTime(t.completedAt)) : "—"}
                                      </td>
                                      <td className="px-3 py-2 text-right whitespace-nowrap">
                                        {t.startedAt && t.completedAt
                                          ? duration(Math.round((new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 6000) / 10)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2 capitalize">{t.status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Finding a GPU (last 7 days)</CardTitle>
          <CardDescription>
            Each time a training was waiting, the server tried Mumbai 1c, then 1a and 1b, then the fallback regions abroad,
            and stopped at the first one that had a GPU.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dispatch.summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Tries</TableHead>
                      <TableHead className="text-right">Got a GPU</TableHead>
                      <TableHead className="text-right">No GPU free</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatch.summary.map((z) => (
                      <TableRow key={z.zone || z.region}>
                        <TableCell className="whitespace-nowrap">{place(z.regionName, z.zone || z.region)}</TableCell>
                        <TableCell className="text-right">{z.tries}</TableCell>
                        <TableCell className="text-right">{z.started}</TableCell>
                        <TableCell className="text-right">{z.full}</TableCell>
                        <TableCell className="text-right">{z.errors}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Latest attempts</p>
                <ul className="space-y-1 text-sm">
                  {attempts.map((a, i) => (
                    <li key={`${a.at}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="w-40 shrink-0 text-muted-foreground">{formatDateTime(a.at)}</span>
                      <span className="w-36 shrink-0">{a.zone || a.region}</span>
                      <Badge variant="outline" className={RESULT_STYLE[a.result] || ""}>
                        {RESULT_LABEL[a.result] || a.result}
                      </Badge>
                      {a.result === "error" && <span className="text-xs text-muted-foreground">{a.message}</span>}
                    </li>
                  ))}
                </ul>
                {dispatch.recent.length > 15 && (
                  <Button variant="link" size="sm" className="px-0" onClick={() => setShowAllAttempts(!showAllAttempts)}>
                    {showAllAttempts ? "Show fewer" : `Show all ${dispatch.recent.length}`}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GPU availability by region (hourly, last 7 days)</CardTitle>
          <CardDescription>
            AWS's spare-capacity score for one g4dn GPU, checked every hour: 1 = hard to get, 10 = easy. Green is{" "}
            {availability.easyScore} or more. {availability.lastCheckAt ? `Last check ${timeAgo(availability.lastCheckAt)}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checks yet. The first one runs within the hour.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Now</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Easy hours</TableHead>
                    <TableHead>Each hour (oldest → newest)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability.regions.map((r) => (
                    <TableRow key={r.region}>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium">{r.name}</span>
                        {r.isOurs && (
                          <Badge variant="outline" className="ml-2">
                            {r.region === "ap-south-1" ? "Main" : "Fallback"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{r.latest ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.average ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.easyPercent === null ? "—" : `${r.easyPercent}%`}</TableCell>
                      <TableCell>
                        <div className="flex h-4 min-w-[12rem] gap-px">
                          {checks.map((c) => (
                            <div
                              key={c.at}
                              className={`h-full flex-1 rounded-[1px] ${scoreClass(c.scores[r.region])}`}
                              title={`${formatDateTime(c.at)}: ${c.scores[r.region] ?? "no data"}`}
                            />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
