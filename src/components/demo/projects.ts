import type { ComponentType } from "react";
import { Eye, RadioTower, type LucideIcon } from "lucide-react";
import { SolutionDemo } from "@/components/demo/vision-m/SolutionDemo";
import { StudioDemo } from "@/components/demo/vision-m/StudioDemo";
import { GsnEdgeDemo } from "@/components/demo/gsn-edge/GsnEdgeDemo";
import { IotArt, VisionArt } from "@/components/demo/CategoryArt";

export type ProjectStatus = "Live" | "Pilot" | "In development";

export interface ShowcaseProject {
  id: string;
  name: string;
  tagline: string;
  /** Small label above the project name, e.g. who it's for. */
  kicker: string;
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

/** A top-level "folder" on the showcase page. Add projects to `projects` to fill it. */
export interface ShowcaseCategory {
  id: string;
  name: string;
  tagline: string;
  description: string;
  Icon: LucideIcon;
  /** Designed cover shown on the folder card. */
  Art: ComponentType;
  /** Tailwind gradient for the folder's glow and accents. */
  accent: string;
  projects: ShowcaseProject[];
}

export const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: "vision",
    name: "Vision",
    tagline: "AI visual inspection for manufacturing",
    description:
      "Cameras that spot defects on the production line, and the platform to train them. Delivered as a complete station, or as a web app to build your own models.",
    Icon: Eye,
    Art: VisionArt,
    accent: "from-cyan-400 via-sky-500 to-blue-600",
    projects: [
      {
        id: "vision-m",
        name: "Vision-M",
        tagline: "A complete AI inspection station for your production line: camera, edge computer and desktop app, installed and trained on your parts.",
        kicker: "For manufacturers · Turnkey inspection",
        status: "Live",
        tags: ["Installed on-site", "Camera & lighting", "Desktop app", "Works offline"],
        poster: "/demo/vision-m/station-cover.jpg",
        posterPosition: "50% 30%",
        accent: "from-cyan-400 via-sky-500 to-blue-600",
        Demo: SolutionDemo,
      },
      {
        id: "vision-m-studio",
        name: "Vision-M Studio",
        tagline: "Build your own defect-detection AI in the browser: upload photos, label them, train a model and test it live.",
        kicker: "Web app · Build your own AI",
        status: "Live",
        tags: ["AI labelling", "No-code training", "Live testing", "ONNX / TFLite export"],
        poster: "/demo/vision-m/studio-cover.jpg",
        accent: "from-sky-400 via-indigo-500 to-violet-600",
        Demo: StudioDemo,
      },
    ],
  },
  {
    id: "iot",
    name: "IoT",
    tagline: "Connected machines and live plant data",
    description: "Sensors, gateways and dashboards that bring live data from machines, energy meters and assets into one place.",
    Icon: RadioTower,
    Art: IotArt,
    accent: "from-emerald-400 via-teal-500 to-cyan-600",
    projects: [
      {
        id: "gsn-edge",
        name: "GSN Edge",
        tagline: "One dashboard for every connected asset: machines, elevators, vehicle fleets and energy meters, live.",
        kicker: "Web app · IoT monitoring",
        status: "Live",
        tags: ["Machine monitoring", "Elevators", "Vehicle fleet", "Energy"],
        poster: "/demo/gsn-edge/edge-cover.jpg",
        accent: "from-emerald-400 via-teal-500 to-cyan-600",
        Demo: GsnEdgeDemo,
      },
    ],
  },
];

/** Empty slots shown below the category folders, for future categories. */
export const PLACEHOLDER_SLOTS = 3;

export const findCategory = (id?: string) => SHOWCASE_CATEGORIES.find((c) => c.id === id);

/** Finds a project in any category; used to redirect old /showcase/:projectId links. */
export const findProjectAnywhere = (projectId?: string) => {
  for (const category of SHOWCASE_CATEGORIES) {
    const project = category.projects.find((p) => p.id === projectId);
    if (project) return { category, project };
  }
  return undefined;
};

export const projectPath = (categoryId: string, projectId: string) => `/showcase/${categoryId}/${projectId}`;
