import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "what-is-computer-vision-guide-for-students",
  title: "What Is Computer Vision? A Simple Guide for Students",
  description:
    "Computer vision explained in plain words: how computers learn to see, the three main tasks, where it is used in factories, and how students can start.",
  excerpt: "How a computer learns to “see”, explained without maths, plus a simple way to try it yourself.",
  audience: "students",
  date: "2026-11-25",
  readMinutes: 7,
  cover: "eye",
  body: [
    {
      type: "p",
      text: "You unlock your phone with your face. A traffic camera reads a number plate. A factory camera spots a scratch on a part before it is packed. All three are **computer vision**: teaching a computer to understand what is in a picture.",
    },
    {
      type: "p",
      text: "It sounds like advanced research, but the core idea is simple enough to learn in an afternoon. This guide explains it without maths, so you can decide whether it is worth exploring further.",
    },
    { type: "h2", text: "A computer sees numbers, not things" },
    {
      type: "p",
      text: "To a computer, a photo is a grid of tiny squares called pixels. Each pixel is just a few numbers that say how much red, green and blue it contains. A normal phone photo has millions of them.",
    },
    {
      type: "p",
      text: "Looking at those numbers, the computer has no idea that some of them form a bottle cap and others form a crack. Computer vision is the job of turning that grid of numbers into a useful answer, like “there is a crack here”.",
    },
    { type: "h2", text: "Rules vs learning from examples" },
    {
      type: "p",
      text: "Older systems used hand-written rules: “if this area is darker than a set value, it is a defect”. Rules work in a perfectly controlled setup, but they break easily. A change in lighting, a slightly different colour of part, or a shadow can fool them.",
    },
    {
      type: "p",
      text: "Modern computer vision mostly uses **deep learning**. Instead of writing rules, you show the model many example images with the right answers marked on them. The model slowly adjusts itself until its own answers match yours. This step is called **training**.",
    },
    {
      type: "callout",
      text: "Think of it like teaching a new inspector. You don’t hand them a rulebook of pixel values. You show them good parts and bad parts until they can tell the difference on their own.",
    },
    { type: "h2", text: "The three tasks you will hear about most" },
    {
      type: "list",
      items: [
        "**Classification** answers “what is in this image?” with one label, such as “good” or “defective”.",
        "**Object detection** answers “what is here, and where?” by drawing a box around each object or defect. This is the most common task in quality inspection.",
        "**Segmentation** marks the exact outline of each object, pixel by pixel. It is useful when the shape or size of a defect matters.",
      ],
    },
    {
      type: "p",
      text: "If you are just starting, object detection is a great place to begin. The results are easy to see, because the model draws boxes on the picture, and the same idea is used in real factories.",
    },
    { type: "h2", text: "How a vision project actually works" },
    {
      type: "p",
      text: "Almost every computer vision project follows the same five steps, whether it is a college project or a production line:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "**Collect images** of the thing you want to inspect, both good and bad examples.",
        "**Label them**: draw boxes around each defect and give it a name, like “scratch” or “missing cap”.",
        "**Train a model** on most of the labelled images.",
        "**Test it** on images the model has never seen, to check whether it really learned.",
        "**Improve**: add more or better examples where the model makes mistakes, then train again.",
      ],
    },
    {
      type: "p",
      text: "Notice that only one step is training. Most of the real work, and most of the learning, happens in collecting, labelling and testing. That is good news for students, because these steps need careful thinking more than coding.",
    },
    { type: "h2", text: "Where it is used in industry" },
    {
      type: "p",
      text: "Visual inspection is one of the most practical uses of computer vision. Some everyday examples:",
    },
    {
      type: "list",
      items: [
        "**Electronics**: checking that every component on a circuit board is present and placed correctly.",
        "**Pharma packaging**: making sure every blister pocket has a tablet and the label is readable.",
        "**Food and beverages**: spotting loose caps, damaged bottles or wrong labels.",
        "**Automotive**: finding scratches, dents or missing features on parts.",
      ],
    },
    {
      type: "p",
      text: "These problems are real, visible and easy to explain in an interview, which makes them excellent project topics.",
    },
    { type: "h2", text: "Do you need to code to start?" },
    {
      type: "p",
      text: "Not to understand the ideas. Coding matters later if you want to build your own tools, but the hardest skills in computer vision are knowing what good data looks like, labelling consistently and reading results honestly.",
    },
    {
      type: "p",
      text: "Browser-based tools let you practise the full workflow first. In Vision-M Studio’s Playground, for example, you work with sample datasets from real inspection projects: you look at the images, label defects, train a model and test it, step by step, without writing code.",
    },
    { type: "h2", text: "A simple first goal" },
    {
      type: "p",
      text: "Pick one product and one defect. For example, “find missing tablets in a blister pack”. Label a set of images, train a small model and test it. Then write down what it got right, what it missed and why you think it missed it.",
    },
    {
      type: "p",
      text: "That short write-up teaches you more than ten tutorial videos, and it is exactly the kind of thinking employers look for.",
    },
  ],
  faqs: [
    {
      q: "Is computer vision the same as AI?",
      a: "Computer vision is one area of AI. It focuses on images and video, while other areas of AI deal with text, speech or numbers.",
    },
    {
      q: "Do I need a powerful laptop?",
      a: "Not to learn. Training models needs a GPU, but browser-based tools run the training on their own servers, so any laptop with a browser is enough.",
    },
    {
      q: "Which branch of engineering is it for?",
      a: "Anyone can learn it. Computer science students often focus on the models, while mechanical, electrical and production students bring useful knowledge of the products and processes being inspected.",
    },
    {
      q: "How long does it take to learn the basics?",
      a: "You can understand the core workflow in a few days of hands-on practice. Getting good at building reliable models takes repeated projects.",
    },
  ],
};

export default post;
