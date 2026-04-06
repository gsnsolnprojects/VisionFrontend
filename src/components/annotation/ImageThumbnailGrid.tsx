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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`border rounded-md text-[10px] py-2 px-1 truncate transition-colors ${
        isActive
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-muted hover:bg-muted"
      }`}
      aria-label={`Select image ${index + 1}: ${image.filename}`}
    >
      Image {index + 1}
      <div className="block text-[9px] text-muted-foreground truncate">{image.filename}</div>
    </button>
  );
}, (prev, next) => {
  return (
    prev.image.id === next.image.id &&
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
