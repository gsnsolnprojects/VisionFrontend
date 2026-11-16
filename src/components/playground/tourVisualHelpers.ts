import { useEffect, useState } from "react";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";
import { BOX_COLORS, type Box } from "@/components/playground/LabelledThumbnail";

/** Shared by the guides' animations (DatasetTourVisuals, TrainingTourVisuals): colours, photos, timing */

/** A labelled photo from the dataset, used as the example in the guide */
export interface TourExample {
  datasetId: string;
  fileId: string;
  boxes: Box[];
  classNames: string[];
}

export const LIME = "#e9ff65";
export const INK = "#f5f5ee";
export const MUTED = "#bec9b0";

export const colorOf = (c: number) => BOX_COLORS[c % BOX_COLORS.length];

type LoadedPhoto = { src: string; w: number; h: number };

/**
 * Photos the guides have loaded, kept for the visit: several steps show the same photo, so it's
 * downloaded once. A failed load is forgotten, so it can be tried again.
 */
const photoCache = new Map<string, Promise<LoadedPhoto>>();

function loadPhoto(path: string): Promise<LoadedPhoto> {
  const cached = photoCache.get(path);
  if (cached) return cached;
  const loading = (async () => {
    const res = await fetch(apiUrl(path), { headers: await getAuthHeaders() });
    if (!res.ok) throw new Error(String(res.status));
    const src = URL.createObjectURL(await res.blob());
    return new Promise<LoadedPhoto>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ src, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => {
        URL.revokeObjectURL(src);
        reject(new Error("bad image"));
      };
      img.src = src;
    });
  })();
  photoCache.set(path, loading);
  loading.catch(() => photoCache.delete(path));
  return loading;
}

/** The photo itself: the thumbnail, or the full-size photo when it's shown zoomed in */
export function usePhoto(datasetId: string, fileId: string, fullSize = false) {
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    const path = `/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(fileId)}${fullSize ? "" : "/thumbnail"}`;
    loadPhoto(path)
      .then((p) => !cancelled && setPhoto(p))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [datasetId, fileId, fullSize]);
  return { photo, failed };
}

/** Moves through an animation's stages at the given seconds; with reduced motion, straight to the last */
export function useStages(at: number[], reduced: boolean) {
  const [stage, setStage] = useState(reduced ? at.length : 0);
  const key = at.join(",");
  useEffect(() => {
    if (reduced) {
      setStage(key ? key.split(",").length : 0);
      return;
    }
    const timers = key.split(",").map((s, i) => window.setTimeout(() => setStage(i + 1), Number(s) * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [key, reduced]);
  return stage;
}

/** A 4:3 view around a box, `times` its size, kept inside the photo */
export const cropAround = (W: number, H: number, box: Box, times: number) => {
  let w = Math.min(W, Math.max(box.w * W * times, (box.h * H * times * 4) / 3, W * 0.2));
  let h = (w * 3) / 4;
  if (h > H) {
    h = H;
    w = Math.min(W, (h * 4) / 3);
  }
  const x = Math.min(Math.max((box.x + box.w / 2) * W - w / 2, 0), W - w);
  const y = Math.min(Math.max((box.y + box.h / 2) * H - h / 2, 0), H - h);
  return { x, y, w, h };
};

export const biggest = (boxes: Box[]) => [...boxes].sort((a, b) => b.w * b.h - a.w * a.h)[0];

/**
 * A labelled photo for the guides: of the dataset's first photos, the one showing the most kinds of
 * defect. Loaded by itself, so a guide can show it on any step of the level.
 */
export function useTourExample(datasetId: string, fileIds: string[]): TourExample | null {
  const [example, setExample] = useState<TourExample | null>(null);
  const idsKey = fileIds.slice(0, 12).join(",");
  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (!ids.length) return;
    let cancelled = false;
    apiRequest<{ classes: { index: number; name: string }[]; labels: Record<string, Box[]> }>(
      `/dataset/${encodeURIComponent(datasetId)}/file-labels?ids=${ids.map(encodeURIComponent).join(",")}`
    )
      .then((json) => {
        if (cancelled) return;
        // By index: a class hidden in the Playground leaves a gap
        const classNames: string[] = [];
        for (const c of json.classes) classNames[c.index] = c.name;
        let best: { id: string; boxes: Box[]; kinds: number } | null = null;
        for (const id of ids) {
          const b = json.labels[id];
          if (!b?.length) continue;
          const kinds = new Set(b.map((x) => x.c)).size;
          if (!best || kinds > best.kinds || (kinds === best.kinds && b.length > best.boxes.length && b.length <= 4)) best = { id, boxes: b, kinds };
        }
        if (best) setExample({ datasetId, fileId: best.id, boxes: best.boxes, classNames });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [datasetId, idsKey]);
  return example;
}
