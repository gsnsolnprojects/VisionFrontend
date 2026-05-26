// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Convert annotations to YOLO label format
 * POST /api/dataset/:datasetId/convert-annotations-to-labels
 */
export const convertAnnotationsToLabels = async (
  datasetId: string,
  options: {
    modelType: "YOLO" | "YOLO_SEG";
    imageIds?: string[];
    folder?: string;
  }
): Promise<{
  converted: number;
  labelFilesCreated: number;
  message: string;
}> => {
  await delay(500 + Math.random() * 500); // 500-1000ms delay

  // Mock response - no actual conversion logic
  const converted = options.imageIds?.length ?? 10;
  const labelFilesCreated = converted;

  return {
    converted,
    labelFilesCreated,
    message: "Annotations converted to YOLO label format",
  };
};
