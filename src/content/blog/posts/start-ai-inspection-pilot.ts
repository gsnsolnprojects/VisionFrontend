import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "how-to-start-ai-inspection-pilot-factory",
  title: "How to Start an AI Inspection Pilot in Your Factory",
  description:
    "A step-by-step plan for a first AI visual inspection pilot: choosing the use case, defining defects, collecting samples, measuring results and deciding what next.",
  excerpt: "A small, well-defined pilot beats a big, vague project. Seven steps to get from idea to a clear decision.",
  audience: "corporate",
  date: "2026-11-25",
  readMinutes: 8,
  cover: "pilot",
  body: [
    {
      type: "p",
      text: "Many AI inspection projects fail for the same reason: they start too big and too vague. “Use AI to improve quality” is not a project. “Detect missing caps on line 2 for our 500 ml bottle” is. A good pilot is small, measurable and designed to end in a clear decision.",
    },
    { type: "h2", text: "Step 1: Choose the right first use case" },
    {
      type: "p",
      text: "The ideal first use case has four qualities:",
    },
    {
      type: "list",
      items: [
        "**Visible**: a person can see the defect clearly in a photo.",
        "**Costly**: escapes or false rejects of this defect cost real money or customer trust.",
        "**Frequent enough** that you can collect defective samples within weeks, not months.",
        "**Stable setup**: one product, one station, controlled positioning.",
      ],
    },
    { type: "h2", text: "Step 2: Define the defect in writing" },
    {
      type: "p",
      text: "Write down what counts as a defect and what doesn’t, with photos of each. Include the borderline cases and the decision for each one. If your own team can’t agree on a part, a model trained on their labels won’t be consistent either.",
    },
    { type: "h2", text: "Step 3: Set success criteria before you start" },
    {
      type: "p",
      text: "Decide in advance what a successful pilot looks like. For example: “finds at least this share of defects on the test set, with no more than this many false alarms per thousand good parts, at line speed”. Agreeing on this up front keeps the final decision honest.",
    },
    {
      type: "callout",
      text: "Measure both missed defects and false alarms. A system that catches everything but rejects too many good parts will be switched off within a week.",
    },
    { type: "h2", text: "Step 4: Collect representative samples" },
    {
      type: "list",
      items: [
        "Images from the **real station**, with the real lighting and camera position.",
        "**Good parts** showing normal variation, not just perfect ones.",
        "**Defective parts** from different batches, including faint and borderline examples.",
        "A separate set of parts kept aside **only for the final test**.",
      ],
    },
    { type: "h2", text: "Step 5: Label, train and test" },
    {
      type: "p",
      text: "Label the images following your written definition, train a model, and test it on the held-out set. Expect more than one round. The first model usually reveals gaps in the data, such as a lighting condition or product variant that was missing.",
    },
    { type: "h2", text: "Step 6: Run it alongside your current process" },
    {
      type: "p",
      text: "Before relying on the system, run it in parallel with existing inspection for a period. Compare its decisions with your inspectors’ on the same parts. This builds evidence and trust, and shows how it behaves on real day-to-day variation.",
    },
    { type: "h2", text: "Step 7: Decide" },
    {
      type: "p",
      text: "At the end, compare results with the criteria from step 3. There are three good outcomes:",
    },
    {
      type: "list",
      items: [
        "**Go**: criteria met. Plan the move to production, including integration and maintenance.",
        "**Adjust**: close but not there. Change the camera, lighting or data, and run a short second round.",
        "**Stop**: the defect is not reliably visible with this setup. That is a valuable answer that saves you a much larger investment.",
      ],
    },
    { type: "h2", text: "Who should be on the team" },
    {
      type: "list",
      items: [
        "A **quality engineer** who owns the defect definition.",
        "A **production or line contact** for access, samples and line conditions.",
        "Someone to **label and review results**, often the quality engineer with support.",
        "A **decision owner** who agreed to the success criteria.",
      ],
    },
    { type: "h2", text: "Get started" },
    {
      type: "p",
      text: "Vision-M’s Pilot plan is built around this approach: one specific use case, defined sample and defect criteria, and an evaluation that ends in an informed decision. If you are not sure where to start, begin with the defect that costs you the most and that you can see clearly in a photo.",
    },
  ],
  faqs: [
    {
      q: "How long does a pilot take?",
      a: "It depends mainly on how quickly you can collect representative defective samples. With samples ready, the labelling, training and testing rounds are usually the faster part.",
    },
    {
      q: "Do we need new cameras for a pilot?",
      a: "Not always for the first feasibility check. For a decision about production, the images should come from the camera and lighting setup you would actually use.",
    },
    {
      q: "What if the pilot fails?",
      a: "A clear “not feasible with this setup” is a useful result. It tells you what would need to change, such as resolution or lighting, before investing more.",
    },
    {
      q: "Can we run several pilots at once?",
      a: "It is better to finish one first. The lessons from the first pilot make the next ones faster and cheaper.",
    },
  ],
};

export default post;
