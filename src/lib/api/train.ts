import { apiRequest } from "./config";
import type { TrainHyperparameters, TrainModelType } from "@/types/training";

/**
 * GET /api/train/defaults?modelType=YOLO|YOLO_SEG|RF_DETR
 * RF_DETR expected: epochs 50, batchSize 4, imgSize 384, learningRate 0.0001, workers 2
 */
export const fetchTrainDefaults = async (
  modelType: TrainModelType
): Promise<{ defaults: TrainHyperparameters | null }> => {
  const path = `/train/defaults?modelType=${encodeURIComponent(modelType)}`;
  return apiRequest<{ defaults: TrainHyperparameters | null }>(path);
};
