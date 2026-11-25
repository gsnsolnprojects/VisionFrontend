import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "how-many-images-to-train-defect-detection-model",
  title: "How Many Images Do You Really Need to Train a Defect Detection Model?",
  description:
    "There is no magic number, but there are good rules. How to size a defect detection dataset, balance good and bad samples, and know when you have enough.",
  excerpt: "The honest answer is “it depends”. Here is what it depends on, and a practical way to find your number.",
  audience: "engineers",
  date: "2026-11-25",
  readMinutes: 8,
  cover: "dataset",
  body: [
    {
      type: "p",
      text: "It is the first question on almost every vision project: how many images do we need? The honest answer is that there is no fixed number. But that doesn’t mean you have to guess. The right number depends on a few things you can measure.",
    },
    { type: "h2", text: "Count examples, not images" },
    {
      type: "p",
      text: "A model learns from **labelled instances**, the individual boxes. One image with five scratches gives the model five scratch examples. So think in terms of “how many examples of each defect class” rather than “how many photos”.",
    },
    {
      type: "p",
      text: "The weakest class sets the limit. If you have 400 examples of “missing cap” and 15 of “loose cap”, the model will be poor at loose caps no matter how big the dataset looks overall.",
    },
    { type: "h2", text: "What pushes the number up or down" },
    {
      type: "table",
      head: ["Factor", "Fewer images needed", "More images needed"],
      rows: [
        ["Defect visibility", "Large, high contrast", "Small, faint, low contrast"],
        ["Product variation", "One product, one colour", "Many variants, finishes or colours"],
        ["Setup", "Fixed camera and lighting", "Changing angle, distance or light"],
        ["Classes", "One or two", "Many, or classes that look alike"],
        ["Background", "Plain and stable", "Busy or changing"],
      ],
    },
    { type: "h2", text: "A rough starting point" },
    {
      type: "p",
      text: "For a first experiment with a clear, visible defect in a controlled setup, **a few hundred labelled images**, with at least several dozen examples of each defect class, is usually enough to see whether the idea works. Subtle defects and variable conditions need far more.",
    },
    {
      type: "callout",
      text: "Treat the first dataset as a feasibility test, not the final dataset. Its job is to tell you where the model struggles, so you know what to collect next.",
    },
    { type: "h2", text: "Don’t forget the good parts" },
    {
      type: "p",
      text: "Images of acceptable products, with no labels, are just as important. They teach the model what normal variation looks like: small marks that are allowed, reflections, slight colour changes. Without them, the model tends to raise false alarms on perfectly good parts.",
    },
    { type: "h2", text: "Variety beats volume" },
    {
      type: "p",
      text: "Two hundred images covering different shifts, batches, positions and lighting will usually beat a thousand near-identical images taken in one minute. When collecting, deliberately capture:",
    },
    {
      type: "list",
      items: [
        "Different **batches and material lots**.",
        "Different **positions and orientations** of the part.",
        "Both **obvious and borderline** defects.",
        "The **real lighting** at the station, at different times of day if it changes.",
      ],
    },
    { type: "h2", text: "Keep a test set the model never sees" },
    {
      type: "p",
      text: "Split your data before training. A common split is about 70–80% for training and the rest for validation and testing. The test images must stay out of training completely, and they should not be near-duplicates of training images either, such as two shots of the same part taken a second apart. Otherwise your test score will look better than the real performance.",
    },
    { type: "h2", text: "Augmentation helps, but it is not new data" },
    {
      type: "p",
      text: "Augmentation creates variations of your images: flips, small rotations, brightness changes. It helps the model cope with small differences and is worth using. But it can’t invent a defect type or a lighting condition you never captured. Use it to stretch good data, not to replace collecting it.",
    },
    { type: "h2", text: "How to know when you have enough" },
    {
      type: "list",
      ordered: true,
      items: [
        "Train on what you have and **measure on the test set**.",
        "Add a meaningful batch of new, varied images and **train again**.",
        "If results improve noticeably, **keep collecting**, focusing on the classes and conditions where the model fails.",
        "When adding more data stops improving the results, the bottleneck is elsewhere: labels, image quality, camera position or lighting.",
      ],
    },
    {
      type: "p",
      text: "This loop is faster when retraining is easy. In Vision-M Studio you can add images to a dataset, train a new model version and test it on the same images as the last one, so each round of collection is backed by results.",
    },
  ],
  faqs: [
    {
      q: "Can I train with just 50 images?",
      a: "You can train, and for a very clear defect it may give a useful first signal. Don’t expect it to hold up on a real line; use it to learn what to collect next.",
    },
    {
      q: "What if defects are rare on our line?",
      a: "Collect defective parts over time, use rejected parts from quality checks, and photograph each from several angles. Some teams also create defects on scrap parts, as long as they look like real ones.",
    },
    {
      q: "Should good and defective images be 50/50?",
      a: "Not necessarily. What matters is enough examples of each defect class and enough good images to show normal variation. Real lines have far more good parts, and that is fine.",
    },
    {
      q: "Does image resolution change how many I need?",
      a: "Resolution affects whether small defects are visible at all. Low resolution can make a defect impossible to learn, no matter how many images you have.",
    },
  ],
};

export default post;
