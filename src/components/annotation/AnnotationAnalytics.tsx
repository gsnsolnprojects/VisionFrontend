import React, { useMemo } from "react";
import type { Annotation, Category } from "@/types/annotation";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnnotationAnalyticsProps {
  annotations: Annotation[];
  categories: Category[];
  startDate?: Date;
  endDate?: Date;
}

export const AnnotationAnalytics: React.FC<AnnotationAnalyticsProps> = ({
  annotations,
  categories,
}) => {
  // Category distribution
  const categoryDistribution = useMemo(() => {
    const distribution: Record<string, { count: number; percentage: number; color: string }> = {};

    annotations.forEach((ann) => {
      if (!distribution[ann.categoryId]) {
        const category = categories.find((c) => c.id === ann.categoryId);
        distribution[ann.categoryId] = {
          count: 0,
          percentage: 0,
          color: category?.color ?? "#6b7280",
        };
      }
      distribution[ann.categoryId].count++;
    });

    const total = annotations.length;
    Object.keys(distribution).forEach((catId) => {
      distribution[catId].percentage = total > 0 ? (distribution[catId].count / total) * 100 : 0;
    });

    return Object.entries(distribution).map(([categoryId, data]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        categoryName: category?.name ?? "Unknown",
        ...data,
      };
    });
  }, [annotations, categories]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        <h4 className="text-sm font-medium">Analytics</h4>
      </div>

      {/* Category Distribution */}
      {categoryDistribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryDistribution
                .sort((a, b) => b.count - a.count)
                .map((item) => (
                  <div key={item.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.categoryName}</span>
                      </div>
                      <span className="font-medium">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
