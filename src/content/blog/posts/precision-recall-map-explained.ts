import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "precision-recall-map-explained-simply",
  title: "Precision, Recall and mAP Explained Without the Jargon",
  description:
    "What precision, recall, mAP50 and confidence thresholds really mean for a defect detection model, explained with simple inspection examples.",
  excerpt: "Model reports are full of scores. Here is what each one tells you about missed defects and false alarms.",
  audience: "professionals",
  date: "2026-11-25",
  readMinutes: 7,
  cover: "metrics",
  body: [
    {
      type: "p",
      text: "After training a model, you get a page of numbers: precision, recall, mAP50, mAP50-95. They look technical, but each one answers a simple question about how the model behaves on your parts. Once you know the questions, the numbers become easy to read.",
    },
    { type: "h2", text: "Start with the two mistakes" },
    {
      type: "p",
      text: "An inspection model can be wrong in two ways:",
    },
    {
      type: "list",
      items: [
        "**A missed defect**: the part is defective but the model says nothing. In quality terms, a defect escapes.",
        "**A false alarm**: the part is fine, or the area is fine, but the model flags a defect. Good parts get rejected or rechecked.",
      ],
    },
    {
      type: "p",
      text: "Every score below is a different way of counting these two mistakes.",
    },
    { type: "h2", text: "Precision: when it flags something, is it right?" },
    {
      type: "p",
      text: "**Precision** is the share of the model’s detections that are real defects. If the model draws 100 boxes and 90 of them are real defects, precision is 90%. Low precision means many false alarms.",
    },
    { type: "h2", text: "Recall: of all real defects, how many did it find?" },
    {
      type: "p",
      text: "**Recall** is the share of real defects the model found. If there were 100 real defects and the model found 80, recall is 80%. Low recall means defects are slipping through.",
    },
    {
      type: "callout",
      text: "Easy way to remember: precision is about the boxes the model drew. Recall is about the defects that were really there.",
    },
    { type: "h2", text: "The confidence threshold links them" },
    {
      type: "p",
      text: "For every box, the model gives a confidence score between 0 and 1. You choose a threshold: boxes below it are ignored.",
    },
    {
      type: "list",
      items: [
        "**Lower threshold**: the model reports more boxes. Recall goes up, but so do false alarms, so precision goes down.",
        "**Higher threshold**: the model reports only what it is sure about. Precision goes up, but more defects are missed.",
      ],
    },
    {
      type: "p",
      text: "There is no universally right setting. If a missed defect is very costly, such as a safety part, you accept more false alarms. If false alarms stop the line, you might set it higher and add a second check.",
    },
    { type: "h2", text: "What “a correct box” means: IoU" },
    {
      type: "p",
      text: "A detection counts as correct only if its box overlaps the real labelled box enough. The overlap is measured as **IoU** (intersection over union): 1.0 is a perfect match, 0 is no overlap. A common rule is that IoU of 0.5 or more counts as correct.",
    },
    { type: "h2", text: "mAP50 and mAP50-95" },
    {
      type: "p",
      text: "**mAP** (mean average precision) combines precision and recall across all thresholds into one score per class, then averages over classes. It is a convenient single number to compare models.",
    },
    {
      type: "list",
      items: [
        "**mAP50** counts a box as correct when IoU is at least 0.5. It mainly tells you whether the model finds the defects in roughly the right place.",
        "**mAP50-95** averages over stricter overlap rules from 0.5 to 0.95. It also rewards tight, accurate boxes, so it is always lower than mAP50.",
      ],
    },
    { type: "h2", text: "How to actually read a report" },
    {
      type: "list",
      ordered: true,
      items: [
        "Use **mAP50** to compare two models trained on the same data.",
        "Check **precision and recall per class**. A good average can hide one class that is badly missed.",
        "Look at the **test images themselves**. Open the misses and false alarms; the scores tell you how often, the images tell you why.",
        "Make sure the scores come from **images the model never trained on**. Scores on training images say little about real performance.",
      ],
    },
    {
      type: "p",
      text: "In Vision-M Studio you can run a trained model on test images and see its boxes drawn on each picture, which makes it much easier to connect the scores to real mistakes.",
    },
  ],
  faqs: [
    {
      q: "What is a good mAP50 score?",
      a: "It depends on the task and on how strict the test set is. Rather than chase a target number, check whether missed defects and false alarms are acceptable for your process.",
    },
    {
      q: "Which matters more, precision or recall?",
      a: "In most quality work recall matters more, because escaped defects reach the customer. But very low precision creates so many false alarms that people stop trusting the system.",
    },
    {
      q: "Why is my score high but the model fails on the line?",
      a: "Usually the test images were too similar to the training images, or the line conditions (light, angle, product variant) differ from the dataset.",
    },
    {
      q: "Is accuracy the same as precision?",
      a: "No. “Accuracy” is often used loosely. For detection, precision, recall and mAP are the clearer measures.",
    },
  ],
};

export default post;
