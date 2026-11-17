import type { PlanLimits } from "@/lib/api/subscription";

/**
 * The plan's size rules for uploaded photos (the server checks the same: utils/imageRules.js), and
 * the check run on photos before they're uploaded. null = no rule.
 */
export interface PhotoRules {
  /** Largest file, in MB */
  maxMB: number | null;
  /** Smallest file, in KB (smaller is usually empty or damaged) */
  minKB: number | null;
  /** Shorter side, at least this many pixels */
  minSide: number | null;
  /** Longer side, at most this many pixels */
  maxSide: number | null;
}

/** Below this on the shorter side a photo is allowed, but small defects may be hard to find */
export const SMALL_PHOTO_SIDE = 640;

const num = (v: unknown) => (typeof v === "number" ? v : null);

export const photoRulesFrom = (limits?: PlanLimits | null): PhotoRules => ({
  maxMB: num(limits?.maxImageSizeMB),
  minKB: num(limits?.minImageSizeKB),
  minSide: num(limits?.minImageSide),
  maxSide: num(limits?.maxImageSide),
});

/** The rules in a few words, for the upload area: file size and pixel size */
export function describePhotoRules(r: PhotoRules): { size: string | null; pixels: string | null } {
  const size =
    r.minKB !== null && r.maxMB !== null
      ? `${r.minKB} KB to ${r.maxMB} MB each`
      : r.maxMB !== null
        ? `Up to ${r.maxMB} MB each`
        : r.minKB !== null
          ? `At least ${r.minKB} KB each`
          : null;
  const pixels =
    r.minSide !== null && r.maxSide !== null
      ? `${r.minSide} to ${r.maxSide} px on each side`
      : r.minSide !== null
        ? `At least ${r.minSide} px on each side`
        : r.maxSide !== null
          ? `Up to ${r.maxSide} px on each side`
          : null;
  return { size, pixels };
}

/**
 * A photo's width and height, read from the start of the file (JPG and PNG), so even hundreds of
 * large photos are measured in a moment; falls back to opening the photo
 */
async function measure(file: File): Promise<{ w: number; h: number } | null> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    const view = new DataView(bytes.buffer);
    // PNG: the size is in the first chunk
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes.length > 24) {
      return { w: view.getUint32(16), h: view.getUint32(20) };
    }
    // JPG: walk the markers to the frame header
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = bytes[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const h = view.getUint16(i + 5);
          const w = view.getUint16(i + 7);
          if (w && h) return { w, h };
          break;
        }
        i += 2 + view.getUint16(i + 2);
      }
    }
  } catch {
    // fall back below
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth && img.naturalHeight ? { w: img.naturalWidth, h: img.naturalHeight } : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export interface PhotoCheck {
  /** Photos that follow every rule */
  ok: File[];
  /** Photos left out, by reason ("too large (over 5 MB)") */
  refused: { reason: string; files: File[] }[];
  /** Allowed, but small enough that small defects may be hard to find */
  small: File[];
}

/** Sorts photos into the ones that can be uploaded and the ones left out, and why */
export async function checkPhotos(files: File[], rules: PhotoRules): Promise<PhotoCheck> {
  const groups = new Map<string, File[]>();
  const refuse = (reason: string, f: File) => groups.set(reason, [...(groups.get(reason) ?? []), f]);
  const ok: File[] = [];
  const small: File[] = [];
  const needsPixels = rules.minSide !== null || rules.maxSide !== null;
  for (const f of files) {
    if (rules.maxMB !== null && f.size > rules.maxMB * 1024 * 1024) {
      refuse(`too large (over ${rules.maxMB} MB)`, f);
      continue;
    }
    if (rules.minKB !== null && f.size < rules.minKB * 1024) {
      refuse(`too small or damaged (under ${rules.minKB} KB)`, f);
      continue;
    }
    const size = needsPixels ? await measure(f) : null;
    if (needsPixels && !size) {
      refuse("couldn't be read", f);
      continue;
    }
    if (size && rules.minSide !== null && Math.min(size.w, size.h) < rules.minSide) {
      refuse(`too small (under ${rules.minSide} px on a side)`, f);
      continue;
    }
    if (size && rules.maxSide !== null && Math.max(size.w, size.h) > rules.maxSide) {
      refuse(`too large (over ${rules.maxSide} px on a side)`, f);
      continue;
    }
    if (size && Math.min(size.w, size.h) < SMALL_PHOTO_SIDE) small.push(f);
    ok.push(f);
  }
  return { ok, refused: [...groups].map(([reason, list]) => ({ reason, files: list })), small };
}

/** A few photos' names, for a message */
export const someNames = (files: File[]) =>
  `${files
    .slice(0, 3)
    .map((f) => f.name)
    .join(", ")}${files.length > 3 ? ` and ${files.length - 3} more` : ""}`;

/** One line per reason a photo was left out, for a message */
export const refusedText = (refused: PhotoCheck["refused"]) =>
  refused.map(({ reason, files }) => `${files.length} ${files.length === 1 ? "photo" : "photos"} ${reason}: ${someNames(files)}.`).join(" ");
