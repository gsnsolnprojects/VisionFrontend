import type {
  Annotation,
  AnnotationShapeMode,
  AnnotationState,
  BBox,
  PolygonPoint,
} from "@/types/annotation";
import type { AnnotationWritePayload } from "@/lib/api/annotations";
import { polygonToBoundingBox } from "@/lib/utils/polygonUtils";

function parsePolygon(raw: unknown): PolygonPoint[] | undefined {
  if (!Array.isArray(raw) || raw.length < 3) return undefined;
  const out: PolygonPoint[] = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length >= 2) {
      const x = Number(item[0]);
      const y = Number(item[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
    }
  }
  return out.length >= 3 ? out : undefined;
}

/** Map API / Mongo annotation document to frontend Annotation (bbox + optional polygon). */
export function mapApiRecordToAnnotation(raw: Record<string, unknown>): Annotation {
  const id = String(raw.id ?? raw._id ?? "");
  const imageId = String(raw.imageId ?? raw.image_id ?? "");
  const categoryId = String(raw.categoryId ?? raw.category_id ?? "");
  const categoryName = String(raw.categoryName ?? raw.category_name ?? "unknown");
  const br = raw.bbox as number[] | undefined;
  const polygon = parsePolygon(raw.polygon ?? raw.points);
  let bbox: BBox;
  if (br && br.length >= 4 && br.every((n) => typeof n === "number" && Number.isFinite(n))) {
    bbox = br as BBox;
  } else if (polygon) {
    bbox = polygonToBoundingBox(polygon);
  } else {
    bbox = [0, 0, 0.02, 0.02];
  }
  return {
    id,
    imageId,
    bbox,
    polygon,
    categoryId,
    categoryName,
    state: raw.state as AnnotationState | undefined,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
    createdBy: raw.createdBy != null ? String(raw.createdBy) : undefined,
    updatedBy: raw.updatedBy != null ? String(raw.updatedBy) : undefined,
  };
}

export function annotationToWritePayload(
  ann: Annotation,
  shapeMode: AnnotationShapeMode
): AnnotationWritePayload {
  if (shapeMode === "POLYGON" && ann.polygon && ann.polygon.length >= 3) {
    return { imageId: ann.imageId, categoryId: ann.categoryId, polygon: ann.polygon };
  }
  return { imageId: ann.imageId, categoryId: ann.categoryId, bbox: ann.bbox };
}
