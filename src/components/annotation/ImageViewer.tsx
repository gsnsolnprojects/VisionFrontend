import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthHeaders, apiUrl, API_BASE_URL } from "@/lib/api/config";

interface ImageViewerProps {
  imageUrl: string | null;
  imageId: string | null;
  onImageLoad?: () => void;
  onImageError?: () => void;
  /**
   * Optional callback to report image metrics (used for precise bbox calculations)
   * - naturalWidth / naturalHeight: actual image resolution
   * - renderedWidth / renderedHeight: current displayed size in the DOM
   */
  onImageMetricsChange?: (metrics: {
    naturalWidth: number;
    naturalHeight: number;
    renderedWidth: number;
    renderedHeight: number;
  }) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  imageId,
  onImageLoad,
  onImageError,
   onImageMetricsChange,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imageObjectUrlCache = useRef<Map<string, string>>(new Map());
  const currentObjectUrlRef = useRef<string | null>(null);

  // Normalize image URL to use the same API base as other requests
  const normalizeImageUrl = useCallback((url: string): string => {
    // If backend returned a relative path that already starts with /api,
    // just attach the correct origin (avoid /api/api double prefixing).
    if (url.startsWith("/api/")) {
      if (!API_BASE_URL) return url;
      try {
        const apiBaseUrl = new URL(API_BASE_URL);
        return `${apiBaseUrl.origin}${url}`;
      } catch {
        return url;
      }
    }

    // If backend returned some other relative path, route it through apiUrl
    if (url.startsWith("/")) {
      return apiUrl(url);
    }

    // If backend returned an absolute URL, ensure it uses the same origin as API_BASE_URL
    try {
      const apiBase = API_BASE_URL.replace(/\/+$/, "");
      if (!apiBase) return url;

      const apiBaseUrl = new URL(apiBase);
      const imageUrlObj = new URL(url);

      // Only rewrite if path is under the API base path (typically "/api")
      if (imageUrlObj.pathname.startsWith(apiBaseUrl.pathname)) {
        return `${apiBaseUrl.origin}${imageUrlObj.pathname}${imageUrlObj.search}`;
      }
    } catch {
      // Fallback to original URL on any parsing errors
      return url;
    }

    return url;
  }, []);

  // Fetch image as blob with authentication headers
  const fetchImageAsObjectUrl = useCallback(async (url: string): Promise<string | null> => {
    const normalizedUrl = normalizeImageUrl(url);

    // Check cache first
    if (imageObjectUrlCache.current.has(normalizedUrl)) {
      return imageObjectUrlCache.current.get(normalizedUrl) || null;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(normalizedUrl, { headers });

      if (!res.ok) {
        console.warn(`Failed to fetch image: ${normalizedUrl}`, res.status);
        return null;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      imageObjectUrlCache.current.set(normalizedUrl, objectUrl);
      return objectUrl;
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  }, [normalizeImageUrl]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imageObjectUrlCache.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      imageObjectUrlCache.current.clear();
    };
  }, []);

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) {
      setObjectUrl(null);
      currentObjectUrlRef.current = null;
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);
    currentObjectUrlRef.current = null;

    fetchImageAsObjectUrl(imageUrl).then((url) => {
      if (isMounted) {
        currentObjectUrlRef.current = url;
        setObjectUrl(url);
        setLoading(false);
        if (!url) {
          setError(true);
        }
      }
    });

    return () => {
      isMounted = false;
      // Cleanup: If component unmounts before image loads, revoke any pending object URL
      const urlToCleanup = currentObjectUrlRef.current;
      if (urlToCleanup && !imageObjectUrlCache.current.has(imageUrl)) {
        try {
          URL.revokeObjectURL(urlToCleanup);
          currentObjectUrlRef.current = null;
        } catch (err) {
          // Ignore errors when revoking (e.g., already revoked)
          console.warn("Error revoking object URL:", err);
        }
      }
    };
  }, [imageUrl, fetchImageAsObjectUrl]);

  const handleLoad = () => {
    setError(false);
    if (imgRef.current && onImageMetricsChange) {
      const img = imgRef.current;
      onImageMetricsChange({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: img.clientWidth,
        renderedHeight: img.clientHeight,
      });
    }
    onImageLoad?.();
  };

  const handleError = () => {
    setError(true);
    onImageError?.();
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    if (imageUrl) {
      // Clear cache entry and reload
      if (imageObjectUrlCache.current.has(imageUrl)) {
        const cachedUrl = imageObjectUrlCache.current.get(imageUrl);
        if (cachedUrl) {
          URL.revokeObjectURL(cachedUrl);
        }
        imageObjectUrlCache.current.delete(imageUrl);
      }
      fetchImageAsObjectUrl(imageUrl).then((url) => {
        setObjectUrl(url);
        setLoading(false);
        if (!url) {
          setError(true);
        }
      });
    }
  };

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        No image selected for annotation.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Failed to load image</p>
          <p className="text-xs text-muted-foreground">
            The image could not be loaded. Please try again.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !objectUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading image...</p>
        </div>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={objectUrl}
      alt={imageId ?? "Annotation image"}
      className="max-h-full max-w-full object-contain"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};


