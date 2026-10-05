import React, { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api/config";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Module-level cache so the same image isn't re-fetched every time a card
// re-renders across the app (mirrors the per-page cache pattern already
// used in PredictionHistoryDetailsPage.tsx, shared here across pages).
const objectUrlCache = new Map<string, string>();

// A transient failure (a dropped connection, a dev-server restart mid-fetch)
// shouldn't leave the image stuck on "Failed to load" forever — retry a
// couple of times with backoff before actually giving up.
const MAX_AUTO_RETRIES = 2;

/**
 * Renders an image served from an authenticated backend endpoint (e.g.
 * GET /api/inference/:inferenceId/image/:filename) by fetching it as a
 * blob with auth headers and rendering it as an object URL — a plain
 * <img src> can't send auth headers.
 */
export const AuthenticatedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ src, alt, className, onClick, style }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(objectUrlCache.get(src) || null);
  const [loading, setLoading] = useState(!objectUrlCache.has(src));
  const [error, setError] = useState(false);
  // Bumped only by the user's manual "Retry" click once auto-retries are
  // exhausted — re-enters the effect below without needing `src` to change.
  const [manualRetryToken, setManualRetryToken] = useState(0);

  useEffect(() => {
    // Scoped to THIS effect run (i.e. this specific `src`) — unlike a shared
    // ref, an older in-flight fetch's own `cancelled` stays false forever once
    // `src` changes again, even though a newer effect run has since set a
    // ref-based flag back to true. Without this, rapidly switching `src`
    // (e.g. many cards updating at once when the selected survey changes)
    // let a stale fetch's late resolution overwrite the current image's
    // state with a stale result or a spurious "Failed to load".
    let cancelled = false;

    if (objectUrlCache.has(src)) {
      setObjectUrl(objectUrlCache.get(src) || null);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    const attemptFetch = async (attempt: number): Promise<void> => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(src, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlCache.set(src, url);
        if (!cancelled) {
          setObjectUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (attempt < MAX_AUTO_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          if (!cancelled) await attemptFetch(attempt + 1);
        } else {
          console.warn(`Failed to load authenticated image after ${attempt + 1} attempt(s): ${src}`, err);
          setError(true);
          setLoading(false);
        }
      }
    };

    attemptFetch(0);

    return () => {
      cancelled = true;
    };
  }, [src, manualRetryToken]);

  if (error) {
    return (
      <div
        className={cn(className, "bg-muted flex flex-col items-center justify-center gap-1 cursor-pointer")}
        style={style}
        onClick={() => setManualRetryToken((t) => t + 1)}
        title="Click to retry"
      >
        <span className="text-xs text-muted-foreground">Failed to load</span>
        <span className="text-xs font-medium text-primary underline">Retry</span>
      </div>
    );
  }

  if (loading || !objectUrl) {
    return (
      <div className={cn(className, "bg-muted flex items-center justify-center")} style={style}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
};
