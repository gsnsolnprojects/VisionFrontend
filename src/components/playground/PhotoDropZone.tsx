import React, { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const IMAGE_NAME = /\.(jpe?g|png)$/i;

/**
 * Drop or browse for photos. Hands over only JPG/PNG photos within the plan's limits; anything else
 * is explained in a toast and nothing is handed over.
 */
export const PhotoDropZone: React.FC<{
  uploading: boolean;
  /** Largest photo in MB; null: no limit */
  maxMB: number | null;
  /** Photos the dataset can still take; null: no limit */
  spaceLeft: number | null;
  onPhotos: (images: File[]) => void;
}> = ({ uploading, maxMB, spaceLeft, onPhotos }) => {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (picked: File[]) => {
    if (input.current) input.current.value = "";
    if (uploading) return;
    const images = picked.filter((f) => IMAGE_NAME.test(f.name));
    if (!images.length) {
      toast({ title: "No images", description: "Choose JPG or PNG images.", variant: "destructive" });
      return;
    }
    const tooBig = maxMB === null ? [] : images.filter((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig.length) {
      toast({
        title: "Some images are too large",
        description: `Images can be up to ${maxMB} MB each. Too large: ${tooBig.slice(0, 3).map((f) => f.name).join(", ")}${tooBig.length > 3 ? ` and ${tooBig.length - 3} more` : ""}.`,
        variant: "destructive",
      });
      return;
    }
    if (spaceLeft !== null && images.length > spaceLeft) {
      toast({
        title: "Too many images",
        description: `There is room for ${spaceLeft} more image${spaceLeft === 1 ? "" : "s"} in your dataset. You chose ${images.length}.`,
        variant: "destructive",
      });
      return;
    }
    onPhotos(images);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
        dragging ? "border-ring bg-secondary/60" : "hover:border-ring/60"
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => take(Array.from(e.target.files ?? []))}
      />
      {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
      <p className="font-medium text-foreground">{uploading ? "Uploading..." : "Drop images here, or browse files"}</p>
      <p className="text-xs text-muted-foreground">
        JPG or PNG{maxMB !== null && ` · Up to ${maxMB} MB each`}
        {spaceLeft !== null && ` · ${spaceLeft} image space${spaceLeft === 1 ? "" : "s"} available`}
      </p>
    </div>
  );
};
