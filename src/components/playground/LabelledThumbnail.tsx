import React, { useEffect, useState } from "react";
import { apiUrl, getAuthHeaders } from "@/lib/api/config";

export interface Box {
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Same colours as the labelling tool's default categories, by class index
export const BOX_COLORS = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

/** A thumbnail with its labelled boxes drawn on top (SVG keeps the boxes aligned at any size) */
export const LabelledThumbnail: React.FC<{
  datasetId: string;
  file: { id: string; originalName: string };
  boxes: Box[] | undefined;
  classNames: string[];
}> = ({ datasetId, file, boxes, classNames }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(file.id)}/thumbnail`),
          { headers: await getAuthHeaders() }
        );
        if (!res.ok) throw new Error(String(res.status));
        objectUrl = URL.createObjectURL(await res.blob());
        if (cancelled) return;
        const img = new Image();
        img.onload = () => !cancelled && setSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = objectUrl;
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [datasetId, file.id]);

  if (failed) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>;
  }
  if (!src || !size) return <div className="h-full w-full animate-pulse bg-muted" />;

  const stroke = Math.max(size.w, size.h) / 160;
  return (
    <svg viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label={file.originalName}>
      <image href={src} width={size.w} height={size.h} />
      {(boxes ?? []).map((b, i) => (
        <rect
          key={i}
          x={b.x * size.w}
          y={b.y * size.h}
          width={b.w * size.w}
          height={b.h * size.h}
          fill="none"
          stroke={BOX_COLORS[b.c % BOX_COLORS.length]}
          strokeWidth={stroke}
        >
          <title>{classNames[b.c] ?? `class ${b.c}`}</title>
        </rect>
      ))}
    </svg>
  );
};
