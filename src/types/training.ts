/** Training model families supported by POST /api/train and GET /api/train/defaults */
export type TrainModelType = "YOLO" | "YOLO_SEG" | "RF_DETR";

export interface TrainHyperparameters {
  epochs?: number;
  batchSize?: number;
  imgSize?: number;
  learningRate?: number;
  workers?: number;
}

/** Backend defaults for RF_DETR (GET /train/defaults?modelType=RF_DETR) */
export const RF_DETR_DEFAULT_HYPERPARAMETERS: TrainHyperparameters = {
  epochs: 50,
  batchSize: 4,
  imgSize: 384,
  learningRate: 0.0001,
  workers: 2,
};
