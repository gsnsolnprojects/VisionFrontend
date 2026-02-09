import React, { useMemo } from "react";
import type { Image, Annotation, Category } from "@/types/annotation";
import { ImageIcon, CheckCircle2, Box } from "lucide-react";
import { safeText } from "@/lib/utils";

interface AnnotationStatsProps {
  images: Image[];
  annotations: Annotation[];
  categories: Category[];
}

export const AnnotationStats: React.FC<AnnotationStatsProps> = ({
  images,
  annotations,
  categories,
}) => {
  // Memoize calculations
  const stats = useMemo(() => {
    // Dataset-level annotated images: use image metadata when available
    const annotatedImagesCount = images.filter(
      (img) => img.hasAnnotations || img.annotationStatus === "annotated"
    ).length;
    const annotatedPercent =
      images.length > 0 ? Math.round((annotatedImagesCount / images.length) * 100) : 0;
    const unannotatedImagesCount = Math.max(images.length - annotatedImagesCount, 0);
    const unannotatedPercent =
      images.length > 0 ? Math.round((unannotatedImagesCount / images.length) * 100) : 0;

    const boxesPerCategory = categories.map((category) => {
      const count = annotations.filter((ann) => ann.categoryId === category.id).length;
      const percentage = annotations.length > 0 ? (count / annotations.length) * 100 : 0;
      return {
        category,
        count,
        percentage,
      };
    });

    return {
      annotatedImagesCount,
      annotatedPercent,
      unannotatedImagesCount,
      unannotatedPercent,
      boxesPerCategory,
    };
  }, [images.length, annotations, categories]);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className="space-y-3" role="region" aria-label="Annotation statistics">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Box className="h-4 w-4" />
        Statistics
      </h4>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Total Images:</span>
          </div>
          <span className="font-semibold">{formatNumber(images.length)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Annotated:</span>
          </div>
          <span className="font-semibold">
            {formatNumber(stats.annotatedImagesCount)} ({stats.annotatedPercent}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Unannotated:</span>
          </div>
          <span className="font-semibold">
            {formatNumber(stats.unannotatedImagesCount)} ({stats.unannotatedPercent}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Box className="h-3.5 w-3.5" />
            <span>Total Boxes:</span>
          </div>
          <span className="font-semibold">{formatNumber(annotations.length)}</span>
        </div>
      </div>

      {annotations.length > 0 && (
        <div className="space-y-2 pt-3 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Boxes per Category:
          </div>
          <div className="space-y-1.5">
            {stats.boxesPerCategory.map(({ category, count, percentage }) => (
              <div
                key={category.id}
                className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border border-border"
                    style={{ backgroundColor: category.color }}
                    aria-label={`${safeText(category.name)} category color`}
                  />
                  <span className="text-foreground">{safeText(category.name)}</span>
                </div>
                <span className="font-medium text-foreground">
                  {formatNumber(count)} ({percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

