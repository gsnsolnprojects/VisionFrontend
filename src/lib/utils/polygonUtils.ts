import type { BBox, PolygonPoint } from "@/types/annotation";

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Phase-1 validation: min 3 points, numeric pairs, normalized [0..1]. */
export function validatePolygonNormalized(points: PolygonPoint[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(points) || points.length < 3) {
    errors.push("Polygon needs at least 3 points");
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Array.isArray(p) || p.length !== 2) {
      errors.push("Each point must be [x, y]");
      break;
    }
    const [x, y] = p;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
      errors.push("Each coordinate must be a finite number");
      break;
    }
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      errors.push("Points must be in normalized range [0..1]");
      break;
    }
  }
  return { ok: errors.length === 0, errors };
}

export function polygonToBoundingBox(points: PolygonPoint[]): BBox {
  if (points.length === 0) return [0, 0, 0.01, 0.01];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1e-6);
  const h = Math.max(maxY - minY, 1e-6);
  return [minX, minY, w, h];
}

export function pixelToNormalizedPoint(
  px: number,
  py: number,
  imageWidth: number,
  imageHeight: number
): PolygonPoint {
  return [clamp01(px / imageWidth), clamp01(py / imageHeight)];
}

export function normalizedToPixel(
  nx: number,
  ny: number,
  imageWidth: number,
  imageHeight: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  return {
    x: nx * imageWidth + offsetX,
    y: ny * imageHeight + offsetY,
  };
}

/** Distance in image-local pixels between two points (normalized coords). */
export function normPointsPixelDistance(
  a: PolygonPoint,
  b: PolygonPoint,
  imageWidth: number,
  imageHeight: number
): number {
  const dx = (a[0] - b[0]) * imageWidth;
  const dy = (a[1] - b[1]) * imageHeight;
  return Math.hypot(dx, dy);
}
