import React, { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { checkPhotos, describePhotoRules, refusedText, someNames, type PhotoRules } from "@/lib/imageRules";
import { cn } from "@/lib/utils";

const IMAGE_NAME = /\.(jpe?g|png)$/i;

/**
 * Drop or browse for photos. Shows the plan's size rules, and hands over only JPG/PNG photos that
 * follow them; photos left out are named in a message, with why. Small but allowed photos get a
 * gentle warning.
 */
export const PhotoDropZone: React.FC<{
  uploading: boolean;
  /** The plan's size rules for each photo */
  rules: PhotoRules;
  /** Photos the dataset can still take; null: no limit */
  spaceLeft: number | null;
  onPhotos: (images: File[]) => void;
}> = ({ uploading, rules, spaceLeft, onPhotos }) => {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const { size, pixels } = describePhotoRules(rules);
  const busy = uploading || checking;

  const take = async (picked: File[]) => {
    if (input.current) input.current.value = "";
    if (busy) return;
    const images = picked.filter((f) => IMAGE_NAME.test(f.name));
    if (!images.length) {
      toast({ title: "No images", description: "Choose JPG or PNG images.", variant: "destructive" });
      return;
    }
    setChecking(true);
    const { ok, refused, small } = await checkPhotos(images, rules).finally(() => setChecking(false));
    if (refused.length) {
      toast({
        title: ok.length ? "Some photos were left out" : "These photos can't be used",
        description: refusedText(refused),
        variant: "destructive",
      });
    }
    if (!ok.length) return;
    if (spaceLeft !== null && ok.length > spaceLeft) {
      toast({
        title: "Too many images",
        description: `There is room for ${spaceLeft} more image${spaceLeft === 1 ? "" : "s"} in your dataset. You chose ${ok.length}.`,
        variant: "destructive",
      });
      return;
    }
    if (small.length) {
      toast({
        title: small.length === 1 ? "A small photo" : `${small.length} small photos`,
        description: `Uploading, but small defects may be hard to find in photos under 640 px: ${someNames(small)}.`,
      });
    }
    onPhotos(ok);
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
        void take(Array.from(e.dataTransfer.files));
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
        onChange={(e) => void take(Array.from(e.target.files ?? []))}
      />
      {busy ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
      <p className="font-medium text-foreground">{uploading ? "Uploading..." : checking ? "Checking photos..." : "Drop images here, or browse files"}</p>
      <p className="text-xs text-muted-foreground">
        JPG or PNG{size && ` · ${size}`}
        {spaceLeft !== null && ` · ${spaceLeft} image space${spaceLeft === 1 ? "" : "s"} available`}
      </p>
      {pixels && <p className="text-xs text-muted-foreground">{pixels}</p>}
    </div>
  );
};
