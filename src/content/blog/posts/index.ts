/**
 * All published blog posts. To add a post: create a file next to this one (copy an existing
 * post), then add it to the list below. Newest first when dates are equal.
 */
import type { BlogAudience, BlogPost } from "../types";
import whatIsComputerVision from "./what-is-computer-vision";
import howImageLabellingWorks from "./how-image-labelling-works";
import yoloNanoVsSmall from "./yolo-nano-vs-small";
import howManyImages from "./how-many-images";
import aiForQualityEngineers from "./ai-for-quality-engineers";
import precisionRecallMap from "./precision-recall-map-explained";
import manualVsAiCosts from "./manual-vs-ai-inspection-costs";
import startAiPilot from "./start-ai-inspection-pilot";
import aiVisionProjects from "./ai-vision-projects-for-resume";
import dataAugmentation from "./data-augmentation-explained";

const ALL: BlogPost[] = [
  whatIsComputerVision,
  yoloNanoVsSmall,
  aiForQualityEngineers,
  manualVsAiCosts,
  howImageLabellingWorks,
  howManyImages,
  precisionRecallMap,
  startAiPilot,
  aiVisionProjects,
  dataAugmentation,
];

/** Newest first; posts with the same date keep the order above */
export const BLOG_POSTS: BlogPost[] = ALL.map((p, i) => ({ p, i }))
  .sort((a, b) => b.p.date.localeCompare(a.p.date) || a.i - b.i)
  .map(({ p }) => p);

export const BLOG_AUDIENCES: { id: BlogAudience; label: string }[] = [
  { id: "students", label: "Students" },
  { id: "engineers", label: "Engineers" },
  { id: "professionals", label: "Professionals" },
  { id: "corporate", label: "Corporate" },
];

export const audienceLabel = (id: BlogAudience) => BLOG_AUDIENCES.find((a) => a.id === id)?.label ?? id;

export const getBlogPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
