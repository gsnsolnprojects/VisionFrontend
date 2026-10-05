// AUTO-GENERATED from real Vision-M models (VisionBackend/models/gsn). Do not edit by hand.
// Detections are real YOLO predictions (conf >= 0.10) on held-out val/test images; boxes are normalized xyxy.
// Car-seat results.csv logged every epoch twice (identical rows); deduplicated by epoch.
// inferenceMs = measured on an NVIDIA GPU (warm), YOLO nano, 640px.

export interface DemoDetection { label: string; confidence: number; box: [number, number, number, number] }
export interface DemoSample { id: string; product: string; image: string; width: number; height: number; inferenceMs: number; detections: DemoDetection[] }
export interface TrainingPoint { epoch: number; map50: number; map5095: number; precision: number; recall: number }

export const DEMO_SAMPLES: DemoSample[] = [
  {
    "id": "blister-1",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/blister-1.jpg",
    "width": 640,
    "height": 640,
    "inferenceMs": 15.2,
    "detections": [
      {
        "label": "product",
        "confidence": 0.981,
        "box": [
          0.0001,
          0.0465,
          0.995,
          0.9859
        ]
      },
      {
        "label": "defect",
        "confidence": 0.939,
        "box": [
          0.2512,
          0.673,
          0.4464,
          0.9456
        ]
      },
      {
        "label": "defect",
        "confidence": 0.932,
        "box": [
          0.4565,
          0.6585,
          0.6604,
          0.9279
        ]
      },
      {
        "label": "defect",
        "confidence": 0.821,
        "box": [
          0.0405,
          0.6793,
          0.2454,
          0.964
        ]
      }
    ]
  },
  {
    "id": "blister-2",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/blister-2.jpg",
    "width": 1100,
    "height": 618,
    "inferenceMs": 13.1,
    "detections": [
      {
        "label": "product",
        "confidence": 0.994,
        "box": [
          0.088,
          0.1726,
          0.8607,
          0.81
        ]
      },
      {
        "label": "defect",
        "confidence": 0.897,
        "box": [
          0.1514,
          0.5538,
          0.2665,
          0.7602
        ]
      },
      {
        "label": "defect",
        "confidence": 0.893,
        "box": [
          0.1376,
          0.3168,
          0.2528,
          0.5286
        ]
      }
    ]
  },
  {
    "id": "blister-3",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/blister-3.jpg",
    "width": 640,
    "height": 640,
    "inferenceMs": 15.0,
    "detections": [
      {
        "label": "product",
        "confidence": 0.887,
        "box": [
          0.0267,
          0.3053,
          1.0,
          0.8028
        ]
      },
      {
        "label": "defect",
        "confidence": 0.847,
        "box": [
          0.1225,
          0.3624,
          0.3206,
          0.5546
        ]
      },
      {
        "label": "product",
        "confidence": 0.207,
        "box": [
          0.059,
          0.826,
          0.9791,
          1.0
        ]
      }
    ]
  },
  {
    "id": "blister-4",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/blister-4.jpg",
    "width": 640,
    "height": 640,
    "inferenceMs": 16.0,
    "detections": [
      {
        "label": "product",
        "confidence": 0.994,
        "box": [
          0.0937,
          0.0676,
          0.8923,
          0.9581
        ]
      }
    ]
  },
  {
    "id": "blister-5",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/blister-5.jpg",
    "width": 640,
    "height": 640,
    "inferenceMs": 17.3,
    "detections": [
      {
        "label": "product",
        "confidence": 0.999,
        "box": [
          0.0,
          0.0,
          1.0,
          1.0
        ]
      },
      {
        "label": "defect",
        "confidence": 0.917,
        "box": [
          0.3747,
          0.5595,
          0.6378,
          0.8604
        ]
      },
      {
        "label": "defect",
        "confidence": 0.877,
        "box": [
          0.6848,
          0.5844,
          0.9527,
          0.8836
        ]
      },
      {
        "label": "defect",
        "confidence": 0.871,
        "box": [
          0.5283,
          0.7162,
          0.7911,
          1.0
        ]
      },
      {
        "label": "defect",
        "confidence": 0.862,
        "box": [
          0.2207,
          0.4044,
          0.4816,
          0.6978
        ]
      },
      {
        "label": "defect",
        "confidence": 0.85,
        "box": [
          0.5244,
          0.4092,
          0.7904,
          0.6982
        ]
      }
    ]
  },
  {
    "id": "seat-1",
    "product": "Car seat",
    "image": "/demo/vision-m/samples/seat-1.jpg",
    "width": 1100,
    "height": 1466,
    "inferenceMs": 17.7,
    "detections": [
      {
        "label": "product",
        "confidence": 0.964,
        "box": [
          0.0319,
          0.0172,
          0.864,
          1.0
        ]
      },
      {
        "label": "stain",
        "confidence": 0.931,
        "box": [
          0.3693,
          0.2673,
          0.6345,
          0.6205
        ]
      },
      {
        "label": "tear",
        "confidence": 0.878,
        "box": [
          0.1633,
          0.5146,
          0.3414,
          0.74
        ]
      }
    ]
  },
  {
    "id": "seat-2",
    "product": "Car seat",
    "image": "/demo/vision-m/samples/seat-2.jpg",
    "width": 1100,
    "height": 1466,
    "inferenceMs": 14.5,
    "detections": [
      {
        "label": "tear",
        "confidence": 0.986,
        "box": [
          0.1214,
          0.7928,
          0.2776,
          0.9085
        ]
      },
      {
        "label": "product",
        "confidence": 0.959,
        "box": [
          0.1701,
          0.0,
          0.9769,
          1.0
        ]
      },
      {
        "label": "product",
        "confidence": 0.76,
        "box": [
          0.0001,
          0.0065,
          0.1578,
          1.0
        ]
      }
    ]
  }
];

export const TRAINING_CURVES: Record<"blister" | "seat", TrainingPoint[]> = {"blister": [{"epoch": 1, "map50": 0.1963, "map5095": 0.0849, "precision": 0.0093, "recall": 0.9615}, {"epoch": 2, "map50": 0.2547, "map5095": 0.1255, "precision": 0.0092, "recall": 0.9551}, {"epoch": 3, "map50": 0.3533, "map5095": 0.2647, "precision": 0.0086, "recall": 0.9039}, {"epoch": 4, "map50": 0.4652, "map5095": 0.3437, "precision": 0.0086, "recall": 0.9039}, {"epoch": 5, "map50": 0.5643, "map5095": 0.4217, "precision": 1.0, "recall": 0.1242}, {"epoch": 6, "map50": 0.7531, "map5095": 0.5222, "precision": 0.9271, "recall": 0.359}, {"epoch": 7, "map50": 0.7457, "map5095": 0.521, "precision": 0.7534, "recall": 0.5485}, {"epoch": 8, "map50": 0.8088, "map5095": 0.5484, "precision": 0.8339, "recall": 0.6607}, {"epoch": 9, "map50": 0.9271, "map5095": 0.6169, "precision": 0.865, "recall": 0.8623}, {"epoch": 10, "map50": 0.9721, "map5095": 0.6486, "precision": 0.92, "recall": 0.933}, {"epoch": 11, "map50": 0.9807, "map5095": 0.6593, "precision": 0.9226, "recall": 0.9679}, {"epoch": 12, "map50": 0.9681, "map5095": 0.6567, "precision": 0.9336, "recall": 0.9039}, {"epoch": 13, "map50": 0.9736, "map5095": 0.6414, "precision": 0.9203, "recall": 0.923}, {"epoch": 14, "map50": 0.9849, "map5095": 0.6585, "precision": 0.9779, "recall": 0.9328}, {"epoch": 15, "map50": 0.9873, "map5095": 0.6754, "precision": 0.9622, "recall": 0.964}, {"epoch": 16, "map50": 0.989, "map5095": 0.685, "precision": 0.9668, "recall": 0.9872}, {"epoch": 17, "map50": 0.9865, "map5095": 0.6911, "precision": 0.9449, "recall": 0.982}, {"epoch": 18, "map50": 0.9858, "map5095": 0.6999, "precision": 0.9379, "recall": 0.9853}, {"epoch": 19, "map50": 0.9862, "map5095": 0.7236, "precision": 0.9411, "recall": 0.975}, {"epoch": 20, "map50": 0.9886, "map5095": 0.7181, "precision": 0.9529, "recall": 0.9872}, {"epoch": 21, "map50": 0.9903, "map5095": 0.7249, "precision": 0.9879, "recall": 0.9808}, {"epoch": 22, "map50": 0.9924, "map5095": 0.7317, "precision": 0.991, "recall": 0.9823}, {"epoch": 23, "map50": 0.9929, "map5095": 0.7313, "precision": 0.9983, "recall": 0.9872}, {"epoch": 24, "map50": 0.9933, "map5095": 0.7402, "precision": 0.9974, "recall": 0.9846}, {"epoch": 25, "map50": 0.9943, "map5095": 0.7259, "precision": 0.9968, "recall": 0.9841}, {"epoch": 26, "map50": 0.9943, "map5095": 0.7359, "precision": 0.999, "recall": 0.97}, {"epoch": 27, "map50": 0.9947, "map5095": 0.7435, "precision": 0.9968, "recall": 0.9848}, {"epoch": 28, "map50": 0.9942, "map5095": 0.7507, "precision": 0.9985, "recall": 0.9744}, {"epoch": 29, "map50": 0.9948, "map5095": 0.7371, "precision": 0.9974, "recall": 0.9853}, {"epoch": 30, "map50": 0.995, "map5095": 0.7419, "precision": 0.9997, "recall": 0.9911}, {"epoch": 31, "map50": 0.9949, "map5095": 0.7562, "precision": 0.9964, "recall": 0.9869}, {"epoch": 32, "map50": 0.995, "map5095": 0.752, "precision": 0.9991, "recall": 0.9887}, {"epoch": 33, "map50": 0.995, "map5095": 0.7461, "precision": 0.9966, "recall": 0.9876}, {"epoch": 34, "map50": 0.995, "map5095": 0.7291, "precision": 0.9951, "recall": 0.9876}, {"epoch": 35, "map50": 0.995, "map5095": 0.7431, "precision": 0.9971, "recall": 0.9876}, {"epoch": 36, "map50": 0.9949, "map5095": 0.7469, "precision": 0.9986, "recall": 0.9875}, {"epoch": 37, "map50": 0.9943, "map5095": 0.7523, "precision": 0.9979, "recall": 0.9861}, {"epoch": 38, "map50": 0.9945, "map5095": 0.7425, "precision": 0.9983, "recall": 0.9858}, {"epoch": 39, "map50": 0.9948, "map5095": 0.7392, "precision": 1.0, "recall": 0.9858}, {"epoch": 40, "map50": 0.9949, "map5095": 0.7539, "precision": 1.0, "recall": 0.9888}, {"epoch": 41, "map50": 0.9941, "map5095": 0.7645, "precision": 0.9875, "recall": 0.9886}, {"epoch": 42, "map50": 0.9869, "map5095": 0.7609, "precision": 0.9632, "recall": 0.9673}, {"epoch": 43, "map50": 0.9944, "map5095": 0.7696, "precision": 0.9975, "recall": 0.9875}, {"epoch": 44, "map50": 0.9942, "map5095": 0.7683, "precision": 0.9981, "recall": 0.9857}, {"epoch": 45, "map50": 0.9939, "map5095": 0.7674, "precision": 0.999, "recall": 0.9861}, {"epoch": 46, "map50": 0.9939, "map5095": 0.7651, "precision": 1.0, "recall": 0.9852}, {"epoch": 47, "map50": 0.9939, "map5095": 0.7692, "precision": 0.9996, "recall": 0.9861}, {"epoch": 48, "map50": 0.9939, "map5095": 0.7691, "precision": 0.9986, "recall": 0.9854}, {"epoch": 49, "map50": 0.994, "map5095": 0.7639, "precision": 0.9985, "recall": 0.9858}, {"epoch": 50, "map50": 0.9942, "map5095": 0.7681, "precision": 0.9987, "recall": 0.9872}], "seat": [{"epoch": 1, "map50": 0.0392, "map5095": 0.0158, "precision": 0.0051, "recall": 0.4461}, {"epoch": 2, "map50": 0.1604, "map5095": 0.0777, "precision": 0.0064, "recall": 0.5752}, {"epoch": 3, "map50": 0.2265, "map5095": 0.1449, "precision": 0.8884, "recall": 0.1639}, {"epoch": 4, "map50": 0.3308, "map5095": 0.2292, "precision": 0.9595, "recall": 0.3005}, {"epoch": 5, "map50": 0.3603, "map5095": 0.2706, "precision": 0.9711, "recall": 0.3169}, {"epoch": 6, "map50": 0.4293, "map5095": 0.3041, "precision": 0.9793, "recall": 0.3142}, {"epoch": 7, "map50": 0.494, "map5095": 0.3444, "precision": 0.5902, "recall": 0.4706}, {"epoch": 8, "map50": 0.5938, "map5095": 0.3973, "precision": 0.6508, "recall": 0.6214}, {"epoch": 9, "map50": 0.7446, "map5095": 0.4849, "precision": 0.6567, "recall": 0.7215}, {"epoch": 10, "map50": 0.8284, "map5095": 0.5324, "precision": 0.8511, "recall": 0.7538}, {"epoch": 11, "map50": 0.8506, "map5095": 0.55, "precision": 0.8693, "recall": 0.7992}, {"epoch": 12, "map50": 0.8766, "map5095": 0.5677, "precision": 0.858, "recall": 0.8464}, {"epoch": 13, "map50": 0.8899, "map5095": 0.5908, "precision": 0.9301, "recall": 0.8284}, {"epoch": 14, "map50": 0.8955, "map5095": 0.5925, "precision": 0.8394, "recall": 0.8432}, {"epoch": 15, "map50": 0.9022, "map5095": 0.6211, "precision": 0.9017, "recall": 0.8717}, {"epoch": 16, "map50": 0.8845, "map5095": 0.6087, "precision": 0.863, "recall": 0.8704}, {"epoch": 17, "map50": 0.8908, "map5095": 0.6219, "precision": 0.925, "recall": 0.8692}, {"epoch": 18, "map50": 0.9515, "map5095": 0.6436, "precision": 0.9684, "recall": 0.9036}, {"epoch": 19, "map50": 0.9492, "map5095": 0.6568, "precision": 0.9643, "recall": 0.9124}, {"epoch": 20, "map50": 0.9617, "map5095": 0.6795, "precision": 0.9776, "recall": 0.9167}, {"epoch": 21, "map50": 0.9548, "map5095": 0.6677, "precision": 0.9559, "recall": 0.9158}, {"epoch": 22, "map50": 0.9612, "map5095": 0.6737, "precision": 0.971, "recall": 0.902}, {"epoch": 23, "map50": 0.9697, "map5095": 0.6824, "precision": 0.9604, "recall": 0.9288}, {"epoch": 24, "map50": 0.9703, "map5095": 0.6893, "precision": 0.9577, "recall": 0.9269}, {"epoch": 25, "map50": 0.9735, "map5095": 0.7097, "precision": 0.9776, "recall": 0.9245}, {"epoch": 26, "map50": 0.9716, "map5095": 0.7193, "precision": 0.971, "recall": 0.928}, {"epoch": 27, "map50": 0.9662, "map5095": 0.7314, "precision": 0.9574, "recall": 0.9135}, {"epoch": 28, "map50": 0.9659, "map5095": 0.7354, "precision": 0.9675, "recall": 0.9188}, {"epoch": 29, "map50": 0.9678, "map5095": 0.7288, "precision": 0.9571, "recall": 0.903}, {"epoch": 30, "map50": 0.9761, "map5095": 0.7226, "precision": 0.9605, "recall": 0.9439}, {"epoch": 31, "map50": 0.9788, "map5095": 0.751, "precision": 0.9672, "recall": 0.9332}, {"epoch": 32, "map50": 0.9742, "map5095": 0.7337, "precision": 0.934, "recall": 0.9543}, {"epoch": 33, "map50": 0.9788, "map5095": 0.7368, "precision": 0.9703, "recall": 0.9477}, {"epoch": 34, "map50": 0.9773, "map5095": 0.7301, "precision": 0.9641, "recall": 0.9379}, {"epoch": 35, "map50": 0.9693, "map5095": 0.7395, "precision": 0.9655, "recall": 0.9363}, {"epoch": 36, "map50": 0.9764, "map5095": 0.7439, "precision": 0.9671, "recall": 0.9199}, {"epoch": 37, "map50": 0.9794, "map5095": 0.7436, "precision": 0.9445, "recall": 0.9543}, {"epoch": 38, "map50": 0.9801, "map5095": 0.7513, "precision": 0.9539, "recall": 0.9585}, {"epoch": 39, "map50": 0.9768, "map5095": 0.7518, "precision": 0.9439, "recall": 0.9451}, {"epoch": 40, "map50": 0.9698, "map5095": 0.7402, "precision": 0.9228, "recall": 0.9722}, {"epoch": 41, "map50": 0.9765, "map5095": 0.7385, "precision": 0.9651, "recall": 0.9423}, {"epoch": 42, "map50": 0.9696, "map5095": 0.7454, "precision": 0.9369, "recall": 0.9524}, {"epoch": 43, "map50": 0.9724, "map5095": 0.7435, "precision": 0.947, "recall": 0.9443}, {"epoch": 44, "map50": 0.9706, "map5095": 0.7521, "precision": 0.9481, "recall": 0.9495}, {"epoch": 45, "map50": 0.9753, "map5095": 0.7621, "precision": 0.9686, "recall": 0.9383}, {"epoch": 46, "map50": 0.9753, "map5095": 0.7796, "precision": 0.9257, "recall": 0.9778}, {"epoch": 47, "map50": 0.9706, "map5095": 0.7552, "precision": 0.9475, "recall": 0.9427}, {"epoch": 48, "map50": 0.9701, "map5095": 0.7555, "precision": 0.9271, "recall": 0.9723}, {"epoch": 49, "map50": 0.9717, "map5095": 0.7552, "precision": 0.9429, "recall": 0.9498}, {"epoch": 50, "map50": 0.9777, "map5095": 0.7646, "precision": 0.9609, "recall": 0.9599}, {"epoch": 51, "map50": 0.9776, "map5095": 0.7547, "precision": 0.9654, "recall": 0.9539}, {"epoch": 52, "map50": 0.9778, "map5095": 0.7651, "precision": 0.9253, "recall": 0.9733}, {"epoch": 53, "map50": 0.9758, "map5095": 0.7774, "precision": 0.9576, "recall": 0.9433}, {"epoch": 54, "map50": 0.9782, "map5095": 0.7718, "precision": 0.959, "recall": 0.9543}, {"epoch": 55, "map50": 0.9745, "map5095": 0.7705, "precision": 0.9585, "recall": 0.9544}, {"epoch": 56, "map50": 0.9747, "map5095": 0.7773, "precision": 0.9359, "recall": 0.9804}, {"epoch": 57, "map50": 0.9671, "map5095": 0.7545, "precision": 0.9333, "recall": 0.9736}, {"epoch": 58, "map50": 0.9742, "map5095": 0.7772, "precision": 0.9386, "recall": 0.9673}, {"epoch": 59, "map50": 0.9775, "map5095": 0.7703, "precision": 0.9458, "recall": 0.9656}, {"epoch": 60, "map50": 0.9734, "map5095": 0.7753, "precision": 0.9512, "recall": 0.9638}, {"epoch": 61, "map50": 0.9737, "map5095": 0.7785, "precision": 0.952, "recall": 0.9559}, {"epoch": 62, "map50": 0.9781, "map5095": 0.7831, "precision": 0.9576, "recall": 0.9608}, {"epoch": 63, "map50": 0.9789, "map5095": 0.7757, "precision": 0.9594, "recall": 0.9623}, {"epoch": 64, "map50": 0.9812, "map5095": 0.7847, "precision": 0.9632, "recall": 0.9673}, {"epoch": 65, "map50": 0.974, "map5095": 0.7756, "precision": 0.946, "recall": 0.9604}, {"epoch": 66, "map50": 0.9811, "map5095": 0.7883, "precision": 0.9594, "recall": 0.9705}, {"epoch": 67, "map50": 0.975, "map5095": 0.7794, "precision": 0.9539, "recall": 0.9559}, {"epoch": 68, "map50": 0.976, "map5095": 0.7765, "precision": 0.9573, "recall": 0.9663}, {"epoch": 69, "map50": 0.9775, "map5095": 0.7767, "precision": 0.9434, "recall": 0.9788}, {"epoch": 70, "map50": 0.9775, "map5095": 0.7897, "precision": 0.9505, "recall": 0.9791}, {"epoch": 71, "map50": 0.9774, "map5095": 0.7966, "precision": 0.9431, "recall": 0.9771}, {"epoch": 72, "map50": 0.9741, "map5095": 0.7961, "precision": 0.9504, "recall": 0.9626}, {"epoch": 73, "map50": 0.9744, "map5095": 0.7899, "precision": 0.9475, "recall": 0.9693}, {"epoch": 74, "map50": 0.9808, "map5095": 0.7866, "precision": 0.9478, "recall": 0.9706}, {"epoch": 75, "map50": 0.9831, "map5095": 0.7982, "precision": 0.9514, "recall": 0.9665}, {"epoch": 76, "map50": 0.9834, "map5095": 0.804, "precision": 0.9571, "recall": 0.9673}, {"epoch": 77, "map50": 0.9792, "map5095": 0.8019, "precision": 0.9598, "recall": 0.964}, {"epoch": 78, "map50": 0.9788, "map5095": 0.7973, "precision": 0.9631, "recall": 0.9706}, {"epoch": 79, "map50": 0.9754, "map5095": 0.7951, "precision": 0.9491, "recall": 0.9729}, {"epoch": 80, "map50": 0.9743, "map5095": 0.7964, "precision": 0.9509, "recall": 0.9728}, {"epoch": 81, "map50": 0.9754, "map5095": 0.7969, "precision": 0.9552, "recall": 0.9706}, {"epoch": 82, "map50": 0.9772, "map5095": 0.8027, "precision": 0.9586, "recall": 0.9706}, {"epoch": 83, "map50": 0.9794, "map5095": 0.8038, "precision": 0.9574, "recall": 0.9673}, {"epoch": 84, "map50": 0.9783, "map5095": 0.7977, "precision": 0.956, "recall": 0.9706}, {"epoch": 85, "map50": 0.9767, "map5095": 0.8029, "precision": 0.9571, "recall": 0.9635}, {"epoch": 86, "map50": 0.9686, "map5095": 0.8001, "precision": 0.9575, "recall": 0.9621}, {"epoch": 87, "map50": 0.979, "map5095": 0.8099, "precision": 0.9581, "recall": 0.964}, {"epoch": 88, "map50": 0.9813, "map5095": 0.8157, "precision": 0.9622, "recall": 0.9608}, {"epoch": 89, "map50": 0.9794, "map5095": 0.8054, "precision": 0.9565, "recall": 0.9673}, {"epoch": 90, "map50": 0.9766, "map5095": 0.804, "precision": 0.9564, "recall": 0.9706}, {"epoch": 91, "map50": 0.9751, "map5095": 0.8005, "precision": 0.95, "recall": 0.9706}, {"epoch": 92, "map50": 0.9752, "map5095": 0.7982, "precision": 0.9384, "recall": 0.9739}, {"epoch": 93, "map50": 0.9745, "map5095": 0.7956, "precision": 0.9405, "recall": 0.9739}, {"epoch": 94, "map50": 0.9759, "map5095": 0.7956, "precision": 0.9375, "recall": 0.9771}, {"epoch": 95, "map50": 0.9797, "map5095": 0.8039, "precision": 0.9393, "recall": 0.976}, {"epoch": 96, "map50": 0.9812, "map5095": 0.8093, "precision": 0.9421, "recall": 0.9748}, {"epoch": 97, "map50": 0.981, "map5095": 0.8079, "precision": 0.956, "recall": 0.9601}, {"epoch": 98, "map50": 0.9801, "map5095": 0.8118, "precision": 0.949, "recall": 0.9706}, {"epoch": 99, "map50": 0.9797, "map5095": 0.8144, "precision": 0.9452, "recall": 0.9689}, {"epoch": 100, "map50": 0.9795, "map5095": 0.8138, "precision": 0.9415, "recall": 0.9735}]};

// Defect-free blister packs (same model, same rules) used by the Vision-M station animation.
export const LINE_OK_SAMPLES: DemoSample[] = [
  {
    "id": "line-ok-1",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/line-ok-1.jpg",
    "width": 480,
    "height": 480,
    "inferenceMs": 34.1,
    "detections": [
      {
        "label": "product",
        "confidence": 0.986,
        "box": [
          0.002,
          0.0,
          0.9992,
          1.0
        ]
      }
    ]
  },
  {
    "id": "line-ok-2",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/line-ok-2.jpg",
    "width": 480,
    "height": 480,
    "inferenceMs": 11.6,
    "detections": [
      {
        "label": "product",
        "confidence": 0.997,
        "box": [
          0.0,
          0.0396,
          0.9901,
          0.9821
        ]
      }
    ]
  },
  {
    "id": "line-ok-3",
    "product": "Blister pack",
    "image": "/demo/vision-m/samples/line-ok-3.jpg",
    "width": 480,
    "height": 270,
    "inferenceMs": 100.9,
    "detections": [
      {
        "label": "product",
        "confidence": 0.99,
        "box": [
          0.1707,
          0.0203,
          0.8652,
          0.838
        ]
      }
    ]
  }
];
