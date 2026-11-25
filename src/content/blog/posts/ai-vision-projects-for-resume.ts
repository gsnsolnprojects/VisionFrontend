import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "ai-vision-projects-for-your-resume",
  title: "5 Computer Vision Projects That Make Your Resume Stand Out",
  description:
    "Five practical computer vision project ideas for students, based on real inspection problems, plus how to present them on your resume and in interviews.",
  excerpt: "Skip the cat-vs-dog classifier. Five real-world vision projects, and how to talk about them in an interview.",
  audience: "students",
  date: "2026-11-25",
  readMinutes: 7,
  cover: "projects",
  body: [
    {
      type: "p",
      text: "Recruiters see the same AI projects again and again: handwritten digits, cats versus dogs, a face detector copied from a tutorial. They show you can follow steps, but not that you can solve a problem. A project based on a **real industry problem** tells a much stronger story.",
    },
    {
      type: "p",
      text: "Here are five project ideas taken from real visual inspection work. Each one is small enough to finish, and meaningful enough to discuss in an interview.",
    },
    { type: "h2", text: "1. Missing tablet detection in blister packs" },
    {
      type: "p",
      text: "**The problem:** pharma lines must make sure every pocket of a blister pack has a tablet. **Your project:** detect empty pockets and broken tablets.",
    },
    {
      type: "p",
      text: "**Why it’s good:** the defect is clear, the classes are simple, and it connects directly to patient safety, which makes it easy to explain why it matters.",
    },
    { type: "h2", text: "2. PCB component check" },
    {
      type: "p",
      text: "**The problem:** circuit boards can leave the line with missing or misplaced components. **Your project:** detect missing components or common board defects on PCB images.",
    },
    {
      type: "p",
      text: "**Why it’s good:** the defects are small, so you will learn about image resolution and model size. Great for electronics and electrical students.",
    },
    { type: "h2", text: "3. Bottle cap inspection" },
    {
      type: "p",
      text: "**The problem:** a loose or missing cap means leaks and complaints. **Your project:** classify caps as present, missing or not sealed properly.",
    },
    {
      type: "p",
      text: "**Why it’s good:** it is quick to explain to anyone, and it teaches you how lighting and reflections on shiny surfaces affect a model.",
    },
    { type: "h2", text: "4. Surface rust or corrosion detection" },
    {
      type: "p",
      text: "**The problem:** rust on metal parts, structures or vehicles needs to be found early. **Your project:** detect and mark rusted areas in photos.",
    },
    {
      type: "p",
      text: "**Why it’s good:** rust has no fixed shape, so you face real labelling decisions about where a defect starts and ends. Good for mechanical and civil students.",
    },
    { type: "h2", text: "5. Label and print check" },
    {
      type: "p",
      text: "**The problem:** packaging with a missing, crooked or smudged label can be rejected by customers. **Your project:** detect missing labels, wrong positions or damaged print.",
    },
    {
      type: "p",
      text: "**Why it’s good:** it mixes object detection with ideas about alignment and print quality, and it applies to almost every industry.",
    },
    { type: "h2", text: "What turns an idea into a strong project" },
    {
      type: "p",
      text: "The topic gets attention, but the way you did the work is what impresses. Make sure your project shows:",
    },
    {
      type: "list",
      items: [
        "**A clear problem statement**: which product, which defect, and why it matters.",
        "**Your labelling rules**: how you decided what counts as a defect.",
        "**A fair test**: results on images the model never saw during training.",
        "**Honest results**: precision, recall and mAP, plus examples of what the model missed.",
        "**What you’d do next**: more data, better lighting, a different model size. This shows real engineering thinking.",
      ],
    },
    {
      type: "callout",
      text: "Interviewers often ask “what went wrong?” A good answer, with a reason and a fix, is worth more than a perfect score you can’t explain.",
    },
    { type: "h2", text: "How to put it on your resume" },
    {
      type: "p",
      text: "Keep it to two or three lines that show problem, method and result. For example:",
    },
    {
      type: "callout",
      text: "**Blister pack inspection (computer vision)**: Labelled 300+ images of blister packs, trained a YOLO object detection model to find empty pockets, and evaluated it on a separate test set. Analysed missed defects and improved results by adding more varied lighting examples.",
    },
    {
      type: "p",
      text: "Only write numbers you actually measured, and be ready to explain each one.",
    },
    { type: "h2", text: "Where to start" },
    {
      type: "p",
      text: "Finding good images is often the hardest part of a student project. Vision-M Studio’s Playground gives you sample datasets from real inspection projects, such as PCB boards, blister packs and bottle caps, with guided steps from labelling to training and testing. Once you have finished one, try the same workflow on images you collect yourself.",
    },
  ],
  faqs: [
    {
      q: "Do I need my own dataset?",
      a: "Not for your first project. Sample datasets let you learn the workflow. Collecting even a small dataset of your own for a second project makes your resume much stronger.",
    },
    {
      q: "How long does one project take?",
      a: "With a ready dataset, you can finish a first version in a few days. Leave time to analyse the results; that part makes the project interview-ready.",
    },
    {
      q: "Is it okay if my model isn’t very accurate?",
      a: "Yes, as long as you measured it honestly and can explain why. Showing you understand the limits is a strong signal to employers.",
    },
    {
      q: "Should I put the project on GitHub or LinkedIn?",
      a: "Yes. A short write-up with a few result images, the problem and what you learned is easy for recruiters to look at.",
    },
  ],
};

export default post;
