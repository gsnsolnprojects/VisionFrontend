import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
  error?: boolean;
  accentColor?: "blue" | "green" | "primary";
}

/**
 * MetricCard Component
 * 
 * Displays a metric with an icon, value, and optional subtitle.
 * Supports loading and error states.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  loading = false,
  error = false,
  accentColor = "primary",
}) => {
  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2.5 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20" />
              {subtitle && <Skeleton className="h-3.5 w-32" />}
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn(
        "h-full shadow-sm dark:shadow-black/30 shadow-md",
        accentColor === "blue" && "border-l-4 border-l-blue-500 dark:border-l-blue-400",
        accentColor === "green" && "border-l-4 border-l-green-500 dark:border-l-green-400",
        accentColor === "primary" && "border-l-4 border-l-primary"
      )} role="status" aria-label={`${title} metric unavailable`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground/70 font-normal cursor-pointer hover:text-primary hover:underline transition-colors" aria-live="polite">No data yet</p>
            </div>
            <div className={cn("opacity-50 dark:opacity-40", iconColor)} aria-hidden="true">
              <Icon className="h-12 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "h-full transition-all duration-300 ease-in-out",
      "shadow-sm dark:shadow-black/30 shadow-md",
      "hover:shadow-md dark:hover:shadow-black/50",
      "hover:shadow-lg hover:-translate-y-0.5",
      "dark:hover:translate-y-0",
      accentColor === "blue" && "border-l-4 border-l-blue-500 dark:border-l-blue-400",
      accentColor === "green" && "border-l-4 border-l-green-500 dark:border-l-green-400",
      accentColor === "primary" && "border-l-4 border-l-primary",
      // Vision: every metric gets the lime accent bar
      "vision:border-l-accent"
    )} role="region" aria-label={`${title} metric`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
            <p className={cn(
              "text-2xl font-bold tracking-tight text-foreground tabular-nums",
              typeof value === "string" && value.includes("→") && "cursor-pointer hover:text-primary transition-colors"
            )} aria-label={`${title}: ${value}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground/80 font-normal leading-tight">{subtitle}</p>
            )}
          </div>
          <div className={cn("flex-shrink-0", iconColor)} aria-hidden="true">
            <Icon className="h-12 w-12" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

