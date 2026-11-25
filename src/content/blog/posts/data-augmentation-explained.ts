import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "data-augmentation-explained-defect-detection",
  title: "Data Augmentation Explained: Getting More From Your Inspection Images",
  description:
    "What data augmentation is, which augmentations help defect detection models, which ones can hurt, and how to use them without fooling yourself.",
  excerpt: "Flips, rotations and brightness changes can stretch a small dataset. Used wrongly, they teach the model the wrong thing.",
  audience: "engineers",
  date: "2026-11-25",
  readMinutes: 8,
  cover: "augment",
  body: [
    {
      type: "p",
      text: "Collecting and labelling inspection images takes time, especially images of defects. **Data augmentation** helps you get more out of the images you already have by creating new, slightly changed copies of them for training.",
    },
    {
      type: "p",
      text: "It is one of the most useful tools in a vision project, and one of the easiest to misuse. This guide covers what it does, which changes make sense for inspection, and the mistakes to avoid.",
    },
    { type: "h2", text: "What augmentation does" },
    {
      type: "p",
      text: "Augmentation takes a labelled image and changes it: flips it, rotates it a little, makes it brighter or darker, and so on. The labels move with the image, so a box around a scratch still sits on the scratch after a flip.",
    },
    {
      type: "p",
      text: "The model then sees more variety during training. Instead of memorising the exact images, it learns that **a scratch is a scratch** whether the part is slightly rotated or the light is a bit dimmer.",
    },
    { type: "h2", text: "Common augmentations and when they make sense" },
    {
      type: "table",
      head: ["Augmentation", "What it simulates", "Use it when"],
      rows: [
        ["Horizontal / vertical flip", "Part placed the other way round", "The part can appear in either orientation"],
        ["Small rotation", "Slight misalignment on the conveyor", "Position is not perfectly fixed"],
        ["Brightness / contrast", "Lighting changes, time of day", "Lighting is not fully controlled"],
        ["Small scale / zoom", "Small changes in camera distance", "Parts can be slightly nearer or farther"],
        ["Blur", "Motion or slight focus loss", "The line moves fast or focus can drift"],
        ["Noise", "Lower image quality, sensor noise", "Images can be grainy in low light"],
      ],
    },
    { type: "h2", text: "Augmentations that can hurt" },
    {
      type: "p",
      text: "Every augmentation tells the model “this change doesn’t matter”. If the change **does** matter for your defect, you are teaching the model the wrong thing.",
    },
    {
      type: "list",
      items: [
        "**Colour changes when colour is the defect.** If you are looking for discolouration or the wrong colour cap, strong colour shifts can hide the very thing you want to find.",
        "**Flips when orientation is the defect.** If a component placed backwards is a defect, flipping images makes a backwards part look correct.",
        "**Strong blur on tiny defects.** A hairline crack can disappear completely after heavy blur, while its label stays. The model learns to find defects that aren’t visible.",
        "**Large rotations on a fixed setup.** If parts always arrive the same way up, 90° rotations add variety the model will never see on the line.",
      ],
    },
    {
      type: "callout",
      text: "Simple rule: only use an augmentation if that change could really happen at your station, and if it doesn’t change whether the part is good or bad.",
    },
    { type: "h2", text: "Never augment your test set" },
    {
      type: "p",
      text: "Augmentation is for training only. Your validation and test images must stay as they are, real photos of the real setup. Split the data **before** augmenting. Otherwise copies of the same original photo can end up in both training and testing, and your scores will look better than they really are.",
    },
    { type: "h2", text: "Augmentation is not a replacement for real data" },
    {
      type: "p",
      text: "Augmentation creates variations of what you already have. It can’t create:",
    },
    {
      type: "list",
      items: [
        "A **defect type** you never photographed.",
        "A **product variant** that wasn’t in the dataset.",
        "A **lighting condition or background** far from anything you captured.",
      ],
    },
    {
      type: "p",
      text: "If the model fails on one of these, the fix is new real images, not more augmentation.",
    },
    { type: "h2", text: "A practical workflow" },
    {
      type: "list",
      ordered: true,
      items: [
        "**Train a first model without extra augmentation** to get a baseline score on your test set.",
        "**Pick two or three augmentations** that match real variation at your station.",
        "**Train again** on the augmented version and compare on the same test images.",
        "**Keep what helps**, drop what doesn’t, and look at the images where results changed.",
      ],
    },
    {
      type: "p",
      text: "Note that many training tools, including YOLO, already apply some random augmentation during training by default. Extra augmented copies help most when your dataset is small or lacks variety.",
    },
    {
      type: "p",
      text: "In Vision-M Studio you can create an augmented version of a dataset and keep the original alongside it, so it is easy to train on both and compare the results.",
    },
  ],
  faqs: [
    {
      q: "How many augmented copies should I make per image?",
      a: "A few copies per image is usually enough. Many copies of the same small dataset add little new information and make training slower.",
    },
    {
      q: "Does augmentation fix class imbalance?",
      a: "It can help a little, but the real fix for a rare defect class is collecting more real examples of it.",
    },
    {
      q: "Can augmentation make a model worse?",
      a: "Yes, if the changes don’t match reality or remove the defect from view. That’s why you compare against a baseline on an untouched test set.",
    },
    {
      q: "Is augmentation the same as synthetic data?",
      a: "No. Augmentation changes real images slightly. Synthetic data is generated from scratch, for example by rendering 3D models. Both have uses, but augmentation is the simpler first step.",
    },
  ],
};

export default post;
