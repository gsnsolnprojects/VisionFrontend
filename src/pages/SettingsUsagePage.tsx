import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fadeInUpVariants } from "@/utils/animations";
import { getSubscription, type SubscriptionResponse } from "@/lib/api/subscription";

export const SettingsUsagePage: React.FC = () => {
  const { sessionReady, user, loading } = useProfile();
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getSubscription());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionReady && user) loadUsage();
  }, [sessionReady, user, loadUsage]);

  if (!sessionReady || loading) {
    return <LoadingState message="Loading usage information..." />;
  }

  if (sessionReady && !user) {
    return null; // Will be redirected by ProtectedRoutes
  }

  const usageData = data?.usage
    ? [
        { label: "Team Members", used: data.usage.users, limit: data.access.limits.users, unit: "members" },
        { label: "Projects", used: data.usage.projects, limit: data.access.limits.projects, unit: "projects" },
        {
          label: "Live Camera Streams (running now)",
          used: data.usage.liveCameraStreams,
          limit: data.access.limits.liveCameraStreams,
          unit: "streams",
        },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Usage & Limits" description="Monitor your workspace usage against your plan's limits" />

      {isLoading ? (
        <LoadingState message="Loading usage information..." />
      ) : error || !data ? (
        <ErrorState title="Couldn't load usage" message={error ?? "Please try again."} onRetry={loadUsage} />
      ) : usageData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Join or create a company to see usage.</p>
      ) : (
        <motion.div className="space-y-4" variants={fadeInUpVariants} initial="hidden" animate="visible">
          {usageData.map((item) => {
            const unlimited = item.limit === null;
            const percentage = unlimited || !item.limit ? 0 : Math.min(100, (item.used / item.limit) * 100);
            return (
              <Card key={item.label}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{item.label}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {item.used} / {unlimited ? "Unlimited" : item.limit} {item.unit}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={percentage} className="h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {unlimited ? "No limit on your workspace" : `${percentage.toFixed(0)}% of limit used`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
