import React, { useMemo } from "react";
import type { Image } from "@/types/annotation";

interface ImageThumbnailGridProps {
  images: Image[];
  currentImageId: string | null;
  onImageSelect?: (imageId: string) => void;
}

// Memoized thumbnail component
const ThumbnailButton = React.memo<{
  image: Image;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}>(({ image, index, isActive, onSelect }) => {
  const isLabeled = image.hasAnnotations === true || image.annotationStatus === "annotated";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`border rounded-md text-[10px] py-2 px-1 truncate transition-colors ${
        isActive
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-muted hover:bg-muted"
      }`}
      aria-label={`Select image ${index + 1}: ${image.filename} (${isLabeled ? "labeled" : "unlabeled"})`}
    >
      Image {index + 1}
      <div className="block text-[9px] text-muted-foreground truncate">{image.filename}</div>
      <span
        className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-medium leading-none ${
          isLabeled
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-muted-foreground/15 text-muted-foreground"
        }`}
      >
        {isLabeled ? "Labeled" : "Unlabeled"}
      </span>
    </button>
  );
}, (prev, next) => {
  return (
    prev.image.id === next.image.id &&
    prev.image.hasAnnotations === next.image.hasAnnotations &&
    prev.image.annotationStatus === next.image.annotationStatus &&
    prev.isActive === next.isActive &&
    prev.index === next.index
  );
});

ThumbnailButton.displayName = "ThumbnailButton";

export const ImageThumbnailGrid: React.FC<ImageThumbnailGridProps> = ({
  images,
  currentImageId,
  onImageSelect,
}) => {
  const renderedThumbnails = useMemo(() => {
    return images.map((image, index) => {
      const isActive = image.id === currentImageId;
      return (
        <ThumbnailButton
          key={image.id}
          image={image}
          index={index}
          isActive={isActive}
          onSelect={() => onImageSelect?.(image.id)}
        />
      );
    });
  }, [images, currentImageId, onImageSelect]);

  if (images.length === 0) {
    return (
      <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
        No images available for annotation.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2" role="list" aria-label="Image thumbnails">
      {renderedThumbnails}
    </div>
  );
};
