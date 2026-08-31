import type { Annotation } from "@/types/annotation";

/** Mongo ObjectId as returned by the annotations API. */
export function isMongoObjectId(id: string | undefined | null): boolean {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}

function coordsClose(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) < eps;
}

/** True when two annotations describe the same box/polygon (used to map local temp ids → Mongo ids). */
export function annotationsMatchGeometry(a: Annotation, b: Annotation, eps = 1e-4): boolean {
  if (a.imageId && b.imageId && String(a.imageId) !== String(b.imageId)) return false;
  if (a.categoryId && b.categoryId && String(a.categoryId) !== String(b.categoryId)) return false;

  const aPoly = a.polygon;
  const bPoly = b.polygon;
  if (aPoly && bPoly && aPoly.length >= 3 && bPoly.length >= 3) {
    if (aPoly.length !== bPoly.length) return false;
    return aPoly.every(
      (p, i) => coordsClose(p[0], bPoly[i][0], eps) && coordsClose(p[1], bPoly[i][1], eps)
    );
  }

  if (!Array.isArray(a.bbox) || !Array.isArray(b.bbox) || a.bbox.length < 4 || b.bbox.length < 4) {
    return false;
  }
  return a.bbox.every((v, i) => coordsClose(v, b.bbox[i], eps));
}
