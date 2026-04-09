import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { FaBrain, FaSearch } from "react-icons/fa";
import * as THREE from "three";

const FloatingCameraModel = () => {
  const groupRef = useRef<THREE.Group>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const { scene } = useGLTF("/surveillance_camera.glb");
  const modelRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const handleMouseMove = (event: MouseEvent) => {
      const widget = document.querySelector<HTMLElement>(".floating-camera-wrap");

      if (!widget) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;
        pointerTarget.current = { x, y };
        return;
      }

      const rect = widget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Use widget center as reference so motion feels local and stable.
      const localX = (event.clientX - centerX) / (rect.width * 1.6);
      const localY = (event.clientY - centerY) / (rect.height * 1.6);

      pointerTarget.current = {
        x: clamp(localX, -1, 1),
        y: clamp(localY, -1, 1),
      };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const cloned = scene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fitScale = 1.6 / maxDim;

    cloned.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
    cloned.scale.setScalar(fitScale);
    modelRef.current = cloned;
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Subtle follow behavior so the camera "looks" toward cursor.
    const targetRotX = pointerTarget.current.y * 0.2;
    const targetRotY = pointerTarget.current.x * 0.35;

    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.08;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.08;
  });

  return (
    <group ref={groupRef} rotation={[0.1, -0.35, 0]}>
      {modelRef.current ? <primitive object={modelRef.current} /> : null}
    </group>
  );
};

const UploadStepIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 15V6M12 6L8.7 9.3M12 6L15.3 9.3"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 17.5V19C4 19.55 4.45 20 5 20H19C19.55 20 20 19.55 20 19V17.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const AnnotateStepIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6 5H18L20 9L16 15H8L4 9L6 5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="6" cy="5" r="1.2" fill="currentColor" />
    <circle cx="18" cy="5" r="1.2" fill="currentColor" />
    <circle cx="20" cy="9" r="1.2" fill="currentColor" />
    <circle cx="16" cy="15" r="1.2" fill="currentColor" />
    <circle cx="8" cy="15" r="1.2" fill="currentColor" />
    <circle cx="4" cy="9" r="1.2" fill="currentColor" />
  </svg>
);

const Landing = () => {
  const navigate = useNavigate();
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [confidences, setConfidences] = useState([92, 89, 86]);
  const workflowFlowSteps = [
    {
      title: "Upload Dataset",
      icon: "upload",
      heading: "Upload Dataset",
      description: "Import and organize inspection images for your workflow.",
    },
    {
      title: "Annotate & Augment",
      icon: "annotate",
      heading: "Annotate & Augment",
      description: "Label defects and strengthen data quality for robust training.",
    },
    {
      title: "Select & Train Model",
      icon: "brain",
      heading: "Select & Train Model",
      description: "Choose the best model setup and train it with optimized settings.",
    },
    {
      title: "Run Inference",
      icon: "inference",
      heading: "Run Inference",
      description: "Deploy and detect defects in real time on production lines.",
    },
  ];
  const [activeFlowIndex, setActiveFlowIndex] = useState(2);
  const industryShowcases = [
    {
      name: "Pharma",
      image: "/industry/pharma.png",
      summary: "AI-powered quality inspection for medicine packaging lines.",
      useCases: [
        {
          title: "Blister Defect Detection",
          description: "Detect seal issues, broken cavities, and missing tablets.",
          tags: ["Defect Detection", "Seal Check"],
        },
        {
          title: "Medicine Classification",
          description: "Classify pills by shape, color, and imprint consistency.",
          tags: ["Classification", "SKU Validation"],
        },
      ],
      kpis: ["99%+ detection precision", "Lower batch rejection risk", "24/7 edge-ready monitoring"],
    },
    {
      name: "PCB Manufacturing",
      image: "/industry/pcb.png",
      summary: "Inline electronics inspection for high-throughput PCB lines.",
      useCases: [
        {
          title: "Component Presence Check",
          description: "Identify missing or misaligned parts before dispatch.",
          tags: ["Presence Check", "Alignment"],
        },
        {
          title: "Solder Joint Analysis",
          description: "Flag weak or inconsistent solder joints in real time.",
          tags: ["Solder QA", "Anomaly Detection"],
        },
      ],
      kpis: ["Fewer field failures", "Faster QA feedback loops", "Consistent board quality"],
    },
    {
      name: "Automotive",
      image: "/industry/automobile.png",
      summary: "Reliable visual inspection across assembly and finishing stages.",
      useCases: [
        {
          title: "Part Surface Inspection",
          description: "Detect scratches, dents, and finish defects on components.",
          tags: ["Surface QA", "Visual Defects"],
        },
        {
          title: "Assembly Validation",
          description: "Validate fitment and part placement before next station.",
          tags: ["Assembly Check", "Process Control"],
        },
      ],
      kpis: ["Reduced rework costs", "Higher throughput consistency", "Shift-independent accuracy"],
    },
    {
      name: "Ports & Logistics",
      image: "/industry/port.png",
      summary: "Container and yard inspection for safer, faster operations.",
      useCases: [
        {
          title: "Container Damage Detection",
          description: "Spot dents, cracks, and structural anomalies quickly.",
          tags: ["Damage Detection", "Safety"],
        },
        {
          title: "Container ID Verification",
          description: "Read and validate markings for tracking and compliance.",
          tags: ["OCR Validation", "Tracking"],
        },
      ],
      kpis: ["Faster gate operations", "Improved inspection consistency", "Audit-ready traceability"],
    },
  ];
  const [activeIndustryIndex, setActiveIndustryIndex] = useState(0);
  const performanceStats = [
    { value: "99.2%", label: "Defect Detection Accuracy" },
    { value: "30%", label: "Faster Inspection Cycle" },
    { value: "24/7", label: "Edge Inference Runtime" },
    { value: "0", label: "Cloud Dependency on Line" },
  ];
  const trustedCompanies = [
    { name: "NovaForge", logo: "/logos/company-1.png" },
    { name: "SteelAxis", logo: "/logos/company-2.png" },
    { name: "OptiFab", logo: "/logos/company-3.png" },
    { name: "Vertex Manufacturing", logo: "/logos/company-4.png" },
    { name: "AutoCore", logo: "/logos/company-5.png" },
  ];

  // Force light theme on landing page (no dark mode)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      // Restore user's theme preference when leaving (if stored)
      const stored = localStorage.getItem("visionm-theme");
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  useEffect(() => {
    const sequenceTimer = window.setInterval(() => {
      setActiveBoxIndex((prev) => (prev + 1) % 3);
    }, 1100);

    return () => window.clearInterval(sequenceTimer);
  }, []);

  useEffect(() => {
    const base = [92, 89, 86];
    const confidenceTimer = window.setInterval(() => {
      setConfidences(
        base.map((value) => {
          const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
          return Math.max(80, Math.min(99, value + variation));
        })
      );
    }, 780);

    return () => window.clearInterval(confidenceTimer);
  }, []);

  return (
    <div className="min-vh-100 position-relative overflow-hidden landing-hero-bg text-light">
      <style>{`
        .landing-hero-bg {
          background:
            radial-gradient(1200px 620px at 82% -8%, rgba(14, 165, 233, 0.22), rgba(15, 23, 42, 0) 62%),
            radial-gradient(900px 440px at 8% 5%, rgba(59, 130, 246, 0.17), rgba(15, 23, 42, 0) 66%),
            linear-gradient(160deg, #060b1a 0%, #0a1122 48%, #0e1b36 100%);
        }
        .btn-cyan-primary {
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          border: none;
          color: #ffffff;
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-cyan-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(14, 165, 233, 0.45);
          color: #ffffff;
        }
        .btn-cyan-outline {
          border: 1px solid rgba(56, 189, 248, 0.65);
          background: rgba(14, 165, 233, 0.08);
          color: #cffafe;
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .btn-cyan-outline:hover {
          transform: translateY(-2px);
          background: rgba(14, 165, 233, 0.2);
          border-color: rgba(56, 189, 248, 1);
          color: #ecfeff;
        }
        .hero-eyebrow {
          color: #67e8f9;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .brand-visible {
          color: #67e8f9 !important;
          text-shadow: 0 2px 14px rgba(14, 165, 233, 0.35);
        }
        .hero-title {
          max-width: 18ch;
          line-height: 1.04;
          color: #f8fafc !important;
          font-size: clamp(2.2rem, 4.6vw, 4.35rem);
          letter-spacing: -0.02em;
          text-shadow: 0 8px 26px rgba(2, 6, 23, 0.52);
        }
        .hero-subtitle {
          max-width: 54ch;
          color: rgba(226, 232, 240, 0.96);
          text-shadow: 0 4px 16px rgba(2, 6, 23, 0.45);
        }
        .hero-cta-row {
          row-gap: 0.75rem;
        }
        .hero-cta-row > * + * {
          margin-left: 0.9rem;
        }
        .preview-shell {
          background: linear-gradient(160deg, rgba(11, 18, 32, 0.92) 0%, rgba(17, 24, 39, 0.95) 55%, rgba(15, 23, 42, 0.94) 100%);
          border-radius: 1.15rem;
          border: 1px solid rgba(56, 189, 248, 0.24);
          box-shadow:
            0 26px 55px rgba(2, 6, 23, 0.56),
            0 0 0 1px rgba(15, 23, 42, 0.38) inset;
          padding: 1rem;
          width: 100%;
          max-width: 740px;
          margin-left: auto;
        }
        .hero-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          align-items: start;
          column-gap: 3rem;
          row-gap: 2.5rem;
        }
        .hero-left {
          min-width: 0;
        }
        .hero-right {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
        }
        .detection-screen {
          position: relative;
          min-height: 410px;
          border-radius: 0.85rem;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(3, 7, 18, 0.48), rgba(2, 6, 23, 0.78)),
            linear-gradient(130deg, rgba(2, 132, 199, 0.16), rgba(15, 23, 42, 0.05)),
            url('/hero-detection-bg.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        .social-proof-wrap {
          margin-top: 2.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(100, 116, 139, 0.3);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .stat-card {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(100, 116, 139, 0.25);
          border-radius: 0.85rem;
          padding: 0.85rem 0.95rem;
          height: 100%;
        }
        .stat-value {
          font-size: clamp(1.45rem, 2.2vw, 2rem);
          font-weight: 800;
          color: #67e8f9;
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .stat-label {
          margin-top: 0.35rem;
          font-size: 0.87rem;
          color: rgba(241, 245, 249, 0.92);
        }
        .trusted-row {
          margin-top: 1rem;
          position: relative;
          --belt-speed: 18s;
          overflow: hidden;
          border: 1px solid rgba(71, 85, 105, 0.55);
          border-radius: 1rem;
          background:
            linear-gradient(180deg, rgba(51, 65, 85, 0.35), rgba(15, 23, 42, 0.25) 26%, rgba(2, 6, 23, 0.45) 100%);
          box-shadow:
            inset 0 10px 18px rgba(148, 163, 184, 0.08),
            inset 0 -12px 20px rgba(2, 6, 23, 0.65),
            0 12px 26px rgba(2, 6, 23, 0.35);
          min-height: 118px;
          display: flex;
          align-items: center;
          padding: 1.2rem 0;
        }
        .trusted-row::before,
        .trusted-row::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
        }
        .trusted-row::before {
          background:
            linear-gradient(90deg, rgba(4, 9, 24, 0.97) 0%, rgba(4, 9, 24, 0) 10%),
            linear-gradient(270deg, rgba(4, 9, 24, 0.97) 0%, rgba(4, 9, 24, 0) 10%);
        }
        .trusted-row::after {
          inset: 10px 0;
          border-top: 2px solid rgba(148, 163, 184, 0.35);
          border-bottom: 2px solid rgba(30, 41, 59, 0.92);
          box-shadow: inset 0 1px 0 rgba(226, 232, 240, 0.08), inset 0 -1px 0 rgba(2, 6, 23, 0.84);
        }
        .trusted-row .belt-texture {
          position: absolute;
          inset: 12px 0;
          z-index: 0;
          background:
            linear-gradient(180deg, rgba(148, 163, 184, 0.12), rgba(15, 23, 42, 0.08) 28%, rgba(2, 6, 23, 0.34) 100%),
            repeating-linear-gradient(
              90deg,
              rgba(71, 85, 105, 0.28) 0px,
              rgba(71, 85, 105, 0.28) 18px,
              rgba(30, 41, 59, 0.68) 18px,
              rgba(30, 41, 59, 0.68) 36px
            );
          transform: perspective(520px) rotateX(16deg) scaleY(1.08);
          transform-origin: center;
          animation: beltTextureMove var(--belt-speed, 18s) linear infinite;
          opacity: 0.9;
          box-shadow:
            inset 0 12px 18px rgba(148, 163, 184, 0.08),
            inset 0 -14px 20px rgba(2, 6, 23, 0.66);
        }
        .trusted-row .belt-rollers-bottom {
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 6px;
          height: 10px;
          z-index: 1;
          opacity: 0.62;
          background-image: radial-gradient(
            circle,
            rgba(148, 163, 184, 0.52) 0 27%,
            rgba(71, 85, 105, 0.95) 28% 62%,
            rgba(15, 23, 42, 0.98) 63% 100%
          );
          background-size: 18px 10px;
          background-repeat: repeat-x;
          animation: beltRollersMove var(--belt-speed, 18s) linear infinite;
        }
        .trusted-track {
          position: relative;
          z-index: 1;
          display: flex;
          width: max-content;
          align-items: center;
          gap: 1.4rem;
          padding: 0 0.75rem;
          animation: conveyorLogosMove var(--belt-speed, 18s) linear infinite;
        }
        .trusted-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 84px;
          height: 84px;
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
          position: relative;
          animation: logoBob 2.8s ease-in-out infinite;
          animation-delay: var(--bob-delay, 0s);
          will-change: transform;
        }
        .trusted-pill::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 56px;
          height: 10px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(2, 6, 23, 0.5) 0%, rgba(2, 6, 23, 0.04) 72%);
          filter: blur(0.4px);
          opacity: 0.55;
          animation: logoShadow 2.8s ease-in-out infinite;
          animation-delay: var(--bob-delay, 0s);
        }
        .trusted-logo {
          width: 74px;
          height: 74px;
          object-fit: contain;
          border-radius: 0;
          background: transparent;
          padding: 0;
          filter: none;
          opacity: 1;
          transform: translateZ(0);
          filter: drop-shadow(0 3px 4px rgba(2, 6, 23, 0.45));
        }
        .trusted-logo.is-white {
          filter: brightness(0) invert(1) contrast(1.08) drop-shadow(0 3px 4px rgba(2, 6, 23, 0.45));
          width: 88px;
          height: 88px;
        }
        .automation-story {
          margin-top: 2.25rem;
          border: 1px solid rgba(56, 189, 248, 0.24);
          border-radius: 1rem;
          overflow: hidden;
          background: rgba(2, 6, 23, 0.65);
          box-shadow: 0 18px 38px rgba(2, 6, 23, 0.42);
          position: relative;
        }
        .automation-story-video {
          width: 100%;
          min-height: 320px;
          max-height: 420px;
          object-fit: cover;
          display: block;
          filter: saturate(0.95) contrast(1.04);
        }
        .automation-story-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(2, 6, 23, 0.22) 0%, rgba(2, 6, 23, 0.76) 72%, rgba(2, 6, 23, 0.92) 100%),
            linear-gradient(120deg, rgba(14, 165, 233, 0.18), rgba(59, 130, 246, 0.08));
          display: flex;
          align-items: flex-end;
        }
        .automation-story-content {
          max-width: 62ch;
          padding: 1.2rem 1.35rem 1.3rem;
        }
        .automation-story-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.58rem;
          border-radius: 999px;
          border: 1px solid rgba(103, 232, 249, 0.45);
          background: rgba(8, 47, 73, 0.44);
          color: #a5f3fc;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          margin-bottom: 0.55rem;
        }
        .automation-story-title {
          margin: 0;
          font-size: clamp(1.2rem, 2.1vw, 1.8rem);
          line-height: 1.2;
          color: #f8fafc;
        }
        .automation-story-subtext {
          margin-top: 0.55rem;
          margin-bottom: 0;
          color: rgba(226, 232, 240, 0.95);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .workflow-flow-section {
          margin-top: 2.25rem;
          padding: 1.25rem;
          border-radius: 1rem;
          border: 1px solid rgba(100, 116, 139, 0.32);
          background: rgba(2, 6, 23, 0.42);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .workflow-flow-section.step-1-active {
          background:
            linear-gradient(180deg, rgba(2, 6, 23, 0.78) 0%, rgba(2, 6, 23, 0.68) 100%),
            url('/upload_dataset.png');
        }
        .workflow-flow-section.step-2-active {
          background:
            linear-gradient(180deg, rgba(2, 6, 23, 0.78) 0%, rgba(2, 6, 23, 0.68) 100%),
            url('/annotate.png');
        }
        .workflow-flow-section.step-3-active {
          background:
            linear-gradient(180deg, rgba(2, 6, 23, 0.78) 0%, rgba(2, 6, 23, 0.68) 100%),
            url('/model.png');
        }
        .workflow-flow-section.step-4-active {
          background:
            linear-gradient(180deg, rgba(2, 6, 23, 0.78) 0%, rgba(2, 6, 23, 0.68) 100%),
            url('/inference.png');
        }
        .workflow-flow-heading {
          font-size: clamp(1.45rem, 2.5vw, 2.05rem);
          color: #f8fafc;
          margin-bottom: 0.35rem;
        }
        .workflow-flow-subheading {
          margin-bottom: 1.25rem;
          color: rgba(203, 213, 225, 0.92);
          font-size: 0.95rem;
        }
        .workflow-flow-track {
          --flow-card-top: 14px;
          --flow-card-height: 175px;
          position: relative;
          height: 245px;
          margin-top: 0.2rem;
        }
        .workflow-flow-node {
          position: absolute;
          top: var(--flow-card-top);
          left: 50%;
          width: clamp(190px, 19vw, 235px);
          border: 1px solid rgba(100, 116, 139, 0.35);
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.55);
          padding: 0.72rem 0.9rem 0.8rem;
          color: #e2e8f0;
          min-height: var(--flow-card-height);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition: transform 0.32s ease, opacity 0.32s ease, border-color 0.25s ease, background 0.25s ease;
          will-change: transform, opacity;
        }
        .workflow-flow-node.active {
          border-color: rgba(245, 158, 11, 0.9);
          background: linear-gradient(180deg, rgba(245, 158, 11, 0.2), rgba(120, 53, 15, 0.75));
          box-shadow: 0 10px 22px rgba(2, 6, 23, 0.34);
        }
        .workflow-flow-step {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #67e8f9;
          font-weight: 700;
          margin-bottom: 0.24rem;
          margin-top: 0.2rem;
        }
        .workflow-flow-title {
          margin: 0;
          font-weight: 700;
          font-size: 0.95rem;
          color: #f8fafc;
        }
        .workflow-flow-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e2e8f0;
          margin-bottom: 0.7rem;
          opacity: 0.92;
          transform: translateY(-2px);
        }
        .workflow-flow-icon svg {
          width: 44px;
          height: 44px;
        }
        .workflow-flow-node.active .workflow-flow-icon {
          color: #ffffff;
          opacity: 1;
        }
        .workflow-flow-controls {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 5;
        }
        .workflow-flow-btn {
          pointer-events: auto;
          position: absolute;
          top: calc(var(--flow-card-top) + (var(--flow-card-height) / 2));
          border: none;
          background: transparent;
          color: rgba(241, 245, 249, 0.98);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 2.6rem;
          line-height: 1;
          padding: 0.2rem 0.35rem;
          font-weight: 700;
          text-shadow: 0 2px 10px rgba(2, 6, 23, 0.5);
          transform: translate(-50%, -50%);
          transition: color 0.2s ease;
        }
        .workflow-flow-btn.prev {
          left: calc(50% - clamp(95px, 9.5vw, 118px) - 22px);
        }
        .workflow-flow-btn.next {
          left: calc(50% + clamp(95px, 9.5vw, 118px) + 22px);
        }
        .workflow-flow-btn:hover {
          color: #ffffff;
        }
        .workflow-flow-track-mobile {
          display: none;
        }
        .industry-section {
          margin-top: 3.1rem;
          padding: 0.45rem 0 0.6rem;
          border: none;
          border-radius: 0;
          background: transparent;
        }
        .industry-heading {
          margin: 0;
          font-size: clamp(1.4rem, 2.3vw, 1.95rem);
          color: #f8fafc;
          text-align: center;
        }
        .industry-subheading {
          margin: 0.42rem 0 1rem;
          color: rgba(203, 213, 225, 0.92);
          font-size: 0.95rem;
          text-align: center;
        }
        .industry-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.35rem;
          justify-content: center;
        }
        .industry-tab {
          border: 1px solid rgba(100, 116, 139, 0.45);
          background: rgba(15, 23, 42, 0.6);
          color: rgba(226, 232, 240, 0.95);
          border-radius: 999px;
          padding: 0.38rem 0.82rem;
          font-size: 0.84rem;
          font-weight: 600;
          transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .industry-tab.active {
          border-color: rgba(34, 211, 238, 0.75);
          background: rgba(8, 47, 73, 0.52);
          color: #cffafe;
        }
        .industry-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 1rem;
          align-items: stretch;
        }
        .industry-showcase-wrap {
          display: flex;
          justify-content: center;
          align-items: stretch;
        }
        .industry-showcase-card {
          width: min(100%, 360px);
          min-height: 238px;
          border: 1px solid rgba(100, 116, 139, 0.45);
          border-radius: 0.95rem;
          background:
            linear-gradient(180deg, rgba(2, 6, 23, 0.35), rgba(2, 6, 23, 0.72)),
            linear-gradient(120deg, rgba(56, 189, 248, 0.16), rgba(30, 41, 59, 0.45));
          box-shadow: 0 14px 28px rgba(2, 6, 23, 0.3);
          padding: 1rem 1rem 1.05rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          text-align: center;
        }
        .industry-showcase-eyebrow {
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 700;
          color: #67e8f9;
          margin-bottom: 0.3rem;
        }
        .industry-showcase-title {
          margin: 0;
          color: #f8fafc;
          font-size: 1.2rem;
          font-weight: 800;
        }
        .industry-description-title {
          margin: 0;
          font-size: 1.03rem;
          font-weight: 700;
          color: #f8fafc;
        }
        .industry-description-subtext {
          margin: 0.35rem 0 0.7rem;
          color: rgba(203, 213, 225, 0.92);
          font-size: 0.9rem;
        }
        .industry-usecase-list {
          margin: 0;
          padding-left: 0;
          display: grid;
          gap: 0.48rem;
          list-style-position: inside;
        }
        .industry-usecase-item-title {
          color: #f8fafc;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .industry-preview {
          border: 1px solid rgba(100, 116, 139, 0.38);
          border-radius: 0.95rem;
          background:
            radial-gradient(130% 95% at 100% 0%, rgba(14, 165, 233, 0.15), rgba(15, 23, 42, 0) 55%),
            rgba(15, 23, 42, 0.65);
          padding: 0.9rem 0.95rem;
          min-height: 238px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }
        .industry-preview-summary {
          margin: 0;
          color: rgba(226, 232, 240, 0.96);
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .industry-kpi-list {
          margin: 0.75rem 0 0;
          padding-left: 0;
          display: grid;
          gap: 0.36rem;
          color: rgba(207, 250, 254, 0.96);
          font-size: 0.84rem;
          list-style-position: inside;
        }
        .landing-footer {
          margin-top: 3rem;
          border-top: none;
          background: rgba(3, 12, 33, 0.94);
          border-radius: 1rem 1rem 0 0;
          padding: 2.35rem 1.2rem 1.35rem;
          margin-bottom: 0;
        }
        .footer-brand {
          color: #f8fafc;
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 0.65rem;
          letter-spacing: 0.01em;
        }
        .footer-description {
          color: rgba(203, 213, 225, 0.88);
          font-size: 0.88rem;
          max-width: 38ch;
          margin-bottom: 0;
        }
        .footer-col-title {
          color: #f8fafc;
          font-size: 0.88rem;
          font-weight: 700;
          margin-bottom: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.45rem;
        }
        .footer-link {
          color: rgba(203, 213, 225, 0.88);
          font-size: 0.86rem;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-link:hover {
          color: #67e8f9;
        }
        .footer-request-title {
          color: #f8fafc;
          font-size: clamp(1.3rem, 2.1vw, 1.75rem);
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 0.8rem;
        }
        .footer-request-subtitle {
          margin-bottom: 0.65rem;
          color: rgba(148, 163, 184, 0.95);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .footer-request-form {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid rgba(100, 116, 139, 0.5);
          border-radius: 999px;
          padding: 0.25rem 0.25rem 0.25rem 0.9rem;
          background: rgba(15, 23, 42, 0.88);
          max-width: 390px;
        }
        .footer-request-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e2e8f0;
          font-size: 0.86rem;
        }
        .footer-request-input::placeholder {
          color: rgba(148, 163, 184, 0.82);
        }
        .footer-request-btn {
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: linear-gradient(135deg, #f97316, #fb923c);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          line-height: 1;
        }
        .footer-bottom {
          margin-top: 1.35rem;
          padding-top: 0.85rem;
          border-top: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          flex-wrap: wrap;
          color: rgba(148, 163, 184, 0.86);
          font-size: 0.8rem;
        }
        .footer-bottom-links {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }
        .footer-signature-strip {
          position: relative;
          margin-top: 0;
          border-top: none;
          background: rgba(3, 12, 33, 0.94);
          overflow: hidden;
        }
        .footer-signature-word {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 18px;
          width: 100%;
          margin: 0;
          text-align: center;
          font-size: clamp(5rem, 22vw, 13.5rem);
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 0.8;
          text-transform: lowercase;
          color: rgba(56, 189, 248, 0.12);
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
        }
        .footer-signature-slab {
          position: relative;
          z-index: 1;
          margin-top: 138px;
          background: rgba(3, 12, 33, 0.94);
          border-top: none;
          padding: 1.15rem 0.9rem 1.2rem;
        }
        .footer-signature-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          flex-wrap: wrap;
          color: rgba(226, 232, 240, 0.82);
          font-size: 0.8rem;
          width: 100%;
          padding-inline: clamp(1rem, 4vw, 4rem);
          transform: translateY(-3px);
        }
        .footer-top-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 1fr);
          gap: 1.4rem;
          align-items: start;
        }
        .footer-nav-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .footer-cta-col {
          justify-self: end;
          width: min(100%, 390px);
        }
        .floating-camera-wrap {
          position: absolute;
          right: 22px;
          top: calc(100% + 12px);
          transform: none;
          width: 140px;
          height: 140px;
          z-index: 60;
          pointer-events: none;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .floating-camera-canvas {
          width: 100%;
          height: 100%;
        }
        @keyframes conveyorLogosMove {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(0%); }
        }
        @keyframes beltTextureMove {
          0% { background-position-x: -540px; }
          100% { background-position-x: 0; }
        }
        @keyframes beltRollersMove {
          0% { background-position-x: -540px; }
          100% { background-position-x: 0; }
        }
        @keyframes logoBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes logoShadow {
          0%, 100% { opacity: 0.58; transform: translateX(-50%) scaleX(1); }
          50% { opacity: 0.42; transform: translateX(-50%) scaleX(0.88); }
        }
        .bbox {
          position: absolute;
          border: 2px solid #22d3ee;
          border-radius: 0.5rem;
          box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.25), 0 0 18px rgba(34, 211, 238, 0.18);
          background: rgba(34, 211, 238, 0.05);
          opacity: 0.2;
          transform: scale(0.985);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .bbox.active {
          opacity: 1;
          transform: scale(1);
          animation: bboxPulse 1.1s ease-in-out infinite;
        }
        .bbox-label {
          position: absolute;
          top: -28px;
          left: 0;
          padding: 0.15rem 0.5rem;
          border-radius: 0.4rem;
          font-size: 0.72rem;
          letter-spacing: 0.01em;
          background: rgba(6, 182, 212, 0.92);
          color: #05222c;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0.45;
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .bbox.active .bbox-label {
          opacity: 1;
          transform: translateY(-1px);
        }
        .live-badge {
          animation: pulseLive 1.8s ease-in-out infinite;
        }
        @keyframes bboxPulse {
          0%, 100% {
            box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.35), 0 0 14px rgba(34, 211, 238, 0.25);
          }
          50% {
            box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.5), 0 0 24px rgba(34, 211, 238, 0.42);
          }
        }
        @keyframes pulseLive {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @media (max-width: 991.98px) {
          .hero-layout {
            grid-template-columns: 1fr;
          }
          .hero-title {
            max-width: 100%;
            font-size: clamp(2rem, 8.2vw, 3rem);
          }
          .hero-cta-row > * + * {
            margin-left: 0;
          }
          .detection-screen {
            min-height: 340px;
          }
          .preview-shell {
            margin-left: 0;
            max-width: 100%;
          }
          .social-proof-wrap {
            margin-top: 2.8rem;
          }
          .automation-story-content {
            padding: 1rem;
          }
          .automation-story-video {
            min-height: 280px;
          }
          .automation-story-title {
            font-size: clamp(1.05rem, 4.9vw, 1.45rem);
          }
          .workflow-flow-section {
            padding: 1rem;
          }
          .workflow-flow-track {
            display: none;
          }
          .workflow-flow-track-mobile {
            display: flex;
            gap: 0.55rem;
            overflow-x: auto;
            padding-bottom: 0.35rem;
            scrollbar-width: thin;
          }
          .workflow-flow-track-mobile .workflow-flow-node {
            position: static;
            transform: none !important;
            opacity: 1 !important;
            width: 210px;
            min-height: 150px;
            flex: 0 0 auto;
          }
          .workflow-flow-track-mobile .workflow-flow-node.active {
            border-color: rgba(34, 211, 238, 0.82);
            background: linear-gradient(120deg, rgba(6, 182, 212, 0.17), rgba(15, 23, 42, 0.72) 52%);
            box-shadow: none;
          }
          .industry-section {
            padding: 1rem;
          }
          .industry-tabs {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 0.25rem;
          }
          .industry-layout {
            grid-template-columns: 1fr;
            gap: 0.85rem;
          }
          .landing-footer {
            padding: 1.35rem 1rem 0.9rem;
          }
          .footer-top-grid {
            grid-template-columns: 1fr;
            gap: 1.2rem;
          }
          .footer-nav-columns {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .footer-cta-col {
            justify-self: start;
            width: 100%;
          }
          .footer-request-form {
            max-width: 100%;
          }
          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
          .footer-signature-strip {
            margin-top: 0;
          }
          .footer-signature-word {
            bottom: 20px;
            font-size: clamp(3.7rem, 24vw, 7.3rem);
          }
          .footer-signature-slab {
            margin-top: 94px;
            padding: 0.95rem 1rem 1.05rem;
          }
          .footer-signature-content {
            flex-direction: column;
            align-items: flex-start;
            padding-inline: 0.2rem;
          }
          .floating-camera-wrap {
            display: none;
          }
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <nav className="navbar navbar-expand-lg bg-transparent">
        <div className="container py-2">
          <span className="navbar-brand fw-bold fs-3 brand-visible">VisionM</span>
        </div>
      </nav>

      <motion.section
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
        className="container-fluid"
      >
        <div className="container py-5 py-lg-5">
          <div className="hero-layout">
            <div className="hero-left">
              <p className="hero-eyebrow mb-3">AUTOMATED VISUAL INSPECTION SYSTEM</p>

              <h1 className="display-3 fw-bold hero-title mb-4">
                Stop Defects Before They Reach Your Customer
              </h1>

              <p className="fs-5 hero-subtitle mb-4 mb-lg-5">
                Automatically detect product defects in real time using AI-powered vision - faster,
                more accurate, and consistent than manual inspection.
              </p>

              <div className="d-flex flex-wrap align-items-center hero-cta-row">
                <Button
                  size="lg"
                  className="btn btn-cyan-primary px-4 py-3 fw-semibold"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  See Live Demo
                </Button>
                <Button
                  size="lg"
                  className="btn btn-cyan-outline px-4 py-3 fw-semibold"
                  onClick={() => navigate("/auth")}
                >
                  How It Works
                </Button>
              </div>
            </div>

            <div className="hero-right">
              <div className="preview-shell">
                <div className="d-flex justify-content-between align-items-center px-1 mb-3">
                  <span className="text-secondary small fw-semibold">Edge Camera Stream</span>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge rounded-pill bg-success live-badge">LIVE</span>
                    <span className="badge rounded-pill bg-info text-dark fw-semibold">15 FPS</span>
                  </div>
                </div>

                <div className="detection-screen">
                  <div
                    className={`bbox ${activeBoxIndex === 0 ? "active" : ""}`}
                    style={{ top: "18%", left: "14%", width: "29%", height: "24%" }}
                  >
                    <span className="bbox-label">Missing Screw - {confidences[0]}%</span>
                  </div>
                  <div
                    className={`bbox ${activeBoxIndex === 1 ? "active" : ""}`}
                    style={{ top: "52%", left: "50%", width: "32%", height: "30%" }}
                  >
                    <span className="bbox-label">Clamp Defect - {confidences[1]}%</span>
                  </div>
                  <div
                    className={`bbox ${activeBoxIndex === 2 ? "active" : ""}`}
                    style={{ top: "28%", left: "62%", width: "20%", height: "18%" }}
                  >
                    <span className="bbox-label">Surface Crack - {confidences[2]}%</span>
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-3 px-1 small text-secondary">
                  <span>Model: visionm-inspector-v3</span>
                  <span>Device: Jetson Nano</span>
                </div>
              </div>
            </div>
          </div>

          <div className="social-proof-wrap">
            <div className="stats-grid">
              {performanceStats.map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <p className="small text-light-emphasis mt-4 mb-2">Trusted by industrial teams worldwide</p>
            <div className="trusted-row">
              <div className="belt-texture" />
              <div className="belt-rollers-bottom" />
              <div className="trusted-track">
                {[...trustedCompanies, ...trustedCompanies, ...trustedCompanies, ...trustedCompanies].map((company, index) => (
                  <span
                    className="trusted-pill"
                    key={`${company.name}-${index}`}
                    style={{ ["--bob-delay" as string]: `${(index % trustedCompanies.length) * 0.16}s` }}
                  >
                    <img
                      className={`trusted-logo ${company.logo === "/logos/company-1.png" ? "is-white" : ""}`}
                      src={company.logo}
                      alt={`${company.name} logo`}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <section className="automation-story" aria-label="VisionM automation story">
            <video
              className="automation-story-video"
              src="/automation_bg.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="automation-story-overlay">
              <div className="automation-story-content">
                <span className="automation-story-badge">VISIONM INTELLIGENCE LAYER</span>
                <h3 className="automation-story-title">
                  From Camera Feed to Defect Decisions in Real Time
                </h3>
                <p className="automation-story-subtext">
                  VisionM helps factories catch defects early, reduce manual inspection load, and keep
                  quality consistent across every shift.
                </p>
              </div>
            </div>
          </section>

          <section
            className={`workflow-flow-section ${activeFlowIndex === 0 ? "step-1-active" : ""} ${activeFlowIndex === 1 ? "step-2-active" : ""} ${activeFlowIndex === 2 ? "step-3-active" : ""} ${activeFlowIndex === 3 ? "step-4-active" : ""}`}
            aria-label="VisionM end-to-end workflow flowchart"
          >
            <h2 className="workflow-flow-heading">{workflowFlowSteps[activeFlowIndex].heading}</h2>
            <p className="workflow-flow-subheading">
              {workflowFlowSteps[activeFlowIndex].description}
            </p>

            <div className="workflow-flow-track" role="list">
              <div className="workflow-flow-controls">
                <button
                  type="button"
                  className="workflow-flow-btn prev"
                  aria-label="Previous workflow step"
                  onClick={() =>
                    setActiveFlowIndex((prev) =>
                      prev === 0 ? workflowFlowSteps.length - 1 : prev - 1
                    )
                  }
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  className="workflow-flow-btn next"
                  aria-label="Next workflow step"
                  onClick={() =>
                    setActiveFlowIndex((prev) =>
                      prev === workflowFlowSteps.length - 1 ? 0 : prev + 1
                    )
                  }
                >
                  &#8250;
                </button>
              </div>

              {workflowFlowSteps.map((step, index) => {
                if (index !== activeFlowIndex) return null;

                return (
                  <button
                    type="button"
                    key={step.title}
                    role="listitem"
                    className={`workflow-flow-node ${index === activeFlowIndex ? "active" : ""}`}
                    style={{
                      transform: "translateX(-50%) scale(1)",
                      opacity: 1,
                      zIndex: 30,
                    }}
                    onClick={() => setActiveFlowIndex(index)}
                  >
                    <div className="workflow-flow-step">Step {index + 1}</div>
                    {step.icon ? (
                      <div className="workflow-flow-icon">
                        {step.icon === "upload" ? <UploadStepIcon /> : null}
                        {step.icon === "annotate" ? <AnnotateStepIcon /> : null}
                        {step.icon === "brain" ? <FaBrain aria-hidden="true" /> : null}
                        {step.icon === "inference" ? <FaSearch aria-hidden="true" /> : null}
                      </div>
                    ) : null}
                    <p className="workflow-flow-title">{step.title}</p>
                  </button>
                );
              })}
            </div>

            <div className="workflow-flow-track-mobile" role="list">
              {workflowFlowSteps.map((step, index) => (
                index === activeFlowIndex ? (
                <button
                  type="button"
                  key={`${step.title}-mobile`}
                  role="listitem"
                  className={`workflow-flow-node ${index === activeFlowIndex ? "active" : ""}`}
                  onClick={() => setActiveFlowIndex(index)}
                >
                  <div className="workflow-flow-step">Step {index + 1}</div>
                  {step.icon ? (
                    <div className="workflow-flow-icon">
                      {step.icon === "upload" ? <UploadStepIcon /> : null}
                      {step.icon === "annotate" ? <AnnotateStepIcon /> : null}
                      {step.icon === "brain" ? <FaBrain aria-hidden="true" /> : null}
                      {step.icon === "inference" ? <FaSearch aria-hidden="true" /> : null}
                    </div>
                  ) : null}
                  <p className="workflow-flow-title">{step.title}</p>
                </button>
                ) : null
              ))}
            </div>
          </section>

          <section className="industry-section" aria-label="Industries and use cases">
            <h2 className="industry-heading">Industries & Use Cases We Support</h2>
            <p className="industry-subheading">
              VisionM adapts to different production environments with targeted inspection workflows.
            </p>

            <div className="industry-tabs" role="tablist" aria-label="Industry selector">
              {industryShowcases.map((industry, index) => (
                <button
                  key={industry.name}
                  type="button"
                  role="tab"
                  aria-selected={activeIndustryIndex === index}
                  className={`industry-tab ${activeIndustryIndex === index ? "active" : ""}`}
                  onClick={() => setActiveIndustryIndex(index)}
                >
                  {industry.name}
                </button>
              ))}
            </div>

            <motion.div
              key={industryShowcases[activeIndustryIndex].name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="industry-layout"
            >
              <div className="industry-showcase-wrap">
                <article
                  className="industry-showcase-card"
                  style={
                    industryShowcases[activeIndustryIndex].image
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.38), rgba(2, 6, 23, 0.78)), url('${industryShowcases[activeIndustryIndex].image}')`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : undefined
                  }
                >
                  <div className="industry-showcase-eyebrow">Industry Focus</div>
                  <h3 className="industry-showcase-title">
                    {industryShowcases[activeIndustryIndex].name}
                  </h3>
                </article>
              </div>

              <aside className="industry-preview">
                <h3 className="industry-description-title">
                  {industryShowcases[activeIndustryIndex].name} Use Cases
                </h3>
                <p className="industry-description-subtext">
                  {industryShowcases[activeIndustryIndex].summary}
                </p>
                <ul className="industry-usecase-list">
                  {industryShowcases[activeIndustryIndex].useCases.map((item) => (
                    <li key={item.title}>
                      <span className="industry-usecase-item-title">{item.title}:</span>{" "}
                      <span className="industry-preview-summary">{item.description}</span>
                    </li>
                  ))}
                </ul>
                <ul className="industry-kpi-list">
                  {industryShowcases[activeIndustryIndex].kpis.map((kpi) => (
                    <li key={kpi}>{kpi}</li>
                  ))}
                </ul>
              </aside>
            </motion.div>
          </section>
        </div>
      </motion.section>

      <div className="floating-camera-wrap" aria-hidden="true">
        <Canvas
          className="floating-camera-canvas"
          camera={{ position: [0, 0, 2.8], fov: 38 }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[3, 3, 5]} intensity={1.2} />
          <directionalLight position={[-3, 2, -4]} intensity={0.55} />
          <Suspense fallback={null}>
            <FloatingCameraModel />
          </Suspense>
        </Canvas>
      </div>

      <footer className="landing-footer" aria-label="Site footer">
        <div className="container">
          <div className="footer-top-grid">
            <div>
              <div className="footer-brand">VisionM</div>
              <p className="footer-description">
                AI visual inspection platform built for industrial quality teams to detect defects,
                classify products, and improve production consistency.
              </p>
            </div>

            <div className="footer-nav-columns">
              <div>
                <h4 className="footer-col-title">Resources</h4>
                <ul className="footer-links">
                  <li><a href="#" className="footer-link">Documentation</a></li>
                  <li><a href="#" className="footer-link">Use Cases</a></li>
                  <li><a href="#" className="footer-link">API Reference</a></li>
                  <li><a href="#" className="footer-link">Support</a></li>
                </ul>
              </div>
              <div>
                <h4 className="footer-col-title">Company</h4>
                <ul className="footer-links">
                  <li><a href="#" className="footer-link">About</a></li>
                  <li><a href="#" className="footer-link">Careers</a></li>
                  <li><a href="#" className="footer-link">Partners</a></li>
                  <li><a href="#" className="footer-link">Contact</a></li>
                </ul>
              </div>
            </div>

            <div className="footer-cta-col">
              <div className="footer-request-subtitle">Demo</div>
              <h4 className="footer-request-title">Request a Demo</h4>
              <form className="footer-request-form" onSubmit={(e) => e.preventDefault()}>
                <input
                  className="footer-request-input"
                  type="email"
                  placeholder="Enter your email"
                  aria-label="Enter your email"
                />
                <button type="submit" className="footer-request-btn" aria-label="Submit request">
                  →
                </button>
              </form>
            </div>
          </div>

        </div>
      </footer>

      <div className="footer-signature-strip" aria-label="VisionM signature strip">
        <p className="footer-signature-word">visionm</p>
        <div className="footer-signature-slab">
          <div className="footer-signature-content">
            <span>© {new Date().getFullYear()} VisionM, All rights reserved.</span>
            <div className="footer-bottom-links">
              <a href="#" className="footer-link">Privacy</a>
              <a href="#" className="footer-link">Terms</a>
              <a href="#" className="footer-link">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

useGLTF.preload("/surveillance_camera.glb");

export default Landing;
