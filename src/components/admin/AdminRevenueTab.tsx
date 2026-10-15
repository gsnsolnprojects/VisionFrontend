import React, { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IndianRupee, Wallet, Building2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { getAdminRevenue, type AdminRevenue } from "@/lib/api/admin";
import { errorMessage, formatDateTime, formatInr, formatMonth } from "./adminFormat";

const MonthTooltip: React.FC<{ active?: boolean; payload?: { payload: AdminRevenue["byMonth"][number] }[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-medium">{formatMonth(row.month)}</div>
      <div>{formatInr(row.amountInr)}</div>
      <div className="text-xs text-muted-foreground">
        {row.payments} payment{row.payments === 1 ? "" : "s"}
      </div>
    </div>
  );
};

export const AdminRevenueTab: React.FC = () => {
  const [data, setData] = useState<AdminRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminRevenue());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading revenue..." />;
  if (error || !data) return <ErrorState title="Couldn't load revenue" message={error ?? "Please try again."} onRetry={load} />;

  return (
    <div className="space-y-6">
      {!data.paymentsAvailable && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Payment history isn't set up in the database yet, so only monthly recurring revenue is shown. It fills in
            once the superadmin database update is applied and customers pay.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monthly recurring revenue"
          value={formatInr(data.mrrInr)}
          subtitle="from active paid plans"
          icon={IndianRupee}
          accentColor="green"
        />
        <MetricCard title="Received this month" value={formatInr(data.thisMonthInr)} icon={Wallet} accentColor="green" />
        <MetricCard title="Received all time" value={formatInr(data.totalInr)} icon={Wallet} />
        <MetricCard title="Paying companies" value={data.paidCompanies} icon={Building2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Money received per month</CardTitle>
          <CardDescription>Successful Razorpay payments, last 12 months (India time)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.byMonth.every((m) => m.amountInr === 0) ? (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No payments received in the last 12 months
            </div>
          ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byMonth} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m: string) => formatMonth(m).split(" ")[0]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v: number) => formatInr(v)}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} content={<MonthTooltip />} />
                <Bar dataKey="amountInr" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active paid plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Price / month</TableHead>
                  <TableHead className="text-right">Companies</TableHead>
                  <TableHead className="text-right">Monthly total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.planBreakdown.map((p) => (
                  <TableRow key={p.plan}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(p.priceMonthlyInr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.activeCompanies}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(p.priceMonthlyInr * p.activeCompanies)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Received by company</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byCompany.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No payments yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byCompany.map((c) => (
                    <TableRow key={c.companyId ?? c.companyName}>
                      <TableCell>{c.companyName}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.payments}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatInr(c.amountInr)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Razorpay payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No payments yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.payments.map((p) => (
                    <TableRow key={p.paymentId}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(p.paidAt)}</TableCell>
                      <TableCell>{p.companyName}</TableCell>
                      <TableCell className="capitalize">{p.plan ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.paymentId}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatInr(p.amountInr)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
