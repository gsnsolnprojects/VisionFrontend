/**
 * Short lessons for the Playground learning page. Plain text so they're easy to edit:
 * each lesson is a title, a one-line summary for its card, and a few sections.
 */

export interface LessonSection {
  heading: string;
  body: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  sections: LessonSection[];
}

export const LESSONS: Lesson[] = [
  {
    id: "detection-vs-segmentation",
    title: "Detection vs segmentation",
    summary: "Two ways a model can point at what it sees.",
    minutes: 2,
    sections: [
      {
        heading: "Object detection",
        body: "A detection model draws a rectangle (a bounding box) around each thing it finds and names it, for example \"scratch\" or \"missing pill\". It answers: what is in the picture, and roughly where? Boxes are quick to label and quick to run, so detection is the usual starting point for quality inspection.",
      },
      {
        heading: "Segmentation",
        body: "A segmentation model colours the exact pixels that belong to each thing, so you get its real outline instead of a box. Use it when the shape or size matters, such as measuring how much of a surface is rusted.",
      },
      {
        heading: "Which one should I use?",
        body: "Start with detection. Move to segmentation when a box isn't precise enough for the decision you need to make. In Vision-M, YOLO models do detection and \"(Seg)\" models do segmentation.",
      },
    ],
  },
  {
    id: "images-labels-classes",
    title: "Images, labels and classes",
    summary: "What a dataset is made of.",
    minutes: 2,
    sections: [
      {
        heading: "Images",
        body: "Photos of the thing you want to inspect. The more they look like what the camera will see in real use (same lighting, angle and distance), the better the model learns.",
      },
      {
        heading: "Classes",
        body: "The names of what the model should find, for example \"good\", \"crack\" and \"dent\". Every box or outline belongs to one class.",
      },
      {
        heading: "Labels",
        body: "The answers drawn on each image: where every defect is and which class it belongs to. The model learns by comparing its guesses with these labels, so careful, consistent labels matter more than having lots of images.",
      },
    ],
  },
  {
    id: "train-val-test",
    title: "Train, validation and test",
    summary: "Why a dataset is split into three parts.",
    minutes: 2,
    sections: [
      {
        heading: "Training images",
        body: "The model learns from these. It sees them again and again during training.",
      },
      {
        heading: "Validation images",
        body: "Checked after each round of training to see whether the model is really improving. The model never learns from them, so they show how it does on pictures it hasn't memorised.",
      },
      {
        heading: "Test images",
        body: "Kept aside until the end, for a final honest score. In Testing & Inference you can run your model on them and compare its answers with the labels.",
      },
      {
        heading: "Why it matters",
        body: "A model can score perfectly on images it has memorised and still fail on new ones. Splitting the data is how you find out before it reaches the factory floor.",
      },
    ],
  },
  {
    id: "what-is-training",
    title: "What happens during training",
    summary: "Epochs, loss and why it takes time.",
    minutes: 2,
    sections: [
      {
        heading: "Learning by correction",
        body: "The model looks at a training image, makes a guess, compares it with the label, and adjusts itself a little to be less wrong next time. Repeating this over thousands of images is training.",
      },
      {
        heading: "Epochs",
        body: "One epoch is one pass over all training images. Training runs for many epochs; each one usually makes the model a bit better, until it stops improving.",
      },
      {
        heading: "Loss",
        body: "A number for how wrong the model still is. You'll see it go down in the training charts. If it stops dropping, more epochs won't help much.",
      },
    ],
  },
  {
    id: "reading-results",
    title: "How to read your results",
    summary: "Precision, recall and mAP in plain words.",
    minutes: 3,
    sections: [
      {
        heading: "Precision",
        body: "Of everything the model flagged as a defect, how much really was one? High precision means few false alarms.",
      },
      {
        heading: "Recall",
        body: "Of all the real defects, how many did the model catch? High recall means few misses. In inspection, a missed defect is often worse than a false alarm, so watch recall closely.",
      },
      {
        heading: "mAP50",
        body: "One overall score from 0 to 1 that combines precision and recall across all classes. As a rough guide: above 0.8 is strong, 0.5 to 0.8 is a good start, below 0.5 needs more or better labelled images.",
      },
      {
        heading: "Per class",
        body: "Check the scores for each class too. A model can do well overall while still missing one rare defect type.",
      },
    ],
  },
  {
    id: "nano-vs-small",
    title: "Nano vs small models",
    summary: "Speed or accuracy: choosing a model size.",
    minutes: 1,
    sections: [
      {
        heading: "Nano",
        body: "The smallest and fastest. It trains quickly and can run on modest hardware. A great first model to see whether your idea works at all.",
      },
      {
        heading: "Small",
        body: "A bit bigger and usually a bit more accurate, at the cost of slower training and inference.",
      },
      {
        heading: "A good habit",
        body: "Train a nano model first, read its results, then try small on the same dataset and compare. If small isn't clearly better, keep the faster one.",
      },
    ],
  },
];
