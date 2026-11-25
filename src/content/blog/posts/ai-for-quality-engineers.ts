import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "ai-for-quality-engineers-what-changes",
  title: "AI for Quality Engineers: What Changes and What Doesn’t",
  description:
    "How AI visual inspection changes the quality engineer's job, which skills stay valuable, which new ones to learn, and how to start without a coding background.",
  excerpt: "AI won’t replace quality thinking. It changes where that thinking goes. A practical look for QA and QC professionals.",
  audience: "professionals",
  date: "2026-11-25",
  readMinutes: 7,
  cover: "inspector",
  body: [
    {
      type: "p",
      text: "If you work in quality, you have probably heard that AI will “automate inspection”. It is a reasonable worry and a real opportunity. The truth is more useful than either headline: AI vision changes **where** a quality engineer spends their effort, and the people who understand the process are exactly the ones these projects need.",
    },
    { type: "h2", text: "What doesn’t change" },
    {
      type: "list",
      items: [
        "**Defining what a defect is.** A model can’t decide your acceptance criteria. Someone who knows the product, the customer and the standard has to.",
        "**Root-cause thinking.** A model can flag a rise in scratches. Finding out that a fixture is worn is still engineering work.",
        "**Judgement on borderline cases.** Every line has grey areas. Deciding how to treat them is a quality decision, not a software setting.",
        "**Accountability.** Someone still signs off on what ships.",
      ],
    },
    { type: "h2", text: "What does change" },
    {
      type: "p",
      text: "The repetitive part, looking at thousands of nearly identical parts per shift, is what AI is good at. That shifts the quality engineer’s work toward:",
    },
    {
      type: "list",
      items: [
        "**Turning criteria into examples.** Instead of only writing a defect catalogue, you build a labelled set of images that shows each defect and each acceptable variation.",
        "**Reviewing model decisions.** You check what the system flagged and, more importantly, what it missed.",
        "**Watching for drift.** New material lots, a changed light or a new product variant can affect results. Spotting this early is a new kind of process control.",
        "**Using the data.** Every inspected part leaves a record. Trends by shift, batch or machine become visible without manual tally sheets.",
      ],
    },
    { type: "h2", text: "The new skills worth learning" },
    {
      type: "p",
      text: "None of these need a computer science degree. They are extensions of what good quality engineers already do.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "**Dataset thinking**: knowing what a representative set of images looks like, and why near-duplicates and missing conditions mislead a model.",
        "**Consistent labelling**: drawing defect boxes the same way every time, and writing down the rules so others can follow them.",
        "**Reading results**: understanding missed defects versus false alarms, and what precision and recall mean in practice.",
        "**Capture conditions**: how camera position, lighting and image resolution decide what is even visible.",
        "**Running a small evaluation**: testing on parts the model never saw before trusting it on the line.",
      ],
    },
    {
      type: "callout",
      text: "The most valuable person on an AI inspection project is often not the one who knows the most about models. It is the one who knows exactly what a defect looks like and why it matters.",
    },
    { type: "h2", text: "Missed defects vs false alarms" },
    {
      type: "p",
      text: "Quality people already know this trade-off from manual inspection. A strict inspector rejects more good parts; a relaxed one lets more defects through. AI systems have the same trade-off, usually controlled by a confidence threshold. Choosing where to set it, based on the cost of each kind of mistake, is a quality decision your experience directly applies to.",
    },
    { type: "h2", text: "How to start" },
    {
      type: "list",
      ordered: true,
      items: [
        "Pick **one visible defect** you already inspect for, and collect images of good and bad parts.",
        "Label them carefully and train a small model in a browser-based tool. No coding is needed.",
        "Test it on new parts and write down what it missed and why.",
        "Share the findings with your team. A short, honest evaluation is a strong first step toward a real project.",
      ],
    },
    {
      type: "p",
      text: "Vision-M Studio’s Playground is built for this kind of hands-on start: guided steps, sample datasets from real inspection projects, and your own models trained in the browser.",
    },
  ],
  faqs: [
    {
      q: "Will AI replace quality inspectors?",
      a: "It takes over repetitive viewing, but the work of defining defects, reviewing results, handling borderline cases and fixing root causes stays with people. Those skills become more valuable, not less.",
    },
    {
      q: "Do I need to learn programming?",
      a: "Not to start. Modern tools handle the training in the browser. Programming helps later if you want to integrate systems or automate reports.",
    },
    {
      q: "What is the best first project?",
      a: "A clearly visible defect you already know well, in a fixed camera setup. Simple projects teach the full workflow and show results quickly.",
    },
    {
      q: "How do I explain this skill on my CV?",
      a: "Describe the problem, the dataset you built, how you tested the model and what you learned from its mistakes. That is more convincing than listing tools.",
    },
  ],
};

export default post;
