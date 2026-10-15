import React, { useCallback, useEffect, useState } from "react";
import { Building2, Users, FolderKanban, Database, BrainCircuit, Cpu, ScanSearch, IndianRupee, UserPlus, Wallet } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ErrorState } from "@/components/pages/ErrorState";
import { getAdminOverview, type AdminOverview } from "@/lib/api/admin";
import { errorMessage, formatInr } from "./adminFormat";

export const AdminOverviewTab: React.FC = () => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminOverview());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState title="Couldn't load overview" message={error} onRetry={load} />;

  const d = data;
  const sections: { heading: string; cards: React.ComponentProps<typeof MetricCard>[] }[] = [
    {
      heading: "Customers",
      cards: [
        { title: "Companies", value: d?.companies ?? 0, icon: Building2 },
        {
          title: "Users",
          value: d?.users.total ?? 0,
          subtitle: d ? `${d.users.active} active · ${d.users.disabled} disabled` : undefined,
          icon: Users,
        },
        {
          title: "New sign-ups",
          value: d?.users.newLast7Days ?? 0,
          subtitle: d ? `last 7 days · ${d.users.newLast30Days} in 30 days` : undefined,
          icon: UserPlus,
        },
      ],
    },
    {
      heading: "Revenue",
      cards: [
        {
          title: "Monthly recurring revenue",
          value: formatInr(d?.revenue.mrrInr ?? 0),
          subtitle: d ? `${d.revenue.paidCompanies} paying compan${d.revenue.paidCompanies === 1 ? "y" : "ies"}` : undefined,
          icon: IndianRupee,
          accentColor: "green",
        },
        { title: "Received this month", value: formatInr(d?.revenue.thisMonthInr ?? 0), icon: Wallet, accentColor: "green" },
        { title: "Received all time", value: formatInr(d?.revenue.totalInr ?? 0), icon: Wallet },
      ],
    },
    {
      heading: "Usage",
      cards: [
        { title: "Projects", value: d?.projects ?? 0, icon: FolderKanban },
        { title: "Datasets", value: d?.datasets ?? 0, icon: Database },
        { title: "Trained models", value: d?.models ?? 0, icon: BrainCircuit },
        {
          title: "Training jobs",
          value: d?.trainingJobs.total ?? 0,
          subtitle: d ? `${d.trainingJobs.active} queued or running` : undefined,
          icon: Cpu,
          accentColor: "blue",
        },
        {
          title: "Inference jobs",
          value: d?.inferenceJobs.total ?? 0,
          subtitle: d ? `${d.inferenceJobs.active} queued or running` : undefined,
          icon: ScanSearch,
          accentColor: "blue",
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.heading}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.cards.map((card) => (
              <MetricCard key={card.title} {...card} loading={loading} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
