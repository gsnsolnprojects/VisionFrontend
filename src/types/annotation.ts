// Core annotation types for frontend scaffolding (Phase 1)
// Enhanced with Phase 6: state and metadata

export type BBox = [number, number, number, number]; // [x, y, width, height] normalized 0-1

export type AnnotationState = "draft" | "reviewed" | "approved" | "rejected";

export interface Image {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  folder?: string;
  size?: number;
  // Optional annotation metadata from backend (used for filtering/progress)
  hasAnnotations?: boolean;
  annotationStatus?: "unannotated" | "annotated" | "in_review" | "approved";
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Annotation {
  id: string;
  imageId: string;
  bbox: BBox;
  categoryId: string;
  categoryName: string;
  // Phase 6: State and metadata
  state?: AnnotationState;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}


