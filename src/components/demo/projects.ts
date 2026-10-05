import type { ComponentType } from "react";
import { SolutionDemo } from "@/components/demo/vision-m/SolutionDemo";
import { StudioDemo } from "@/components/demo/vision-m/StudioDemo";

export type ProjectStatus = "Live" | "Pilot" | "In development";

export interface ShowcaseProject {
  id: string;
  name: string;
  tagline: string;
  category: string;
  status: ProjectStatus;
  tags: string[];
  /** Poster shown on the card; `previewVideo` plays on hover. */
  poster: string;
  /** CSS object-position for the poster, to keep the interesting part in frame. */
  posterPosition?: string;
  previewVideo?: string;
  /** Tailwind gradient used for the card glow and accents. */
  accent: string;
  Demo: ComponentType<{ onClose: () => void }>;
}

export const SHOWCASE_PROJECTS: ShowcaseProject[] = [
  {
    id: "vision-m",
    name: "Vision-M",
    tagline: "A complete AI inspection station for your production line: camera, edge computer and desktop app, installed and trained on your parts.",
    category: "For manufacturers · Turnkey inspection",
    status: "Live",
    tags: ["Installed on-site", "Camera & lighting", "Desktop app", "Works offline"],
    poster: "/demo/vision-m/seat-cover.jpg",
    posterPosition: "30% 75%",
    previewVideo: "/demo/vision-m/carseat-live.mp4",
    accent: "from-cyan-400 via-sky-500 to-blue-600",
    Demo: SolutionDemo,
  },
  {
    id: "vision-m-studio",
    name: "Vision-M Studio",
    tagline: "Build your own defect-detection AI in the browser: upload photos, label them, train a model and test it live.",
    category: "Web app · Build your own AI",
    status: "Live",
    tags: ["AI labelling", "No-code training", "Live testing", "ONNX / TFLite export"],
    poster: "/demo/vision-m/card-cover.jpg",
    previewVideo: "/demo/vision-m/blister-live.mp4",
    accent: "from-sky-400 via-indigo-500 to-violet-600",
    Demo: StudioDemo,
  },
];

/** Empty slots shown on the gallery until the next project demos are ready. */
export const PLACEHOLDER_SLOTS = 3;

export const findProject = (id?: string) => SHOWCASE_PROJECTS.find((p) => p.id === id);
