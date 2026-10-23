/**
 * Content of the Playground Learning centre: the five-step walkthrough, twelve short lessons in
 * four modules (each with a key idea and a two-question check), and the glossary. Plain data so
 * it's easy to edit.
 */

export interface CheckQuestion {
  question: string;
  options: string[];
  /** index into options */
  answer: number;
  /** shown after answering */
  why: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  sections: { heading: string; body: string }[];
  keyIdea: string;
  /** an optional real photo from GSN's datasets (public/playground) */
  image?: { src: string; caption: string };
  check: [CheckQuestion, CheckQuestion];
}

export interface Module {
  id: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

export type WalkthroughTarget = "overview" | "label" | "train" | "test" | "report";

export const WALKTHROUGH: { title: string; text: string; target: WalkthroughTarget; action: string }[] = [
  {
    title: "Pick one clear question",
    text: "Choose a single defect to find, like a missing screw. A narrow question gives a model you can understand and improve.",
    target: "overview",
    action: "Choose a mission",
  },
  {
    title: "Label every photo the same way",
    text: "Draw boxes the same way on every photo: tight around the defect, every defect, every time. Consistency teaches more than quantity.",
    target: "label",
    action: "Open my photos",
  },
  {
    title: "Keep test photos aside",
    text: "The model must never learn from the photos you test it on, or its score means nothing. Vision-M keeps a held-out test set for you.",
    target: "train",
    action: "See the split",
  },
  {
    title: "Look at the mistakes, not just the score",
    text: "Test on the held-out photos and study the misses and the extra boxes. They tell you which examples to add or fix.",
    target: "test",
    action: "Test a model",
  },
  {
    title: "Write down what you learned",
    text: "Make a report of your test. Note what worked, what didn't, and what you would change next time.",
    target: "report",
    action: "Make a report",
  },
];

const PCB = (name: string) => `/playground/quiz-pcb-${name}.jpg`;

export const MODULES: Module[] = [
  {
    id: "basics",
    title: "Basics",
    blurb: "What AI inspection is and what a model actually learns.",
    lessons: [
      {
        id: "what-is-ai-inspection",
        title: "What is AI visual inspection?",
        summary: "Teaching a computer to spot defects the way an inspector does.",
        minutes: 2,
        sections: [
          {
            heading: "The job",
            body: "On a production line, inspectors check parts for defects: a missing screw, a crack, a crooked label. It's tiring, and even good inspectors miss things after hours of looking. A camera with an AI model can check every part, every time, at the same speed.",
          },
          {
            heading: "How the AI learns",
            body: "You don't write rules like \"a scratch is a thin bright line\". Instead you show the model many photos with the defects marked, and it works out for itself what each defect looks like. That's why good examples matter so much.",
          },
          {
            heading: "What it gives back",
            body: "For each new photo, the model draws boxes around what it thinks are defects, names each one (its class), and says how sure it is (its confidence, from 0 to 1).",
          },
        ],
        keyIdea: "An inspection model learns from labelled examples, not from rules you write.",
        image: { src: PCB("open-circuit"), caption: "A real circuit board photo from GSN's PCB dataset. Can you spot the broken track?" },
        check: [
          {
            question: "How does an inspection model learn what a defect looks like?",
            options: ["From rules a programmer writes", "From many photos with the defects marked", "From the camera's settings"],
            answer: 1,
            why: "The model works out what defects look like by studying labelled examples.",
          },
          {
            question: "What does a confidence of 0.92 on a box mean?",
            options: ["The defect covers 92% of the photo", "The model is very sure about that box", "92 defects were found"],
            answer: 1,
            why: "Confidence is how sure the model is, from 0 (not at all) to 1 (completely).",
          },
        ],
      },
      {
        id: "images-labels-classes",
        title: "Images, labels and classes",
        summary: "The three things every dataset is made of.",
        minutes: 2,
        sections: [
          {
            heading: "Images",
            body: "Photos of the thing you want to inspect. The closer they are to what the camera will see in real use (same lighting, angle and distance), the better the model learns.",
          },
          {
            heading: "Classes",
            body: "The names of what the model should find, like \"missing screw\" or \"short circuit\". Every box belongs to exactly one class.",
          },
          {
            heading: "Labels",
            body: "The answers drawn on each image: a box around every defect and its class. The model learns by comparing its guesses with these labels, so careful, consistent labels matter more than having lots of images.",
          },
        ],
        keyIdea: "Images are the questions, labels are the answers, classes are the names of the answers.",
        check: [
          {
            question: "In \"missing screw\" and \"missing bar\", what are these?",
            options: ["Images", "Classes", "Epochs"],
            answer: 1,
            why: "Classes are the names of the things the model learns to find.",
          },
          {
            question: "Which matters more for a good model?",
            options: ["Thousands of carelessly labelled photos", "Fewer photos with careful, consistent labels"],
            answer: 1,
            why: "The model copies your labels. Inconsistent labels teach it inconsistent answers.",
          },
        ],
      },
      {
        id: "boxes-vs-outlines",
        title: "Boxes vs outlines",
        summary: "Detection and segmentation: two ways to point at a defect.",
        minutes: 2,
        sections: [
          {
            heading: "Detection draws boxes",
            body: "A detection model draws a rectangle around each defect and names it. It answers: what's there, and roughly where? Boxes are quick to label and quick to run, so detection is the usual starting point. Vision-M Playground uses detection.",
          },
          {
            heading: "Segmentation draws outlines",
            body: "A segmentation model colours the exact pixels of each defect, so you get its true shape. It's useful when size matters, for example measuring how much of a surface is rusted, but it takes much longer to label.",
          },
        ],
        keyIdea: "Start with boxes. Move to outlines only when a box isn't precise enough for your decision.",
        check: [
          {
            question: "Which is quicker to label?",
            options: ["Boxes (detection)", "Exact outlines (segmentation)"],
            answer: 0,
            why: "Drawing a rectangle takes seconds; tracing an exact outline takes much longer.",
          },
          {
            question: "When would you need outlines instead of boxes?",
            options: ["When you only need to know if a defect is there", "When you need the defect's exact size or shape"],
            answer: 1,
            why: "Outlines give the true shape, so you can measure area or size.",
          },
        ],
      },
    ],
  },
  {
    id: "data",
    title: "Your data",
    blurb: "Good photos and good labels make good models.",
    lessons: [
      {
        id: "good-photos",
        title: "Taking good photos",
        summary: "How to collect photos a model can learn from.",
        minutes: 3,
        sections: [
          {
            heading: "Match the real setup",
            body: "Take photos the way the camera on the line would: same distance, same angle, similar lighting. A model trained on close-ups in sunlight will struggle with wide shots under tube lights.",
          },
          {
            heading: "Show good and bad",
            body: "Collect both good parts and parts with the defect, about half and half. If the model only ever sees defective parts, it can't learn what normal looks like.",
          },
          {
            heading: "Vary what changes in real life",
            body: "If parts arrive slightly rotated or in different positions, include that variety. If they never do, don't add variety the model won't need.",
          },
          {
            heading: "How many?",
            body: "For one clear defect, 30 to 100 photos is a good start in Playground. Quality and variety beat sheer numbers.",
          },
        ],
        keyIdea: "Photograph your parts the way the real camera will see them, good ones and bad ones.",
        check: [
          {
            question: "Your camera will be fixed above a conveyor. How should you take training photos?",
            options: ["Close-ups from any angle", "From above, at the same distance as the camera"],
            answer: 1,
            why: "Training photos should look like what the model will see in real use.",
          },
          {
            question: "Why include photos of good parts?",
            options: ["So the model learns what normal looks like", "They aren't needed"],
            answer: 0,
            why: "Without good examples, the model can't tell normal from defective.",
          },
        ],
      },
      {
        id: "labelling-rules",
        title: "Labelling rules that matter",
        summary: "Small habits that make a big difference.",
        minutes: 3,
        sections: [
          {
            heading: "Box tight",
            body: "Draw the box close around the defect, with little background. Loose boxes teach the model that the background is part of the defect.",
          },
          {
            heading: "Label every one",
            body: "If a photo has three missing screws, draw three boxes. An unlabelled defect tells the model \"this is fine\", which is exactly the wrong lesson.",
          },
          {
            heading: "Be consistent",
            body: "Decide the rules once (what counts as a scratch, how small is too small to label) and stick to them on every photo. If two people label, agree the rules first.",
          },
          {
            heading: "Check before training",
            body: "Use the \"Needs a label\" filter to find photos you missed, and flick through the rest to catch mistakes.",
          },
        ],
        keyIdea: "An unlabelled defect teaches the model that the defect is normal.",
        image: { src: PCB("short"), caption: "A short circuit on a real board. One tight box around the copper bridge is all it needs." },
        check: [
          {
            question: "A photo has 3 missing screws but you only box 2. What does the model learn?",
            options: ["Nothing changes", "That the third one is normal"],
            answer: 1,
            why: "Anything not labelled is treated as \"not a defect\".",
          },
          {
            question: "What makes a good box?",
            options: ["Tight around the defect", "Big, with lots of background to be safe"],
            answer: 0,
            why: "Tight boxes teach the model what the defect itself looks like.",
          },
        ],
      },
      {
        id: "train-val-test",
        title: "Train, validation and test",
        summary: "Why your photos are split into three groups.",
        minutes: 2,
        sections: [
          {
            heading: "Training photos",
            body: "The model learns from these, seeing them again and again.",
          },
          {
            heading: "Validation photos",
            body: "Checked after every round of training to see if the model is really improving. It never learns from them.",
          },
          {
            heading: "Held-out test photos",
            body: "Kept aside until the very end for a final, honest check. In Vision-M they're tagged \"Held-out test\", and you use them in step 3.",
          },
          {
            heading: "Why it matters",
            body: "A model can score perfectly on photos it has memorised and still fail on new ones. Testing on unseen photos is how you find out before it reaches the factory.",
          },
        ],
        keyIdea: "Never test a model on photos it learned from: it's like knowing the exam questions in advance.",
        check: [
          {
            question: "Which photos does the model learn from?",
            options: ["Training", "Held-out test", "All of them"],
            answer: 0,
            why: "Only training photos are learned from; the others are for checking.",
          },
          {
            question: "Why keep test photos aside?",
            options: ["To save storage", "To get an honest score on photos the model has never seen"],
            answer: 1,
            why: "Unseen photos show how the model will do in real use.",
          },
        ],
      },
    ],
  },
  {
    id: "training",
    title: "Training",
    blurb: "What happens when you press Start training.",
    lessons: [
      {
        id: "what-happens-training",
        title: "What happens during training",
        summary: "Learning by guessing and being corrected.",
        minutes: 2,
        sections: [
          {
            heading: "Guess, compare, adjust",
            body: "The model looks at a training photo, guesses where the defects are, compares its guess with your labels, and adjusts itself slightly to be less wrong next time. Repeated over every photo, many times, that's training.",
          },
          {
            heading: "Loss",
            body: "A number for how wrong the model still is. It goes down as the model learns. When it stops falling, more training won't help much.",
          },
          {
            heading: "Starting from a base model",
            body: "Vision-M doesn't start from zero. It begins with a base model that already knows general shapes and edges, then fine-tunes it on your photos. That's why it can learn from just a few dozen images.",
          },
        ],
        keyIdea: "Training is thousands of small corrections: guess, compare with the label, adjust.",
        check: [
          {
            question: "What does it mean when loss goes down?",
            options: ["The model is getting less wrong", "The model is forgetting", "The photos are getting smaller"],
            answer: 0,
            why: "Loss measures how wrong the model is; lower is better.",
          },
          {
            question: "Why can Vision-M learn from only 30–100 photos?",
            options: ["It starts from a base model that already knows shapes and edges", "It doesn't need labels"],
            answer: 0,
            why: "Fine-tuning a base model needs far fewer examples than starting from scratch.",
          },
        ],
      },
      {
        id: "epochs-overfitting",
        title: "Epochs, and why more isn't always better",
        summary: "When extra practice turns into memorising.",
        minutes: 2,
        sections: [
          {
            heading: "Epochs",
            body: "One epoch is one full pass over all your training photos. Each epoch usually makes the model a little better.",
          },
          {
            heading: "Overfitting",
            body: "Train too long on too few photos and the model starts memorising them, scratches and dust included, instead of learning what a defect really is. It then scores brilliantly on training photos and poorly on new ones.",
          },
          {
            heading: "How Vision-M handles it",
            body: "After every epoch the model is checked on the validation photos, and the best version is the one that's kept, not simply the last one.",
          },
        ],
        keyIdea: "A model that memorises its training photos hasn't really learned; validation catches this.",
        check: [
          {
            question: "What is overfitting?",
            options: ["The model memorises training photos instead of learning the defect", "The model trains too fast"],
            answer: 0,
            why: "An overfitted model does well on photos it has seen and badly on new ones.",
          },
          {
            question: "Which version of the model does Vision-M keep?",
            options: ["The last one", "The one that did best on the validation photos"],
            answer: 1,
            why: "The best validation result is saved, which guards against overfitting.",
          },
        ],
      },
      {
        id: "nano-vs-small",
        title: "Nano vs small models",
        summary: "Speed or accuracy: choosing a model size.",
        minutes: 2,
        sections: [
          {
            heading: "Nano",
            body: "The smallest model. It trains fastest and runs fastest, which makes it a great first try and good for simple, clear defects.",
          },
          {
            heading: "Small",
            body: "A bigger model with more capacity. It takes longer to train and run, and usually spots subtle defects a little better.",
          },
          {
            heading: "How to choose",
            body: "Start with Nano. If it misses subtle defects even with good labels, try Small. A bigger model won't fix bad labels or too few photos.",
          },
        ],
        keyIdea: "Start small and fast; size up only when the data is good and the model still misses.",
        check: [
          {
            question: "Which model should you try first?",
            options: ["Nano", "Small"],
            answer: 0,
            why: "Nano is quick to train, so you learn fast whether your data works.",
          },
          {
            question: "Your Nano model misses defects because many photos aren't labelled. Will Small fix it?",
            options: ["Yes", "No, fix the labels first"],
            answer: 1,
            why: "No model size can learn from labels that aren't there.",
          },
        ],
      },
    ],
  },
  {
    id: "results",
    title: "Results",
    blurb: "Reading what your model gets right and wrong.",
    lessons: [
      {
        id: "reading-results",
        title: "Reading your results",
        summary: "Boxes, classes and confidence on each photo.",
        minutes: 2,
        sections: [
          {
            heading: "Each box is a guess",
            body: "On a result photo, every box is something the model found, with its class and its confidence (0 to 1).",
          },
          {
            heading: "Compare with the labels",
            body: "On held-out test photos, Vision-M shows \"Model found\" next to \"Labelled in the dataset\". Where they differ, the model made a mistake, or occasionally the label did.",
          },
          {
            heading: "Look for patterns",
            body: "Does it miss small defects? Struggle with one class? Get confused by reflections? Patterns tell you what examples to add.",
          },
        ],
        keyIdea: "Read results photo by photo and look for patterns in the mistakes.",
        check: [
          {
            question: "On a held-out photo the model found nothing, but the dataset label says \"missing screw\". What happened?",
            options: ["The model missed a defect", "The model raised a false alarm"],
            answer: 0,
            why: "A real defect with no box is a miss.",
          },
          {
            question: "What's most useful when your model makes mistakes?",
            options: ["Looking for a pattern in which photos it gets wrong", "Training again with the same photos"],
            answer: 0,
            why: "Patterns show what's missing from your examples.",
          },
        ],
      },
      {
        id: "misses-false-alarms",
        title: "Misses vs false alarms",
        summary: "Two kinds of mistakes with very different costs.",
        minutes: 2,
        sections: [
          {
            heading: "A miss",
            body: "A real defect the model didn't flag. In a factory, a bad part slips through to the customer. This is usually the costly mistake.",
          },
          {
            heading: "A false alarm",
            body: "The model flagged a defect that isn't there. A good part gets rejected or re-checked. Annoying and wasteful, but rarely dangerous.",
          },
          {
            heading: "The trade-off",
            body: "Lowering the confidence a model needs before flagging catches more defects but raises more false alarms. Raising it does the opposite. Each factory picks the balance that suits its product.",
          },
        ],
        keyIdea: "In inspection, a miss usually costs more than a false alarm.",
        image: { src: PCB("mouse-bite"), caption: "A tiny mouse bite on a track. Small defects like this are the ones models most often miss." },
        check: [
          {
            question: "The model flags a perfect part as defective. What is this?",
            options: ["A miss", "A false alarm"],
            answer: 1,
            why: "Flagging something that isn't there is a false alarm.",
          },
          {
            question: "For safety parts, which mistake should you work hardest to avoid?",
            options: ["Misses", "False alarms"],
            answer: 0,
            why: "A missed defect reaches the customer; a false alarm only costs a re-check.",
          },
        ],
      },
      {
        id: "precision-recall-map",
        title: "Precision, recall and mAP in plain words",
        summary: "The three numbers behind a model's score.",
        minutes: 3,
        sections: [
          {
            heading: "Precision",
            body: "Of everything the model flagged, how much really was a defect? High precision means few false alarms.",
          },
          {
            heading: "Recall",
            body: "Of all the real defects, how many did it catch? High recall means few misses. In inspection, watch recall closely.",
          },
          {
            heading: "mAP50",
            body: "One overall score from 0 to 1 that combines precision and recall across all classes. As a rough guide: above 0.8 is strong, 0.5 to 0.8 is a good start, below 0.5 needs more or better labelled photos.",
          },
        ],
        keyIdea: "Precision is about false alarms, recall is about misses, mAP sums them up.",
        check: [
          {
            question: "A model catches 9 of 10 real defects. Which number is 0.9?",
            options: ["Precision", "Recall"],
            answer: 1,
            why: "Recall is the share of real defects that were caught.",
          },
          {
            question: "A model with high precision but low recall…",
            options: ["Raises few false alarms but misses many defects", "Catches everything but raises many false alarms"],
            answer: 0,
            why: "High precision means its flags are trustworthy; low recall means it misses a lot.",
          },
        ],
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = MODULES.flatMap((m) => m.lessons);

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Base model", meaning: "A model already trained on lots of general images, used as the starting point so yours learns faster from fewer photos." },
  { term: "Bounding box", meaning: "A rectangle drawn around a defect, in a label or in the model's answer." },
  { term: "Class", meaning: "The name of a kind of thing the model finds, like \"missing screw\". Every box has one class." },
  { term: "Confidence", meaning: "How sure the model is about a box, from 0 (not at all) to 1 (completely)." },
  { term: "Dataset", meaning: "A collection of photos and their labels, used to train and test a model." },
  { term: "Detection", meaning: "Finding defects and drawing a box around each one. What Vision-M Playground does." },
  { term: "Epoch", meaning: "One full pass over all the training photos during training." },
  { term: "False alarm", meaning: "The model flags a defect that isn't there (a false positive)." },
  { term: "Held-out test set", meaning: "Photos kept aside and never learned from, used for a final honest check." },
  { term: "Inference / prediction", meaning: "Running a trained model on photos to see what it finds." },
  { term: "Label", meaning: "The correct answer on a photo: where each defect is and which class it belongs to." },
  { term: "Loss", meaning: "A number for how wrong the model still is during training. Lower is better." },
  { term: "mAP50", meaning: "An overall score from 0 to 1 combining precision and recall across all classes." },
  { term: "Miss", meaning: "A real defect the model didn't flag (a false negative)." },
  { term: "Model", meaning: "The trained program that looks at a photo and finds the defects it learned." },
  { term: "Overfitting", meaning: "When a model memorises its training photos instead of learning the defect, so it does badly on new photos." },
  { term: "Precision", meaning: "Of everything the model flagged, the share that really were defects." },
  { term: "Recall", meaning: "Of all the real defects, the share the model caught." },
  { term: "Segmentation", meaning: "Marking the exact pixels of each defect (an outline) instead of a box." },
  { term: "Training", meaning: "Teaching a model by letting it guess on labelled photos and correcting it, many times over." },
  { term: "Validation set", meaning: "Photos checked after every epoch to see if the model is improving; never learned from." },
];
