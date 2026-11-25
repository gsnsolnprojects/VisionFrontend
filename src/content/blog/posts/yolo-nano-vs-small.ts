import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "yolo-nano-vs-small-which-model-size",
  title: "YOLO Model Sizes Explained: Nano to Extra-Large, and Which One to Train",
  description:
    "YOLO comes in nano, small, medium, large and extra-large, across versions like v5, v8 and YOLO11. What changes between sizes and how to pick one for defect detection.",
  excerpt: "Five sizes, many versions. What really changes between them, and why nano or small is usually the right start.",
  audience: "engineers",
  date: "2026-11-25",
  readMinutes: 9,
  cover: "models",
  body: [
    {
      type: "p",
      text: "YOLO (“You Only Look Once”) is one of the most widely used families of object detection models. If you have looked at it, you have probably seen names like **YOLOv8n**, **YOLOv5s** or **YOLO11m**. The number is the **version**, and the letter at the end is the **size**. This guide explains both, and how to choose the right size for an inspection task.",
    },
    { type: "h2", text: "What “size” actually means" },
    {
      type: "p",
      text: "Within one version, all sizes share the same design. A larger size has more layers and more filters, which means more parameters: the numbers the model adjusts during training. More parameters give the model more capacity to learn subtle patterns, at the cost of more computation, memory and time.",
    },
    { type: "h2", text: "The five standard sizes" },
    {
      type: "list",
      items: [
        "**Nano (n)**: the lightest. Trains and runs fastest and needs the least memory. Built for speed and small devices.",
        "**Small (s)**: several times more parameters than nano. A little slower, but usually better at fine details. A popular all-round choice.",
        "**Medium (m)**: a clear step up in capacity. Useful for harder problems with many classes or very varied images.",
        "**Large (l)**: higher accuracy potential, but noticeably slower and needs a strong GPU to train and run.",
        "**Extra-large (x)**: the biggest and slowest. Mostly used in research and benchmarks, or when accuracy matters far more than speed.",
      ],
    },
    { type: "h2", text: "The trade-off in one table" },
    {
      type: "table",
      head: ["", "Nano", "Small", "Medium", "Large", "Extra-large"],
      rows: [
        ["Training time", "Shortest", "Short", "Moderate", "Long", "Longest"],
        ["Speed per image", "Fastest", "Fast", "Moderate", "Slow", "Slowest"],
        ["Memory needed", "Lowest", "Low", "Moderate", "High", "Highest"],
        ["Fine or faint defects", "Can struggle", "Usually good", "Better", "Better", "Best potential"],
        ["Data needed to train well", "Least", "Less", "More", "Much more", "Most"],
        ["Typical use", "Fast lines, simple defects, edge devices", "Most inspection tasks", "Harder, varied problems", "Accuracy first, strong hardware", "Research, benchmarks"],
      ],
    },
    {
      type: "callout",
      text: "Exact speed and accuracy depend on the version, your images, image size and hardware. Treat the table as a direction, then measure on your own test set.",
    },
    { type: "h2", text: "Why bigger isn’t automatically better" },
    {
      type: "p",
      text: "A large model trained on a few hundred images can simply memorise them and then do worse on new parts. It also needs more GPU time for every experiment, and may be too slow for the line. For most visual inspection tasks, with one product, a few defect classes and a fixed camera, **nano or small trained on good data beats a bigger model trained on average data**. That is why the rest of this guide focuses on those two.",
    },
    { type: "h2", text: "What about YOLOv5, v8, v9, YOLO11 and the rest?" },
    {
      type: "p",
      text: "YOLO has been improved many times since the first version in 2015, by different research groups and companies. A few versions you will see often:",
    },
    {
      type: "list",
      items: [
        "**YOLOv5** (Ultralytics, 2020): very widely used and well tested. Still common in existing projects.",
        "**YOLOv8** (Ultralytics, 2023): a newer design with an easy-to-use toolkit. A popular default for many teams.",
        "**YOLOv9 and YOLOv10** (2024, from other research groups): introduced new ideas for accuracy and speed. Their size names are slightly different from the n/s/m/l/x pattern.",
        "**YOLO11 and later** (Ultralytics): continue the same family as v8, with further improvements.",
      ],
    },
    {
      type: "p",
      text: "The good news: **the size idea is the same across versions**. Ultralytics versions such as v5, v8 and YOLO11 all use n, s, m, l and x, so “YOLOv8n” and “YOLO11n” are both the nano size of their version.",
    },
    {
      type: "p",
      text: "Newer versions are often a bit faster or more accurate on public benchmarks, but for a real inspection task, **the version usually matters less than your data, labels and image quality**. Pick a well-supported version, keep it the same while you experiment, and compare sizes on your own test images.",
    },
    { type: "h2", text: "When nano is enough" },
    {
      type: "list",
      items: [
        "The defect is **clearly visible**: a missing cap, an empty blister pocket, a missing component.",
        "You have **only a few classes**, often one or two.",
        "The line is **fast** and every millisecond per image matters.",
        "The model must run on **modest hardware** at the station.",
        "Your dataset is **small** and you want quick experiments.",
      ],
    },
    { type: "h2", text: "When small is worth it" },
    {
      type: "list",
      items: [
        "Defects are **small or faint**: hairline cracks, light scratches, thin print errors.",
        "Different classes **look similar** to each other.",
        "Backgrounds or products **vary a lot** between batches.",
        "Nano’s results have stopped improving even though your **labels and data are good**.",
      ],
    },
    { type: "h2", text: "A practical way to decide" },
    {
      type: "list",
      ordered: true,
      items: [
        "**Start with nano.** It trains quickly, so you find data and labelling problems early.",
        "**Look at what it misses**, not only the overall score. Open the missed defects on the test images.",
        "If misses are caused by **bad or missing labels**, fix the data first. A bigger model won’t fix a wrong answer key.",
        "If the data is good but nano still misses **fine details**, train small on the same data and compare both on the same test images.",
        "**Pick the smallest model that meets your requirement** for missed defects and false alarms at the speed you need.",
      ],
    },
    { type: "h2", text: "Image size matters as much as model size" },
    {
      type: "p",
      text: "Images are resized before training. If a defect is only a few pixels wide in the resized image, no model size will find it reliably. For tiny defects, check the training image size, crop to the region that matters, or move the camera closer before reaching for a bigger model.",
    },
    { type: "h2", text: "Don’t skip the comparison" },
    {
      type: "p",
      text: "The cleanest test is simple: same dataset, same split, same image size, two model sizes. Compare missed defects, false alarms and time per image side by side. Vision-M Studio lets you train both nano and small on the same dataset, so you can make the decision with your own numbers instead of a guess.",
    },
  ],
  faqs: [
    {
      q: "Is a bigger model always more accurate?",
      a: "No. On a small or noisy dataset a bigger model can memorise the training images and do worse on new ones. Bigger models help most when you have enough good data.",
    },
    {
      q: "Can I switch from nano to small later?",
      a: "Yes. Your labelled dataset stays the same; you simply train a new model with the other size and compare.",
    },
    {
      q: "Why not use medium or large?",
      a: "They can help on very hard problems, but they need much more compute to train and run. For most inspection tasks, nano or small with good data is the practical choice.",
    },
    {
      q: "Which YOLO version should I use?",
      a: "Any recent, well-supported version works well for inspection. Choose one, keep it fixed while you experiment, and spend your effort on data and labels. Switching versions rarely fixes a data problem.",
    },
    {
      q: "Does model size affect training cost?",
      a: "Yes. Larger models take longer to train on the same GPU, so each experiment costs more time.",
    },
  ],
};

export default post;
