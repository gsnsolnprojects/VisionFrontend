import { Check, GraduationCap, Sparkles, Target } from "lucide-react";

/** What happens during training, for the Train step and Level 1's explanation */
export const TRAINING_JOURNEY = [
  { Icon: Check, title: "Check photos and labels", text: "Every photo and its labels are read and checked, so nothing broken goes in." },
  {
    Icon: GraduationCap,
    title: "Learn from examples",
    text: "The model looks at the training photos again and again. One full pass over all of them is called an epoch.",
  },
  {
    Icon: Target,
    title: "Check itself",
    text: "After each epoch it tries the validation photos it isn't learning from, and keeps its best version so far.",
  },
  { Icon: Sparkles, title: "Save the model", text: "The best version is saved, ready to be tested on the held-out photos." },
];
