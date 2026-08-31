import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/pages/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getAuthHeaders, apiUrl, API_BASE_URL } from "@/lib/api/config";

interface HistoryInferenceResults {
  totalDetections: number;
  averageConfidence: number;
  detectionsByClass: Array<{
    className: string;
    count: number;
    avgConfidence?: number;
    averageConfidence?: number;
  }>;
  // Support both new structure (object with good/defect/all) and old structure (flat array)
  annotatedImages: {
    good: Array<{ filename: string; url: string; tag: 'good' }>;
    defect: Array<{ filename: string; url: string; tag: 'defect' }>;
    all: Array<{ filename: string; url: string; tag: 'good' | 'defect' | 'unreviewed' }>;
  } | Array<{
    filename: string;
    url: string;
    tag?: string;
  }>;
  statistics?: {
    total: number;        // Total files (images + videos)
    totalImages?: number; // Optional: image count
    totalVideos?: number; // Optional: video count
    good: number;
    defect: number;
    hasTags: boolean;
  };
  // Optional videos array from backend (additive)
  videos?: Array<{
    filename: string;
    url: string;
    fileType?: string;
  }>;
  // Optional metadata block from backend (contains video detection info)
  metadata?: {
    videos?: Array<{
      filePath?: string;
      detections?: Array<{
        className?: string;
        confidence?: number;
        bbox?: number[];
      }>;
      detectionCount?: number;
    }>;
    images?: Array<{
      filePath?: string;
      detections?: Array<{
        className?: string;
        confidence?: number;
        bbox?: number[];
      }>;
    }>;
    files?: Array<{
      filePath?: string;
      type?: string;
    }>;
  };
}

// VideoPlayer component with error handling and loading state
const VideoPlayer = ({ 
  video, 
  detectionCount 
}: { 
  video: { filename: string; url: string; fileType?: string }; 
  detectionCount?: number;
}) => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
        {videoLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {videoError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center">
            Failed to load video
          </div>
        ) : (
          <video
            controls
            className="w-full h-full object-contain"
            onLoadedData={() => setVideoLoading(false)}
            onError={() => {
              setVideoError(true);
              setVideoLoading(false);
            }}
          >
            <source src={video.url} type="video/mp4" />
            <source src={video.url} type="video/webm" />
            <source src={video.url} type="video/avi" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {video.filename}
      </div>
      {detectionCount !== undefined && detectionCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {detectionCount} detection{detectionCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

const PredictionHistoryDetailsPage = () => {
  const { inferenceId } = useParams<{ inferenceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<HistoryInferenceResults | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [corrosionBatch, setCorrosionBatch] = useState<{
    imageCount?: number;
    meanCorrosionPercent?: number;
    byClass?: Array<{ class: string; meanPercent: number; count: number }>;
  } | null>(null);
  const [imageFilter, setImageFilter] = useState<'all' | 'good' | 'defect'>('all');
  const [hasTags, setHasTags] = useState(false);

  // Annotated image viewer state
  type ImageItem = { filename: string; url: string; tag?: string };
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<ImageItem[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);

  // Cache for authenticated image object URLs
  const imageObjectUrlCache = useRef<Map<string, string>>(new Map());

  // Helper function to fetch image as blob with authentication
  const fetchImageAsObjectUrl = useCallback(async (imageUrl: string): Promise<string | null> => {
    // Check cache first
    if (imageObjectUrlCache.current.has(imageUrl)) {
      return imageObjectUrlCache.current.get(imageUrl) || null;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(imageUrl, { headers });

      if (!res.ok) {
        console.warn(`Failed to fetch image: ${imageUrl}`, res.status);
        return null;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      imageObjectUrlCache.current.set(imageUrl, objectUrl);
      return objectUrl;
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imageObjectUrlCache.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      imageObjectUrlCache.current.clear();
    };
  }, []);

  // Authenticated Image Component
  const AuthenticatedImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
  }> = ({ src, alt, className, onClick, style }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let isMounted = true;
      let currentObjectUrl: string | null = null;

      const loadImage = async () => {
        try {
          setLoading(true);
          setError(false);
          const url = await fetchImageAsObjectUrl(src);
          if (isMounted) {
            currentObjectUrl = url;
            setObjectUrl(url);
            setLoading(false);
            if (!url) {
              setError(true);
            }
          }
        } catch (err) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      };

      loadImage();

      return () => {
        isMounted = false;
        // Don't revoke here - let the cache manage it
      };
    }, [src, fetchImageAsObjectUrl]);

    if (error) {
      return (
        <div className={`${className} bg-muted flex items-center justify-center`} style={style}>
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      );
    }

    if (loading || !objectUrl) {
      return (
        <div className={`${className} bg-muted flex items-center justify-center`} style={style}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <img
        src={objectUrl}
        alt={alt}
        className={className}
        onClick={onClick}
        style={style}
        loading="lazy"
      />
    );
  };

  // Helper function to normalize annotated images from either structure
  const normalizeAnnotatedImages = (
    images: 
      | { good: Array<{ filename: string; url: string; tag?: string }>; defect: Array<{ filename: string; url: string; tag?: string }>; all: Array<{ filename: string; url: string; tag?: string }> }
      | Array<{ filename: string; url: string; tag?: string }>
      | undefined,
    inferenceId: string
  ): Array<{ filename: string; url: string; tag: string }> => {
    if (!images) return [];
    
    const apiBase = API_BASE_URL.replace(/\/+$/, "");
    
    // Check if new structure (object with good/defect/all)
    if (images && typeof images === 'object' && !Array.isArray(images) && 'all' in images) {
      // New structure: use 'all' array (already filtered by backend)
      const allImages = (images as { all: Array<{ filename: string; url: string; tag?: string }> }).all || [];
      return allImages.map((img) => {
        const raw = img.url || "";
        const basePath = raw.startsWith("/api/") ? raw.slice(4) : raw;
        const fullUrl = apiBase ? `${apiBase}/${basePath.replace(/^\/+/, "")}` : raw;
        return {
          ...img,
          url: fullUrl,
          tag: img.tag || 'unreviewed',
        };
      });
    } else if (Array.isArray(images)) {
      // Old structure: flat array
      return images.map((img) => {
        const raw = img.url || "";
        const basePath = raw.startsWith("/api/") ? raw.slice(4) : raw;
        const fullUrl = apiBase ? `${apiBase}/${basePath.replace(/^\/+/, "")}` : raw;
        return {
          ...img,
          url: fullUrl,
          tag: img.tag || 'unreviewed',
        };
      });
    }
    
    return [];
  };

  // Helper function to normalize videos from backend response
  const normalizeVideos = (
    videos: Array<{ filename?: string; url?: string }> | undefined,
    inferenceId: string
  ): Array<{ filename: string; url: string; fileType?: string }> => {
    if (!videos || !Array.isArray(videos)) return [];

    const apiBase = API_BASE_URL.replace(/\/+$/, "");

    return videos.map((vid) => {
      // Ensure filename is always present
      const filename = vid.filename || "";
      
      // Construct URL: videos are always in annotated/ folder, no folder query param needed
      const raw = vid.url || "";
      const basePath = raw.startsWith("/api/") ? raw.slice(4) : raw;
      
      // Remove any folder query parameters (videos don't use folder param)
      const cleanPath = basePath.split('?')[0];
      
      const fullUrl = apiBase ? `${apiBase}/${cleanPath.replace(/^\/+/, "")}` : cleanPath;
      
      return {
        filename,
        url: fullUrl,
        fileType: "video",
      };
    });
  };

  const fetchResults = async (filter: 'all' | 'good' | 'defect' = 'all') => {
    if (!inferenceId) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/inference/${encodeURIComponent(inferenceId)}/results?filter=${filter}`);

      const res = await fetch(url, {
        headers,
      });

      if (!res.ok) {
        toast({
          title: "Failed to load results",
          description: "Results are not ready yet or not found.",
          variant: "destructive",
        });
        return;
      }

      const response = await res.json();
      const data = response.results || response;
      setRegionName(typeof response.regionName === "string" ? response.regionName : null);
      setCorrosionBatch(data.corrosion || null);

      // Normalize annotated images from either structure
      const normalizedImages = normalizeAnnotatedImages(data.annotatedImages, inferenceId);
      // Normalize videos (if any)
      const normalizedVideos = normalizeVideos(
        (data.videos as Array<{ filename?: string; url?: string }>)
          || (data.metadata?.videos as Array<{ filename?: string; url?: string }>)
          || [],
        inferenceId
      );

      const normalized: HistoryInferenceResults = {
        ...data,
        detectionsByClass:
          (data.detectionsByClass as Array<{ className: string; count: number; avgConfidence?: number; averageConfidence?: number }> | undefined)?.map((item) => ({
            ...item,
            averageConfidence: item.avgConfidence ?? item.averageConfidence ?? 0,
          })) || [],
        annotatedImages: normalizedImages,
        videos: normalizedVideos,
        statistics: data.statistics || {
          total: normalizedImages.length + normalizedVideos.length,
          totalImages: normalizedImages.length,
          totalVideos: normalizedVideos.length,
          good: 0,
          defect: 0,
          hasTags: false,
        },
        metadata: data.metadata, // Preserve metadata for video detection info
      };

      setResults(normalized);
      setHasTags(Boolean(normalized.statistics?.hasTags));
    } catch (err: unknown) {
      console.error("Error loading history results:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not fetch inference results.";
      toast({
        title: "Failed to load results",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchResults(imageFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inferenceId, toast]);

  // Refetch when filter changes (only for new jobs with tags)
  useEffect(() => {
    if (!inferenceId || !hasTags) return;
    void fetchResults(imageFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFilter, hasTags, inferenceId]);

  return (
    <div className={cn("container mx-auto py-6 space-y-6")}>
      <PageHeader
        title="Inference Results"
        description="View detailed results for a completed inference job"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/project/prediction?tab=history")}
        className="px-0"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Prediction History
      </Button>

      {loading ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : !results ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-muted-foreground">
              Results are not available for this inference.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
              {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Results Summary</CardTitle>
              <CardDescription>
                Inference ID: {inferenceId}
                {regionName ? ` · Region: ${regionName}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xl font-bold">{results.totalDetections}</div>
                  <div className="text-xs text-muted-foreground">Total Detections</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {(results.averageConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Average Confidence</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {results.detectionsByClass.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Classes Detected</div>
                </div>
              </div>
              {corrosionBatch && typeof corrosionBatch.meanCorrosionPercent === "number" && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="text-sm font-medium">Photo pixel coverage</div>
                  <p className="text-xs text-muted-foreground">
                    % of this photo’s pixels tagged as rust, not % of the real steel surface.
                  </p>
                  <div className="text-xl font-bold">
                    {corrosionBatch.meanCorrosionPercent.toFixed(2)}%
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      mean across {corrosionBatch.imageCount ?? 0} image(s)
                    </span>
                  </div>
                  {Array.isArray(corrosionBatch.byClass) && corrosionBatch.byClass.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {corrosionBatch.byClass.map((row) => (
                        <li key={row.class}>
                          {row.class}: {row.meanPercent.toFixed(2)}% ({row.count} instances)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {/* Statistics row for tagged inference jobs */}
              {results.statistics && results.statistics.hasTags && (
                <div className="grid gap-4 md:grid-cols-3 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xl font-bold">
                      {results.statistics.total}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Files (Images + Videos)
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      {results.statistics.totalImages ??
                        (Array.isArray(results.annotatedImages)
                          ? results.annotatedImages.length
                          : 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Images
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">
                      {results.statistics.totalVideos ??
                        (results.videos ? results.videos.length : 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Videos
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detections by Class */}
          {results.detectionsByClass.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detections by Class</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Class</th>
                        <th className="text-right p-2">Count</th>
                        <th className="text-right p-2">Avg Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.detectionsByClass.map((item, idx) => (
                        <tr key={item.className || `history-class-${idx}`} className="border-b">
                          <td className="p-2 font-medium">{item.className}</td>
                          <td className="p-2 text-right">{item.count}</td>
                          <td className="p-2 text-right">
                            {(item.averageConfidence! * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Annotated Images with Filter Tabs */}
          {(() => {
            // Get images array (handle both old and new structures)
            const imagesArray: ImageItem[] = Array.isArray(results.annotatedImages)
              ? results.annotatedImages
              : results.annotatedImages && typeof results.annotatedImages === 'object' && 'all' in results.annotatedImages
              ? results.annotatedImages.all
              : [];
            
            if (imagesArray.length === 0) return null;
            
            // Determine if we should show filter tabs (only for new jobs with tags)
            const showFilters = results.statistics?.hasTags === true;
            
            // Get images to display based on filter
            let imagesToDisplay: ImageItem[] = imagesArray;
            if (showFilters && imageFilter !== 'all') {
              imagesToDisplay = imagesArray.filter((img) => img.tag === imageFilter);
            }

            const openImageViewerAt = (index: number, list: ImageItem[]) => {
              setImageViewerImages(list);
              setImageViewerIndex(index);
              setImageZoom(1);
              setImageViewerOpen(true);
            };
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Annotated Images</CardTitle>
                  <CardDescription>
                    {showFilters
                      ? `${results.statistics?.total || imagesArray.length} total images`
                      : `${imagesArray.length} image${imagesArray.length !== 1 ? "s" : ""} with detections`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showFilters ? (
                    <Tabs value={imageFilter} onValueChange={(value) => setImageFilter(value as 'all' | 'good' | 'defect')}>
                      <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
                        <TabsTrigger value="all">
                          All ({results.statistics?.total || 0})
                        </TabsTrigger>
                        <TabsTrigger value="good">
                          Good ({results.statistics?.good || 0})
                        </TabsTrigger>
                        <TabsTrigger value="defect">
                          Defect ({results.statistics?.defect || 0})
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="all" className="mt-0">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {imagesArray.map((img, idx) => (
                            <div
                              key={img.filename || img.url || `history-image-${idx}`}
                              className="space-y-2 cursor-zoom-in"
                              onClick={() => openImageViewerAt(idx, imagesArray)}
                            >
                              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                <AuthenticatedImage
                                  src={img.url}
                                  alt={img.filename}
                                  className="w-full h-full object-contain"
                                />
                                {img.tag && img.tag !== 'unreviewed' && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      img.tag === 'good'
                                        ? "bg-green-50 text-green-700 border-green-200 absolute top-2 right-2"
                                        : "bg-red-50 text-red-700 border-red-200 absolute top-2 right-2"
                                    }
                                  >
                                    {img.tag === 'good' ? '✅ Good' : '❌ Defect'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {img.filename}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="good" className="mt-0">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {imagesArray.filter((img) => img.tag === 'good').map((img, idx) => (
                            <div
                              key={img.filename || img.url || `history-image-${idx}`}
                              className="space-y-2 cursor-zoom-in"
                              onClick={() =>
                                openImageViewerAt(
                                  idx,
                                  imagesArray.filter((img) => img.tag === 'good'),
                                )
                              }
                            >
                              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                <AuthenticatedImage
                                  src={img.url}
                                  alt={img.filename}
                                  className="w-full h-full object-contain"
                                />
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 absolute top-2 right-2"
                                >
                                  ✅ Good
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {img.filename}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="defect" className="mt-0">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {imagesArray.filter((img) => img.tag === 'defect').map((img, idx) => (
                            <div
                              key={img.filename || img.url || `history-image-${idx}`}
                              className="space-y-2 cursor-zoom-in"
                              onClick={() =>
                                openImageViewerAt(
                                  idx,
                                  imagesArray.filter((img) => img.tag === 'defect'),
                                )
                              }
                            >
                              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                <AuthenticatedImage
                                  src={img.url}
                                  alt={img.filename}
                                  className="w-full h-full object-contain"
                                />
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 border-red-200 absolute top-2 right-2"
                                >
                                  ❌ Defect
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {img.filename}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {imagesArray.map((img, idx) => (
                        <div
                          key={img.filename || img.url || `history-image-${idx}`}
                          className="space-y-2"
                        >
                          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                            <AuthenticatedImage
                              src={img.url}
                              alt={img.filename}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {img.filename}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Annotated Image Viewer Dialog */}
          <Dialog
            open={imageViewerOpen}
            onOpenChange={(open) => {
              setImageViewerOpen(open);
              if (!open) {
                setImageZoom(1);
              }
            }}
          >
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {imageViewerImages[imageViewerIndex]?.filename || "Annotated image"}
                </DialogTitle>
                <DialogDescription>
                  {imageViewerImages.length > 0 &&
                    `${imageViewerIndex + 1} of ${imageViewerImages.length}`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto flex items-center justify-center bg-muted rounded-md">
                {imageViewerImages[imageViewerIndex] && (
                  <AuthenticatedImage
                    src={imageViewerImages[imageViewerIndex].url}
                    alt={imageViewerImages[imageViewerIndex].filename}
                    className="max-h-[80vh] object-contain transition-transform"
                    style={{ transform: `scale(${imageZoom})`, transformOrigin: "center center" }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setImageZoom((z) => Math.min(z + 0.25, 4))}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.5))}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(imageZoom * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setImageViewerIndex((idx) => Math.max(idx - 1, 0))
                    }
                    disabled={imageViewerIndex <= 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setImageViewerIndex((idx) =>
                        Math.min(idx + 1, imageViewerImages.length - 1),
                      )
                    }
                    disabled={imageViewerIndex >= imageViewerImages.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Videos (if any) */}
          {results.videos && results.videos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Videos</CardTitle>
                <CardDescription>
                  {results.statistics?.totalVideos ?? results.videos.length} video
                  {(results.statistics?.totalVideos ?? results.videos.length) !== 1 ? "s" : ""} processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {results.videos.map((video, idx) => {
                    // Find detection count from metadata
                    const videoMetadata = results.metadata?.videos?.find(
                      (v) => v.filePath?.includes(video.filename) || v.filePath === video.filename
                    );
                    const detectionCount = videoMetadata?.detectionCount ?? videoMetadata?.detections?.length ?? 0;
                    
                    return (
                      <VideoPlayer
                        key={video.filename || video.url || `history-video-${idx}`}
                        video={video}
                        detectionCount={detectionCount}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionHistoryDetailsPage;


