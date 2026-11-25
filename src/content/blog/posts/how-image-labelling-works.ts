import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "how-image-labelling-works",
  title: "How Image Labelling Works (and Why It Decides Your Model’s Quality)",
  description:
    "A beginner's guide to image labelling for object detection: what a label is, how to draw good boxes, common mistakes and simple rules for consistent labels.",
  excerpt: "Your model can only be as good as your labels. Here is how to draw them well, and the mistakes to avoid.",
  audience: "students",
  date: "2026-11-25",
  readMinutes: 6,
  cover: "labels",
  body: [
    {
      type: "p",
      text: "When people talk about AI, they usually talk about models. But in most vision projects, the thing that decides whether a model works is much less exciting: **the labels**.",
    },
    {
      type: "p",
      text: "A model learns only from the examples you give it. If your labels are careless, the model learns carelessness. This guide explains what labelling is and how to do it well from day one.",
    },
    { type: "h2", text: "What is a label?" },
    {
      type: "p",
      text: "For object detection, a label is a **box drawn around something in an image, plus a name** for what is inside it. The name is called a **class**. For a bottle line, your classes could be “cap ok”, “cap missing” and “cap loose”.",
    },
    {
      type: "p",
      text: "Each image can have many labels, one for every object or defect in it. An image with no defects can have no labels at all, and that is useful too: it teaches the model what “nothing wrong” looks like.",
    },
    { type: "h2", text: "Why labels matter so much" },
    {
      type: "p",
      text: "During training, the model compares its guesses with your labels and corrects itself. Your labels are the answer key. If the answer key is wrong or inconsistent, the model is being marked against the wrong answers.",
    },
    {
      type: "callout",
      text: "A common surprise: fixing 50 sloppy labels often improves a model more than adding 200 new images.",
    },
    { type: "h2", text: "Five rules for good labels" },
    {
      type: "list",
      ordered: true,
      items: [
        "**Box tightly.** The box should touch the edges of the object or defect. Extra background inside the box teaches the model that the background is part of the defect.",
        "**Label everything, every time.** If an image has three scratches, label all three. An unlabelled scratch tells the model “this is not a scratch”.",
        "**Be consistent.** Decide your rules once and follow them. If you include the shadow of a dent in one image, include it in all of them.",
        "**Keep class names clear.** Use names that leave no doubt, like “crack” and “stain”, rather than vague names like “bad” and “issue”.",
        "**Don’t guess.** If you can’t tell whether something is a defect, a model trained on your guess won’t be able to tell either. Flag unclear images and decide on a rule.",
      ],
    },
    { type: "h2", text: "Common beginner mistakes" },
    {
      type: "list",
      items: [
        "**Boxes that are too loose**, especially on small defects, where a big box can be mostly background.",
        "**Missing small or partly hidden objects** near the edges of the image.",
        "**Mixing classes**: calling the same defect “scratch” in some images and “line mark” in others.",
        "**Only labelling obvious examples.** The faint, borderline cases are often the most valuable ones to label.",
        "**Rushing at the end.** Label quality often drops as people get tired. Take breaks and review your last batch.",
      ],
    },
    { type: "h2", text: "How many classes should you have?" },
    {
      type: "p",
      text: "Start with as few as possible. Two or three well-defined classes with plenty of examples each will train better than ten classes with a handful of examples each. You can always split a class later once the basics work.",
    },
    { type: "h2", text: "Check your labels before training" },
    {
      type: "p",
      text: "Before you press Train, scroll through your labelled images quickly. Look for boxes that are clearly too big, images where you forgot a defect, and classes with very few examples. Five minutes here can save a whole training run.",
    },
    { type: "h2", text: "Practise on real examples" },
    {
      type: "p",
      text: "Labelling is a skill you build by doing it. In Vision-M Studio’s Playground, label practice uses real inspection images, so you learn on the kind of defects that factories actually deal with. When the model is trained, you can see straight away how your labelling choices showed up in its results.",
    },
  ],
  faqs: [
    {
      q: "How long does labelling take?",
      a: "It depends on the number of objects per image. A simple image with one or two defects takes a few seconds once you have practised; busy images take longer.",
    },
    {
      q: "Should I label images with no defects?",
      a: "Keep them in your dataset without any boxes. They teach the model what an acceptable product looks like, which helps reduce false alarms.",
    },
    {
      q: "What is the difference between a box and a polygon label?",
      a: "A box is a rectangle around the object and is used for object detection. A polygon follows the exact outline and is used for segmentation. Boxes are faster and enough for most inspection tasks.",
    },
    {
      q: "Can two people label the same dataset?",
      a: "Yes, but agree on written rules first and check a few of each other’s images. Different labelling styles confuse the model.",
    },
  ],
};

export default post;
