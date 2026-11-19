/**
 * Suggestions for a training run, worked out from the dataset (how many photos, how many labels of
 * each kind, how small the defects are) and the settings the student picked. Plain rules, no AI:
 * they run instantly in the browser and give the same answer every time.
 */

export type AdviceTone = "good" | "warn" | "info";

export interface Advice {
  tone: AdviceTone;
  text: string;
}

export interface DatasetFacts {
  /** photos the model learns from, extra copies included */
  trainPhotos: number;
  /** extra copies (augmentation) are part of the training photos */
  augmented: boolean;
  /** labelled boxes of each class in the training photos, by class name */
  boxesPerClass: { name: string; boxes: number }[];
  /**
   * How big a small defect is: the size of the box (square root of its area) that 1 in 10 boxes
   * is smaller than, as a share of the photo's side (0.05 = 5% of the photo). null while loading.
   */
  smallDefect: number | null;
}

export interface TrainChoice {
  size: "n" | "s";
  epochs: number;
  batchSize: number;
  imgSize: number;
  learningRate: number;
}

export interface TrainAdvice {
  dataset: Advice[];
  size: Advice;
  epochs: Advice;
  batchSize: Advice;
  imgSize: Advice;
  learningRate: Advice;
  suggested: TrainChoice;
  /** settings that look risky */
  warnings: number;
}

const BATCHES = [4, 8, 16, 32];
const IMAGE_SIZES = [320, 416, 512, 640, 800, 960, 1280];
/** the memory rule the server also checks */
const fitsMemory = (batch: number, img: number) => batch * (img / 640) ** 2 <= 32;

/** The usual epoch range for this many training photos */
export const epochRange = (photos: number): [number, number] => {
  if (photos < 150) return [50, 80];
  if (photos < 500) return [50, 100];
  if (photos < 1500) return [40, 80];
  return [30, 60];
};

/** Defect size in pixels once the photo is resized to this image size */
const pixels = (share: number, img: number) => Math.round(share * img);

export const adviseTraining = (facts: DatasetFacts, choice: TrainChoice): TrainAdvice => {
  const n = facts.trainPhotos;
  const [low, high] = epochRange(n);
  const photos = `${n} training photo${n === 1 ? "" : "s"}`;

  // ---- The dataset itself
  const dataset: Advice[] = [];
  if (n < 50) {
    dataset.push({ tone: "warn", text: `Only ${photos}. That's very few for a model to learn from: add more labelled photos, or make extra copies.` });
  } else if (n < 150 && !facts.augmented) {
    dataset.push({ tone: "info", text: `${photos} is a small dataset. Making extra copies (flipped, rotated, brighter) in step 1 usually helps more than any setting here.` });
  }
  const counted = facts.boxesPerClass.filter((c) => c.boxes > 0 || facts.boxesPerClass.length > 1);
  for (const c of counted) {
    if (c.boxes < 15) {
      dataset.push({
        tone: "warn",
        text: `"${c.name.replace(/_/g, " ")}" has only ${c.boxes} label${c.boxes === 1 ? "" : "s"}. The model will struggle to find it: add more photos of it.`,
      });
    }
  }
  if (counted.length > 1) {
    const sorted = [...counted].sort((a, b) => b.boxes - a.boxes);
    const most = sorted[0];
    const least = sorted[sorted.length - 1];
    if (least.boxes >= 15 && most.boxes >= least.boxes * 5) {
      dataset.push({
        tone: "info",
        text: `"${most.name.replace(/_/g, " ")}" has ${Math.round(most.boxes / least.boxes)} times more labels than "${least.name.replace(/_/g, " ")}". The model will be better at the common one.`,
      });
    }
  }
  if (!dataset.length && n > 0) dataset.push({ tone: "good", text: `${photos}, with enough labels of every kind. A good start.` });

  // ---- Suggested settings
  const tiny = facts.smallDefect !== null && pixels(facts.smallDefect, 640) < 12;
  const big = facts.smallDefect !== null && pixels(facts.smallDefect, 640) > 80;
  /** the smallest image size that keeps small defects at least 16 pixels wide */
  const clearSize = (share: number) => IMAGE_SIZES.find((size) => pixels(share, size) >= 16) ?? 1280;
  const suggestedImg = tiny ? clearSize(facts.smallDefect!) : 640;
  const suggestedBatch =
    [...BATCHES].reverse().find((b) => b <= 16 && n / b >= 10 && fitsMemory(b, suggestedImg)) ??
    BATCHES.find((b) => fitsMemory(b, suggestedImg)) ??
    4;
  const suggested: TrainChoice = {
    size: n < 300 ? "n" : choice.size,
    epochs: Math.round((low + high) / 2 / 10) * 10,
    batchSize: suggestedBatch,
    imgSize: suggestedImg,
    learningRate: 0.002,
  };

  // ---- Model size
  const size: Advice =
    choice.size === "s" && n < 300
      ? { tone: "warn", text: `Small needs more photos to beat Nano. With ${photos}, Nano trains faster and usually does as well.` }
      : choice.size === "n" && n >= 1000
        ? { tone: "info", text: `With ${photos}, Small may find a few more defects, if you can wait longer.` }
        : { tone: "good", text: choice.size === "n" ? "A good first choice for this many photos." : "Plenty of photos for the bigger model." };

  // ---- Epochs
  const e = choice.epochs;
  const epochs: Advice =
    e >= high * 1.25
      ? {
          tone: "warn",
          text: `${e} passes over ${photos} risks memorising them. Try ${low} to ${high}. ${facts.augmented ? "" : "Extra copies help more than extra passes."}`.trim(),
        }
      : e > high
        ? { tone: "info", text: `A little more than needed. The best version is kept, but ${low} to ${high} saves time.` }
        : e < low * 0.6
          ? { tone: "warn", text: `${e} passes is probably too few to learn properly. Try ${low} to ${high}.` }
          : e < low
            ? { tone: "info", text: `On the short side. ${low} to ${high} usually learns more.` }
            : { tone: "good", text: `Right for ${photos} (${low} to ${high}).` };

  // ---- Batch size
  const b = choice.batchSize;
  const steps = Math.floor(n / b);
  const batchSize: Advice = !fitsMemory(b, choice.imgSize)
    ? { tone: "warn", text: `Too big for image size ${choice.imgSize}: it won't fit in memory. Try ${BATCHES.filter((x) => fitsMemory(x, choice.imgSize)).pop()}.` }
    : steps < 10
      ? { tone: "warn", text: `Only ${steps} correction${steps === 1 ? "" : "s"} per pass with ${photos}. Try ${suggestedBatch}.` }
      : b === 4 && n > 500
        ? { tone: "info", text: `Batch 4 learns in small, jumpy steps. With ${photos}, 16 is steadier.` }
        : { tone: "good", text: `About ${steps} corrections per pass. Good.` };

  // ---- Image size
  const img = choice.imgSize;
  let imgSize: Advice;
  if (facts.smallDefect === null) {
    imgSize = { tone: "info", text: "Measuring how small your defects are..." };
  } else {
    const px = pixels(facts.smallDefect, img);
    imgSize =
      px < 12
        ? { tone: "warn", text: `Your smallest defects shrink to about ${px} pixels at this size and may disappear. Try ${clearSize(facts.smallDefect)}.` }
        : img >= 960 && big
          ? { tone: "info", text: `Your defects are large. 640 sees them just as well and trains much faster.` }
          : img < 640 && px < 24
            ? { tone: "info", text: `Faster, but your small defects are only about ${px} pixels. 640 is safer.` }
            : { tone: "good", text: `Your smallest defects stay about ${px} pixels wide. Clear enough.` };
  }

  // ---- Learning rate
  const lr = choice.learningRate;
  const learningRate: Advice =
    lr > 0.006
      ? { tone: "warn", text: "High: the model may jump past the right answer. 0.001 to 0.005 is safer." }
      : lr < 0.0008
        ? { tone: "info", text: "Low: it will learn slowly and may need more epochs. 0.001 to 0.005 is usual." }
        : { tone: "good", text: "In the safe range." };

  // A setting that already fits stays as the student set it
  if (size.tone !== "warn") suggested.size = choice.size;
  if (epochs.tone === "good") suggested.epochs = e;
  if (batchSize.tone === "good") suggested.batchSize = b;
  if (imgSize.tone === "good" && fitsMemory(suggested.batchSize, img)) suggested.imgSize = img;
  if (learningRate.tone === "good") suggested.learningRate = lr;
  if (!fitsMemory(suggested.batchSize, suggested.imgSize)) suggested.batchSize = BATCHES.filter((x) => fitsMemory(x, suggested.imgSize)).pop() ?? 4;

  const all = [size, epochs, batchSize, imgSize, learningRate];
  return {
    dataset,
    size,
    epochs,
    batchSize,
    imgSize,
    learningRate,
    suggested,
    warnings: all.filter((a) => a.tone === "warn").length,
  };
};
