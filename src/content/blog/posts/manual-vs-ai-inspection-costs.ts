import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "manual-vs-ai-inspection-real-costs",
  title: "Manual vs AI Visual Inspection: Understanding the Real Costs",
  description:
    "A framework for comparing manual and AI visual inspection: the hidden costs of escaped defects and false rejects, what AI adds, and how to build your own estimate.",
  excerpt: "The salary of an inspector is the smallest part of the bill. A simple way to estimate what inspection really costs you.",
  audience: "corporate",
  date: "2026-11-25",
  readMinutes: 8,
  cover: "costs",
  body: [
    {
      type: "p",
      text: "When companies compare manual and AI inspection, they often compare the wrong things: an inspector’s salary against a software subscription. The real cost of inspection is mostly hidden in what gets missed and what gets wrongly rejected. This article gives you a framework to estimate those costs for your own line.",
    },
    { type: "h2", text: "The four costs of any inspection" },
    {
      type: "list",
      ordered: true,
      items: [
        "**Running cost**: people, time, equipment and space for the inspection itself.",
        "**Escaped defects**: defects that reach the next process or the customer. This includes returns, rework, complaints, penalties and lost orders.",
        "**False rejects**: good parts scrapped or rechecked because they were wrongly flagged.",
        "**Missing information**: decisions made without data, such as not knowing which shift, machine or batch is producing defects.",
      ],
    },
    {
      type: "callout",
      text: "For many manufacturers, one serious customer complaint costs more than a year of inspection labour. That is why escaped defects deserve the most attention in any comparison.",
    },
    { type: "h2", text: "Where manual inspection is strong" },
    {
      type: "list",
      items: [
        "**Flexible**: a person can inspect a new product the same day with a short briefing.",
        "**Good at unusual problems** they have never seen before.",
        "**No setup project** for low volumes or frequently changing products.",
      ],
    },
    { type: "h2", text: "Where manual inspection struggles" },
    {
      type: "list",
      items: [
        "**Attention drops** over a long shift of repetitive viewing.",
        "**Inspectors differ**: two people can judge the same borderline part differently.",
        "**Speed limits** on fast lines, often leading to sampling instead of checking every part.",
        "**Little data**: results are often tally marks, which makes trends hard to see.",
      ],
    },
    { type: "h2", text: "What AI inspection adds, and what it needs" },
    {
      type: "p",
      text: "A well-evaluated AI system can check every part at line speed with the same criteria all day, and record every result. But it needs an upfront investment: representative samples, labelled images, a suitable camera and lighting setup, integration with the line, and people to review results and maintain the model as products change.",
    },
    {
      type: "p",
      text: "It is also not perfect. It will have its own missed defects and false alarms, which must be measured on your parts before you rely on it. A serious supplier will tell you this clearly rather than promise a fixed accuracy.",
    },
    { type: "h2", text: "Build your own estimate" },
    {
      type: "p",
      text: "Use your own numbers. Even rough figures make the comparison far more useful than general claims.",
    },
    {
      type: "table",
      head: ["Question", "Where to find it"],
      rows: [
        ["Parts inspected per day", "Production records"],
        ["People and hours spent on visual inspection", "Shift rosters"],
        ["Defects found downstream or by customers per month", "Complaint and return logs"],
        ["Average cost of one escaped defect", "Rework, freight, penalties, credit notes"],
        ["Good parts rejected or rechecked per month", "Scrap and recheck records"],
        ["Cost of one false reject", "Material plus handling time"],
      ],
    },
    {
      type: "p",
      text: "Multiply escaped defects by their cost, add false rejects multiplied by their cost, and add the running cost. That is your current monthly cost of inspection. Then ask: how much of the first two would need to fall for an AI system to pay for itself?",
    },
    { type: "h2", text: "Hybrid is often the right answer" },
    {
      type: "p",
      text: "The choice is rarely all-or-nothing. A common setup is AI checking every part and people reviewing only the flagged ones. This puts human judgement where it adds the most value and removes the most tiring part of the job.",
    },
    { type: "h2", text: "Start with evidence" },
    {
      type: "p",
      text: "Before any large investment, run a focused evaluation on one product and one defect type with representative samples. It turns an assumption into a measured result. Vision-M’s Pilot plan is designed for exactly this step: a defined use case, clear sample and defect criteria, and an honest look at the results before you decide.",
    },
  ],
  faqs: [
    {
      q: "Is AI inspection only for large companies?",
      a: "No. Browser-based platforms and focused pilots make it possible for smaller manufacturers to evaluate one product at a time without a large upfront project.",
    },
    {
      q: "How long before AI inspection pays back?",
      a: "It depends almost entirely on your cost of escaped defects and false rejects. Build the estimate above with your own figures; general payback claims are not reliable.",
    },
    {
      q: "Do we still need inspectors?",
      a: "In most setups, yes. Their role shifts to reviewing flagged parts, handling borderline cases and improving the process.",
    },
    {
      q: "Are cameras and installation included in a subscription?",
      a: "With Vision-M, hardware, lighting, installation and integration are scoped separately for each project, because every line is different.",
    },
  ],
};

export default post;
