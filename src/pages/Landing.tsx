import { Suspense, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { FaBullseye, FaCalculator, FaCamera, FaChartBar, FaClock, FaCode, FaFileAlt, FaLayerGroup, FaMicrochip, FaPlug, FaRupeeSign, FaShieldAlt } from "react-icons/fa";
import { FaTriangleExclamation } from "react-icons/fa6";
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

const Landing = () => {
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [confidences, setConfidences] = useState([92, 89, 86]);
  const [partsPerHour, setPartsPerHour] = useState(500);
  const [defectRate, setDefectRate] = useState(15);
  const [costPerDefectivePart, setCostPerDefectivePart] = useState(301);
  const industryShowcases = [
    {
      name: "Pharma",
      layout: "metric",
      image: "/industry/pharma.png",
      summary: "Automated inline inspection for blister packs and bottle lines.",
      useCases: [
        {
          title: "Before",
          description: "4.8%",
          tags: ["Defect Escape Rate"],
        },
        {
          title: "After",
          description: "0.6%",
          tags: ["Defect Escape Rate"],
        },
      ],
      kpis: ["Monthly Savings: ₹9.4L/line", "Cut batch holds by 68%", "Improved compliance consistency across shifts"],
      detailNote:
        "Replaced 6 end-of-line inspectors with 4 Vision M cameras. Now catching seal and fill defects earlier to reduce rejected batches.",
    },
    {
      name: "Electronics Assembly",
      layout: "metric",
      image: "/industry/pcb.png",
      summary: "Contract manufacturer workflows optimized with inline AI inspection.",
      useCases: [
        {
          title: "Before",
          description: "12",
          tags: ["QC Staff Per Shift"],
        },
        {
          title: "After",
          description: "2",
          tags: ["QC Staff Per Shift"],
        },
      ],
      kpis: ["Monthly Savings: ₹6.2L/month", "Reduced QC headcount by 83%", "Improved detection rate"],
      detailNote:
        "Automated solder joint inspection and component placement verification. Reduced QC headcount by 83% while improving detection rate.",
    },
    {
      name: "Automotive",
      layout: "metric",
      image: "/industry/automobile.png",
      summary: "Tier-1 production lines with AI inspection across assembly stages.",
      useCases: [
        {
          title: "Before",
          description: "18%",
          tags: ["Return Rate"],
        },
        {
          title: "After",
          description: "2.1%",
          tags: ["Return Rate"],
        },
      ],
      kpis: ["Monthly Savings: ₹12L/month", "Reduced field returns by 88%", "Improved line-level quality consistency"],
      detailNote:
        "Implemented label verification and assembly integrity checks. Eliminated mislabeled products and reduced return-linked losses.",
    },
    {
      name: "Consumer Goods",
      layout: "metric",
      image: "/industry/consumer.png",
      summary: "FMCG Packaging Line",
      useCases: [
        {
          title: "Before",
          description: "18%",
          tags: ["Return Rate"],
        },
        {
          title: "After",
          description: "2.1%",
          tags: ["Return Rate"],
        },
      ],
      kpis: ["Monthly Savings: ₹12L/month", "Reduced return-linked losses", "Improved packaging integrity consistency"],
      detailNote:
        "Implemented label verification and packaging integrity checks. Eliminated mislabeled products reaching retail - previously causing massive returns.",
    },
  ];
  const [activeIndustryIndex, setActiveIndustryIndex] = useState(0);
  const performanceStats = [
    { value: "99.2%", label: "Defect Detection Accuracy" },
    { value: "30%", label: "Faster Inspection Cycle" },
    { value: "₹18Cr+", label: "Saved in Rework" },
    { value: "5", label: "Demos Today" },
  ];
  const trustedCompanies = [
    { name: "NovaForge", logo: "/logos/company-1.png" },
    { name: "SteelAxis", logo: "/logos/company-2.png" },
    { name: "OptiFab", logo: "/logos/company-3.png" },
    { name: "Vertex Manufacturing", logo: "/logos/company-4.png" },
    { name: "AutoCore", logo: "/logos/company-5.png" },
  ];
  const hiddenCostCards = [
    {
      icon: "◉",
      title: "Manual Inspection Misses 30-40%",
      description:
        "Human inspectors catch only 60-70% of surface defects, scratches, and dimensional errors.",
      metric: "65%",
      metricLabel: "Avg. human accuracy",
    },
    {
      icon: "◔",
      title: "Fatigue Errors Spike After 2 Hours",
      description:
        "Inspection accuracy drops sharply as shifts progress, especially on high-volume lines.",
      metric: "45%",
      metricLabel: "Accuracy drop by shift end",
    },
    {
      icon: "⌁",
      title: "High-Volume Lines Can't Scale QC",
      description:
        "Adding more inspectors increases costs linearly while defect escape rates remain high.",
      metric: "3x",
      metricLabel: "Cost to double QC staff",
    },
    {
      icon: "⚠",
      title: "Returns & Rework Eat Margins",
      description:
        "Escaped defects cause customer returns, warranty claims, and expensive rework cycles.",
      metric: "₹4.2L",
      metricLabel: "Avg. monthly loss per line",
    },
  ];
  const visionSystemCards = [
    {
      icon: "camera",
      title: "Vision M Camera Module",
      subtitle: "Industrial-Grade Visual Capture",
      points: ["12MP industrial camera", "60 FPS capture rate", "IP67 enclosure", "Multi-lighting support"],
      idealFor: "Surface inspection, dimension checks, color verification",
    },
    {
      icon: "chip",
      title: "Vision M Edge Processor",
      subtitle: "On-device AI Inference",
      points: ["On-device AI inference", "< 50ms detection latency", "Multi-camera support (up to 4)", "No cloud dependency"],
      idealFor: "High-speed lines, real-time flagging, offline operation",
    },
    {
      icon: "analytics",
      title: "Vision M Analytics Dashboard",
      subtitle: "Actionable Quality Insights",
      points: ["Real-time trend analysis", "Shift-wise reporting", "Defect classification", "Export & compliance reports"],
      idealFor: "Quality managers, compliance audits, continuous improvement",
    },
    {
      icon: "api",
      title: "Vision M Integration Hub",
      subtitle: "Seamless Factory Connectivity",
      points: ["PLC connectivity (Modbus, OPC-UA)", "MES/ERP integration", "REST APIs", "MQTT support"],
      idealFor: "Existing automation ecosystems, data centralization",
    },
  ];
  const visionSystemOverviewCards = [
    {
      icon: "camera",
      title: "AI-Powered Camera Modules",
      description:
        "Industrial-grade 12MP cameras with 60 FPS capture for high-speed line integration.",
    },
    {
      icon: "edge",
      title: "Edge Processing Unit",
      description:
        "On-device AI inference with <50ms latency - no cloud dependency, instant decisions.",
    },
    {
      icon: "analytics",
      title: "Analytics Dashboard",
      description:
        "Real-time defect trends, shift-wise reports, and defect classification insights.",
    },
    {
      icon: "api",
      title: "Integration APIs",
      description:
        "PLC connectivity, MES/ERP integration, and REST APIs for seamless automation.",
    },
  ];
  const visionSystemComparisonRows = [
    {
      feature: "Defect Detection",
      visionM: "Real-time flagging at 500+ parts/min",
      manualQc: "End-of-line sampling (1-5%)",
    },
    {
      feature: "Accuracy",
      visionM: "99.7% consistent accuracy",
      manualQc: "65% (drops with fatigue)",
    },
    {
      feature: "Availability",
      visionM: "24/7 consistent performance",
      manualQc: "8-hour shifts, fatigue-prone",
    },
    {
      feature: "Records",
      visionM: "Digital records, auto-archived",
      manualQc: "Paper checklists, manual entry",
    },
    {
      feature: "Scalability",
      visionM: "Add cameras, not headcount",
      manualQc: "Linear cost increase",
    },
    {
      feature: "Response Time",
      visionM: "<50ms detection latency",
      manualQc: "Minutes to hours",
    },
  ];
  const riskFreeCards = [
    {
      icon: "shield",
      title: "Pilot on 1 Line First",
      description: "Start with a single production line. No full-plant commitment until you see results.",
      chip: "Test your most challenging line",
    },
    {
      icon: "target",
      title: "99.5% Accuracy Guarantee",
      description: "If Vision M doesn't hit 99.5% detection accuracy on your line, we optimize for free.",
      chip: "Performance-backed SLA",
    },
    {
      icon: "clock",
      title: "30-Day Performance Trial",
      description: "Full 30 days to validate ROI. No long-term commitment until you're satisfied.",
      chip: "Risk-free evaluation period",
    },
  ];
  const trustStats = [
    { icon: "lines", value: "40+", label: "Production Lines Equipped" },
    { icon: "segments", value: "8", label: "Manufacturing Segments" },
    { icon: "savings", value: "18Cr+", label: "Saved in Rework" },
  ];
  const trustIndustries = [
    "Auto Components",
    "Electronics",
    "Pharma Packaging",
    "Consumer Goods",
    "Textiles",
    "Metal Fabrication",
    "Plastics",
    "Food & Beverage",
  ];
  const resourceCards = [
    {
      icon: "pdf",
      title: "Vision M Product Datasheet",
      description:
        "Complete technical specifications for all 4 modules - cameras, processor, dashboard, and integration hub.",
      cta: "Download PDF",
    },
    {
      icon: "excel",
      title: "ROI Calculator (Excel)",
      description: "Input your line data and get a detailed breakdown of potential savings with Vision M.",
      cta: "Download Excel",
    },
    {
      icon: "guide",
      title: "Integration Guide",
      description: "Technical documentation for PLC, MES, and ERP integration including API references.",
      cta: "Download Guide",
    },
  ];
  const shiftHours = 8;
  const workingDaysPerMonth = 25;
  const manualInspectionAccuracy = 65;

  const monthlyParts = partsPerHour * shiftHours * workingDaysPerMonth;
  const monthlyDefects = Math.round((monthlyParts * defectRate) / 100);
  const missedByManualQc = Math.round(monthlyDefects * (1 - manualInspectionAccuracy / 100));
  const monthlyLoss = missedByManualQc * costPerDefectivePart;

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
        .hero-live-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .hero-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          padding: 0.38rem 0.8rem;
          font-size: 0.83rem;
          font-weight: 700;
          border: 1px solid rgba(56, 189, 248, 0.35);
          background: rgba(8, 47, 73, 0.35);
          color: #a5f3fc;
        }
        .hero-live-pill.is-green {
          border-color: rgba(16, 185, 129, 0.45);
          background: rgba(6, 78, 59, 0.36);
          color: #34d399;
        }
        .hero-main-title {
          margin: 0;
          max-width: 13ch;
          font-size: clamp(2.35rem, 5vw, 4.75rem);
          line-height: 0.98;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .hero-main-title .accent-red {
          color: #ef4444;
        }
        .hero-main-title .accent-cyan {
          color: #22d3ee;
        }
        .hero-main-title .base-light {
          color: #f8fafc;
        }
        .hero-main-copy {
          margin-top: 1rem;
          margin-bottom: 0.95rem;
          max-width: 53ch;
          color: rgba(226, 232, 240, 0.9);
          font-size: clamp(1.01rem, 1.55vw, 1.7rem);
          line-height: 1.38;
        }
        .hero-main-copy .highlight-cyan {
          color: #22d3ee;
          font-weight: 700;
        }
        .hero-warning {
          margin: 0 0 1rem;
          border: 1px solid rgba(239, 68, 68, 0.45);
          border-radius: 0.7rem;
          background: rgba(127, 29, 29, 0.15);
          color: #fca5a5;
          padding: 0.62rem 0.8rem;
          font-size: 0.9rem;
        }
        .hero-warning strong {
          color: #f87171;
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
          flex-direction: column;
          align-items: flex-end;
          gap: 0.85rem;
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
        .hidden-cost-section {
          margin-top: 2rem;
          border: none;
          border-radius: 0;
          background: transparent;
          padding: 0.45rem 0 0.2rem;
        }
        .hidden-cost-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(239, 68, 68, 0.36);
          background: rgba(127, 29, 29, 0.2);
          color: #f87171;
          padding: 0.22rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .hidden-cost-title {
          margin: 0.65rem 0 0.45rem;
          font-size: clamp(1.55rem, 3vw, 2.45rem);
          font-weight: 800;
          color: #f8fafc;
          text-align: center;
        }
        .hidden-cost-title .accent-red {
          color: #ef4444;
        }
        .hidden-cost-subtitle {
          margin: 0 0 1.6rem;
          text-align: center;
          color: rgba(203, 213, 225, 0.9);
          font-size: 0.95rem;
        }
        .hidden-cost-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
        }
        .hidden-cost-card {
          border: 1px solid rgba(100, 116, 139, 0.35);
          border-radius: 0.8rem;
          background: rgba(30, 41, 59, 0.5);
          padding: 0.8rem 0.78rem 0.72rem;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .hidden-cost-card-icon {
          width: 30px;
          height: 30px;
          border-radius: 0.45rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.32);
          background: rgba(127, 29, 29, 0.14);
          margin-bottom: 0.58rem;
          font-size: 0.95rem;
          line-height: 1;
        }
        .hidden-cost-card-icon.is-warning {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.32);
          background: rgba(127, 29, 29, 0.14);
        }
        .hidden-cost-card-title {
          margin: 0;
          color: #f8fafc;
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.35;
        }
        .hidden-cost-card-desc {
          margin: 0.52rem 0 0.72rem;
          color: rgba(203, 213, 225, 0.86);
          font-size: 0.84rem;
          line-height: 1.45;
          border-bottom: 1px solid rgba(100, 116, 139, 0.24);
          padding-bottom: 0.72rem;
        }
        .hidden-cost-card-metric {
          color: #ef4444;
          font-size: 1.7rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .hidden-cost-card-metric-label {
          margin-top: 0.2rem;
          color: rgba(148, 163, 184, 0.9);
          font-size: 0.76rem;
        }
        .defect-loss-card {
          margin: 1.45rem auto 0;
          width: min(100%, 760px);
          border: 1px solid rgba(100, 116, 139, 0.35);
          border-radius: 0.85rem;
          background: rgba(30, 41, 59, 0.72);
          padding: 1rem 1rem 0.9rem;
        }
        .defect-loss-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 0.8rem;
        }
        .defect-loss-head > div {
          text-align: center;
        }
        .defect-loss-title {
          margin: 0;
          color: #f8fafc;
          font-size: 1.05rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .defect-loss-subtitle {
          margin: 0.12rem 0 0;
          color: rgba(203, 213, 225, 0.86);
          font-size: 0.82rem;
        }
        .defect-loss-input-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.7rem;
          margin-bottom: 0.85rem;
        }
        .defect-loss-label {
          display: block;
          margin-bottom: 0.32rem;
          color: rgba(203, 213, 225, 0.88);
          font-size: 0.78rem;
          font-weight: 600;
        }
        .defect-loss-input {
          width: 100%;
          border: 1px solid rgba(100, 116, 139, 0.45);
          border-radius: 0.42rem;
          background: rgba(15, 23, 42, 0.88);
          color: #e2e8f0;
          font-size: 0.9rem;
          padding: 0.42rem 0.5rem;
          outline: none;
        }
        .defect-loss-summary {
          border: 1px solid rgba(127, 29, 29, 0.35);
          border-radius: 0.7rem;
          background: rgba(30, 41, 59, 0.76);
          padding: 0.75rem 0.68rem;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.55rem;
        }
        .defect-loss-metric-label {
          color: rgba(148, 163, 184, 0.9);
          font-size: 0.75rem;
          text-align: center;
        }
        .defect-loss-metric-value {
          margin-top: 0.15rem;
          color: #f8fafc;
          font-size: 1.12rem;
          font-weight: 700;
          text-align: center;
          line-height: 1.1;
        }
        .defect-loss-metric-value.accent-red {
          color: #ef4444;
        }
        .defect-loss-footnote {
          margin-top: 0.72rem;
          margin-bottom: 0;
          text-align: center;
          color: rgba(148, 163, 184, 0.88);
          font-size: 0.72rem;
        }
        .vision-overview-section {
          margin-top: 2.7rem;
          background: #ffffff;
          padding: 4.8rem 0 4.1rem;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          border-left: none;
          border-right: none;
        }
        .vision-overview-inner {
          width: min(1240px, calc(100% - 3rem));
          margin: 0 auto;
        }
        .vision-overview-badge-wrap {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .vision-overview-badge {
          border-radius: 999px;
          border: 1px solid rgba(6, 182, 212, 0.22);
          background: rgba(34, 211, 238, 0.13);
          color: #06b6d4;
          font-size: 0.73rem;
          font-weight: 700;
          padding: 0.28rem 0.8rem;
        }
        .vision-overview-title {
          margin: 1.2rem 0 0.75rem;
          text-align: center;
          color: #0f172a;
          font-size: clamp(2.1rem, 3.6vw, 3.35rem);
          font-weight: 800;
          line-height: 1.15;
        }
        .vision-overview-title .accent {
          color: #06b6d4;
        }
        .vision-overview-subtitle {
          margin: 0 auto;
          max-width: 56ch;
          text-align: center;
          color: #64748b;
          font-size: 1.02rem;
          line-height: 1.5;
        }
        .vision-overview-grid {
          margin-top: 3.1rem;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }
        .vision-overview-card {
          border-radius: 0.6rem;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 0.85rem 0.75rem 0.8rem;
        }
        .vision-overview-icon {
          width: 34px;
          height: 34px;
          border-radius: 0.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(6, 182, 212, 0.24);
          background: rgba(34, 211, 238, 0.12);
          color: #06b6d4;
          font-size: 0.95rem;
          margin-bottom: 0.58rem;
        }
        .vision-overview-card-title {
          margin: 0 0 0.32rem;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.25;
        }
        .vision-overview-card-text {
          margin: 0;
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.45;
        }
        .vision-overview-comparison {
          margin-top: 3.5rem;
        }
        .vision-overview-comparison-title {
          margin: 0;
          text-align: center;
          color: #0f172a;
          font-size: clamp(1.35rem, 3.4vw, 2rem);
          font-weight: 800;
        }
        .vision-overview-comparison-subtitle {
          margin: 0.35rem 0 1.35rem;
          text-align: center;
          color: #64748b;
          font-size: 0.92rem;
        }
        .vision-overview-table-wrap {
          overflow-x: auto;
        }
        .vision-overview-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }
        .vision-overview-table th,
        .vision-overview-table td {
          border-bottom: 1px solid #e2e8f0;
          padding: 0.75rem 0.6rem;
          text-align: left;
          vertical-align: top;
          font-size: 0.88rem;
        }
        .vision-overview-table th {
          color: #64748b;
          font-weight: 700;
          font-size: 0.82rem;
          white-space: nowrap;
        }
        .vision-overview-table td {
          color: #0f172a;
        }
        .vision-overview-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.32rem;
          border-radius: 999px;
          padding: 0.2rem 0.55rem;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .vision-overview-pill.visionm {
          background: rgba(34, 211, 238, 0.12);
          color: #0891b2;
        }
        .vision-overview-pill.manual {
          background: rgba(248, 113, 113, 0.12);
          color: #dc2626;
        }
        .vision-overview-icon-check {
          color: #22c55e;
          font-weight: 700;
          margin-right: 0.38rem;
        }
        .vision-overview-icon-cross {
          color: #ef4444;
          font-weight: 700;
          margin-right: 0.38rem;
        }
        .vision-overview-cta-wrap {
          margin-top: 1.9rem;
          display: flex;
          justify-content: center;
        }
        .vision-overview-cta {
          border: none;
          border-radius: 0.45rem;
          background: linear-gradient(135deg, #06b6d4, #06c3ee);
          color: #042f2e;
          font-size: 0.86rem;
          font-weight: 700;
          padding: 0.62rem 1.1rem;
          box-shadow: 0 10px 20px rgba(6, 182, 212, 0.26);
        }
        .vision-system-section {
          margin-top: 3.4rem;
          background:
            radial-gradient(900px 460px at 50% -10%, rgba(14, 165, 233, 0.12), rgba(2, 6, 23, 0) 65%),
            linear-gradient(180deg, #071124 0%, #0a1528 48%, #0a162a 100%);
          border-top: 1px solid rgba(51, 65, 85, 0.45);
          border-bottom: 1px solid rgba(51, 65, 85, 0.45);
          padding: 3.2rem clamp(1.4rem, 5vw, 5.6rem) 3.6rem;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          border-left: none;
          border-right: none;
        }
        .vision-system-badge-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .vision-system-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0.32rem 0.95rem;
          border: 1px solid rgba(6, 182, 212, 0.28);
          background: rgba(8, 47, 73, 0.62);
          color: #22d3ee;
          font-size: 0.74rem;
          font-weight: 700;
          width: fit-content;
          margin-inline: auto;
          letter-spacing: 0.03em;
        }
        .vision-system-title {
          margin: 1.35rem 0 0.95rem;
          text-align: center;
          font-size: clamp(2rem, 3.8vw, 3.1rem);
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }
        .vision-system-title .accent {
          color: #06b6d4;
        }
        .vision-system-subtitle {
          margin: 0 auto 1.9rem;
          text-align: center;
          color: rgba(203, 213, 225, 0.84);
          font-size: 1rem;
          max-width: 62ch;
        }
        .vision-system-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.15rem;
          margin-bottom: 0;
          max-width: 1220px;
          margin-left: auto;
          margin-right: auto;
        }
        .vision-system-card {
          border: 1px solid rgba(56, 189, 248, 0.24);
          border-radius: 0.8rem;
          background: rgba(11, 23, 41, 0.82);
          overflow: hidden;
          min-height: 360px;
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.4);
        }
        .vision-system-icon-wrap {
          height: 165px;
          border-bottom: 1px solid rgba(71, 85, 105, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(30, 58, 90, 0.42), rgba(15, 23, 42, 0.2));
        }
        .vision-system-icon {
          width: 62px;
          height: 62px;
          border-radius: 0.8rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(8, 47, 73, 0.74);
          border: 1px solid rgba(6, 182, 212, 0.26);
          color: #06b6d4;
          font-size: 1.5rem;
          box-shadow: 0 10px 18px rgba(2, 6, 23, 0.35);
        }
        .vision-system-card-body {
          padding: 1rem 1.05rem 1rem;
        }
        .vision-system-card-title {
          margin: 0;
          color: rgba(148, 163, 184, 0.58);
          font-size: 1.28rem;
          font-weight: 700;
          line-height: 1.35;
        }
        .vision-system-card-subtitle {
          margin: 0.12rem 0 0.42rem;
          color: #06b6d4;
          font-size: 0.98rem;
          font-weight: 700;
        }
        .vision-system-points {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.28rem;
        }
        .vision-system-point {
          color: rgba(148, 163, 184, 0.68);
          font-size: 0.88rem;
        }
        .vision-system-point::before {
          content: "✓";
          color: #06b6d4;
          margin-right: 0.4rem;
          font-weight: 700;
        }
        .vision-system-ideal {
          margin-top: 0.7rem;
          padding-top: 0.65rem;
          border-top: 1px solid rgba(71, 85, 105, 0.38);
        }
        .vision-system-ideal-label {
          color: rgba(148, 163, 184, 0.48);
          font-size: 0.74rem;
          margin: 0;
          text-transform: uppercase;
        }
        .vision-system-ideal-copy {
          margin: 0.18rem 0 0;
          color: rgba(148, 163, 184, 0.56);
          font-size: 0.82rem;
          line-height: 1.4;
        }
        .risk-free-section {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background: #ffffff;
          padding: 5.6rem 0 5.2rem;
          min-height: 88vh;
          display: flex;
          align-items: center;
        }
        .risk-free-inner {
          width: min(1120px, calc(100% - 2rem));
          margin: 0 auto;
        }
        .risk-free-badge-wrap {
          display: flex;
          justify-content: center;
        }
        .risk-free-badge {
          border-radius: 999px;
          border: 1px solid rgba(6, 182, 212, 0.2);
          background: rgba(34, 211, 238, 0.14);
          color: #06b6d4;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 0.28rem 0.8rem;
        }
        .risk-free-title {
          margin: 1rem 0 0.55rem;
          text-align: center;
          color: #0f172a;
          font-size: clamp(2rem, 3.2vw, 3rem);
          font-weight: 800;
        }
        .risk-free-title .accent {
          color: #06b6d4;
        }
        .risk-free-subtitle {
          margin: 0 auto;
          text-align: center;
          max-width: 56ch;
          color: #64748b;
          font-size: 1rem;
          line-height: 1.5;
        }
        .risk-free-grid {
          margin-top: 2.5rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .risk-free-card {
          border: 1px solid #bae6fd;
          border-radius: 0.7rem;
          background: #f0fbff;
          padding: 1.25rem 0.95rem 1.05rem;
          min-height: 250px;
          text-align: center;
        }
        .risk-free-icon {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          border: 1px solid #a5f3fc;
          background: #ccfbf1;
          color: #06b6d4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          margin-bottom: 0.6rem;
        }
        .risk-free-card-title {
          margin: 0 0 0.36rem;
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 700;
        }
        .risk-free-card-text {
          margin: 0;
          color: #64748b;
          font-size: 0.93rem;
          line-height: 1.45;
        }
        .risk-free-chip {
          margin-top: 0.72rem;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          border: 1px solid #a5f3fc;
          background: #cffafe;
          color: #0891b2;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
        }
        .risk-free-commitment {
          margin: 1.75rem auto 0;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          background: #ffffff;
          padding: 0.88rem 1rem;
          text-align: center;
          color: #64748b;
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .risk-free-commitment strong {
          color: #0f172a;
        }
        .trusted-proof-section {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background: #ffffff;
          padding: 4rem 0 4.2rem;
        }
        .trusted-proof-inner {
          width: min(1060px, calc(100% - 2rem));
          margin: 0 auto;
          text-align: center;
        }
        .trusted-proof-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(6, 182, 212, 0.2);
          background: rgba(34, 211, 238, 0.14);
          color: #06b6d4;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 0.28rem 0.8rem;
        }
        .trusted-proof-title {
          margin: 0.9rem 0 0.35rem;
          color: #0f172a;
          font-size: clamp(2rem, 3.4vw, 3.2rem);
          font-weight: 800;
          line-height: 1.15;
        }
        .trusted-proof-title .accent {
          color: #06b6d4;
        }
        .trusted-proof-subtitle {
          margin: 0 auto;
          color: #64748b;
          max-width: 58ch;
          font-size: 1rem;
          line-height: 1.5;
        }
        .trusted-proof-stats {
          margin-top: 2rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .trusted-proof-stat {
          text-align: center;
        }
        .trusted-proof-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 0.55rem;
          border: 1px solid #a5f3fc;
          background: #ecfeff;
          color: #06b6d4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }
        .trusted-proof-stat-value {
          margin-top: 0.38rem;
          color: #0f172a;
          font-size: clamp(1.8rem, 3vw, 2.55rem);
          font-weight: 800;
          line-height: 1.05;
        }
        .trusted-proof-stat-label {
          margin-top: 0.18rem;
          color: #64748b;
          font-size: 0.9rem;
        }
        .trusted-proof-industries-label {
          margin-top: 1.55rem;
          color: #64748b;
          font-size: 0.9rem;
        }
        .trusted-proof-industries {
          margin-top: 0.5rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.45rem;
        }
        .trusted-proof-chip {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          border-radius: 999px;
          padding: 0.28rem 0.68rem;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1;
        }
        .trusted-proof-foot {
          margin-top: 1.35rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .trusted-proof-foot-item {
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: inline-flex;
          gap: 0.28rem;
          align-items: center;
        }
        .trusted-proof-foot-item strong {
          color: #0f172a;
          font-weight: 700;
        }
        .resources-section {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background-color: #040d23;
          background-image: radial-gradient(760px 360px at 50% 0%, rgba(14, 165, 233, 0.12), rgba(2, 6, 23, 0) 60%);
          background-repeat: no-repeat;
          border-top: 1px solid rgba(51, 65, 85, 0.45);
          border-bottom: none;
          padding: 4rem 0 3.6rem;
        }
        .resources-inner {
          width: min(1040px, calc(100% - 2rem));
          margin: 0 auto;
          text-align: center;
        }
        .resources-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(6, 182, 212, 0.28);
          background: rgba(8, 47, 73, 0.62);
          color: #22d3ee;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 0.28rem 0.8rem;
        }
        .resources-title {
          margin: 1rem 0 0.55rem;
          color: #f8fafc;
          font-size: clamp(2rem, 3.2vw, 3rem);
          font-weight: 800;
        }
        .resources-title .accent {
          color: #06b6d4;
        }
        .resources-subtitle {
          margin: 0 auto;
          max-width: 58ch;
          color: rgba(203, 213, 225, 0.86);
          font-size: 1rem;
          line-height: 1.5;
        }
        .resources-grid {
          margin-top: 2rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }
        .resources-card {
          border: 1px solid rgba(71, 85, 105, 0.55);
          border-radius: 0.7rem;
          background: rgba(15, 23, 42, 0.62);
          padding: 0.95rem 0.92rem 0.9rem;
          text-align: left;
          min-height: 180px;
        }
        .resources-icon {
          width: 42px;
          height: 42px;
          border-radius: 0.65rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(8, 47, 73, 0.74);
          border: 1px solid rgba(6, 182, 212, 0.26);
          color: #06b6d4;
          font-size: 1rem;
          margin-bottom: 0.6rem;
        }
        .resources-card-title {
          margin: 0 0 0.35rem;
          color: rgba(148, 163, 184, 0.52);
          font-size: 1.15rem;
          font-weight: 700;
        }
        .resources-card-text {
          margin: 0;
          color: rgba(148, 163, 184, 0.84);
          font-size: 0.86rem;
          line-height: 1.45;
        }
        .resources-card-link {
          margin-top: 0.62rem;
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          color: #06b6d4;
          font-size: 0.83rem;
          font-weight: 700;
          text-decoration: none;
        }
        .resources-note {
          margin-top: 1.45rem;
          color: rgba(148, 163, 184, 0.7);
          font-size: 0.82rem;
        }
        .resources-note-link {
          margin-top: 0.2rem;
          color: #06b6d4;
          font-size: 0.84rem;
          font-weight: 700;
        }
        .hero-report-cta {
          margin-top: 1.1rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.3rem;
        }
        .hero-report-title {
          margin: 0;
          font-size: clamp(1.25rem, 2.2vw, 2rem);
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.15;
        }
        .hero-report-title .highlight {
          background: linear-gradient(135deg, #22d3ee, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-report-subtitle {
          margin: 0;
          color: rgba(148, 163, 184, 0.95);
          font-size: 1.02rem;
        }
        .hero-report-btn {
          margin-top: 0.35rem;
          border: 1px solid rgba(56, 189, 248, 0.5);
          background: rgba(8, 47, 73, 0.45);
          color: #cffafe;
          padding: 0.45rem 0.85rem;
          border-radius: 0.55rem;
          font-weight: 700;
          font-size: 0.9rem;
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
          animation: pulseCta 1.9s ease-in-out infinite;
        }
        .hero-report-btn:hover {
          transform: translateY(-1px);
          background: rgba(8, 47, 73, 0.65);
          border-color: rgba(56, 189, 248, 0.85);
        }
        @keyframes pulseCta {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.38);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 211, 238, 0);
          }
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
          min-height: 320px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          text-align: center;
        }
        .industry-preview-summary {
          margin: 0;
          color: rgba(226, 232, 240, 0.96);
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .industry-metric-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.7rem;
          margin-top: 0.45rem;
        }
        .industry-metric-card {
          border: 1px solid rgba(100, 116, 139, 0.45);
          border-radius: 0.65rem;
          background: rgba(15, 23, 42, 0.72);
          padding: 0.62rem 0.6rem;
          text-align: center;
        }
        .industry-metric-card.after {
          border-color: rgba(34, 211, 238, 0.5);
          background: rgba(8, 47, 73, 0.62);
        }
        .industry-metric-label {
          margin: 0;
          color: rgba(203, 213, 225, 0.9);
          font-size: 0.76rem;
        }
        .industry-metric-value {
          margin: 0.18rem 0 0;
          font-size: 1.55rem;
          line-height: 1.05;
          font-weight: 800;
          color: #f87171;
        }
        .industry-metric-value.after {
          color: #22d3ee;
        }
        .industry-metric-foot {
          margin: 0.2rem 0 0;
          color: rgba(148, 163, 184, 0.95);
          font-size: 0.72rem;
        }
        .industry-savings-bar {
          margin-top: 0.72rem;
          border: 1px solid rgba(34, 211, 238, 0.36);
          border-radius: 0.6rem;
          background: rgba(8, 47, 73, 0.58);
          color: #cffafe;
          text-align: center;
          padding: 0.52rem 0.62rem;
          font-size: 0.92rem;
          font-weight: 700;
        }
        .industry-outcome-line {
          margin: 0.68rem 0 0;
          text-align: center;
          color: rgba(203, 213, 225, 0.94);
          font-size: 0.84rem;
          line-height: 1.35;
        }
        .industry-detail-note {
          margin: auto 0 0;
          padding-top: 0.8rem;
          border-top: 1px solid rgba(100, 116, 139, 0.34);
          text-align: left;
          color: rgba(226, 232, 240, 0.92);
          font-size: 0.9rem;
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
          margin-top: 0;
          border-top: none;
          background: #040d23;
          border-radius: 0;
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
          .hero-live-row {
            gap: 0.55rem;
          }
          .hero-live-pill {
            font-size: 0.75rem;
            padding: 0.3rem 0.66rem;
          }
          .hero-main-title {
            max-width: 100%;
            font-size: clamp(2.05rem, 8.8vw, 3.45rem);
          }
          .hero-main-copy {
            font-size: 1rem;
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
          .hero-right {
            align-items: stretch;
          }
          .social-proof-wrap {
            margin-top: 2.8rem;
          }
          .hidden-cost-section {
            padding: 0.25rem 0 0.35rem;
          }
          .hidden-cost-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
          }
          .defect-loss-card {
            width: 100%;
            padding: 0.9rem 0.85rem 0.8rem;
            margin-top: 1.1rem;
          }
          .defect-loss-input-grid {
            grid-template-columns: 1fr;
            gap: 0.6rem;
          }
          .defect-loss-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .vision-overview-section {
            margin-top: 1.35rem;
            padding: 2.6rem 0 2.3rem;
          }
          .vision-overview-inner {
            width: min(1240px, calc(100% - 1.35rem));
          }
          .vision-overview-grid {
            grid-template-columns: 1fr;
            margin-top: 1.9rem;
          }
          .vision-system-section {
            margin-top: 1.35rem;
            padding: 1.8rem 0.95rem 2rem;
          }
          .vision-system-grid {
            grid-template-columns: 1fr;
            gap: 0.8rem;
          }
          .risk-free-section {
            min-height: auto;
            display: block;
            padding: 3.1rem 0 2.8rem;
          }
          .risk-free-inner {
            width: min(1120px, calc(100% - 1.1rem));
          }
          .risk-free-grid {
            grid-template-columns: 1fr;
          }
          .trusted-proof-section {
            padding: 2.8rem 0 2.8rem;
          }
          .trusted-proof-inner {
            width: min(1060px, calc(100% - 1.1rem));
          }
          .trusted-proof-stats {
            grid-template-columns: 1fr;
            gap: 0.9rem;
          }
          .resources-section {
            padding: 2.8rem 0 2.6rem;
          }
          .resources-inner {
            width: min(1040px, calc(100% - 1.1rem));
          }
          .resources-grid {
            grid-template-columns: 1fr;
          }
          .hidden-cost-title {
            font-size: clamp(1.3rem, 6.1vw, 1.9rem);
          }
          .hidden-cost-subtitle {
            font-size: 0.9rem;
          }
          .hero-report-cta {
            margin-top: 1.35rem;
          }
          .hero-report-title {
            font-size: clamp(1.1rem, 5.8vw, 1.6rem);
          }
          .hero-report-subtitle {
            font-size: 0.95rem;
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
        <div className="container pt-5 pb-0 pt-lg-5 pb-lg-0">
          <div className="hero-layout">
            <div className="hero-left">
              <div className="hero-live-row">
                <span className="hero-live-pill is-green">● ⚡ LIVE: 5 plants evaluating now</span>
                <span className="hero-live-pill">● ◔ Only 3 pilot slots left in Q1</span>
              </div>

              <h1 className="hero-main-title">
                <span className="accent-red">Stop Losing 3-5% Revenue</span>
                <br />
                <span className="base-light">to </span>
                <span className="accent-cyan">Undetected Defects</span>
              </h1>

              <p className="hero-main-copy">
                Vision M detects surface cracks, dimensional errors, and assembly flaws at{" "}
                <span className="highlight-cyan">500+ parts/minute</span> - trusted by 40+ Indian
                manufacturing lines.
              </p>

              <p className="hero-warning">
                <strong>Warning:</strong> Every day without automated inspection costs your line an
                average of 2.8% in rework and returns.
              </p>

              <div className="hero-report-cta">
                <h3 className="hero-report-title">
                  Get Your <span className="highlight">Free Defect Cost Report</span>
                </h3>
                <p className="hero-report-subtitle">
                  See your monthly losses from missed defects • No obligation
                </p>
                <button type="button" className="hero-report-btn">Click Here</button>
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

          <section className="hidden-cost-section" aria-label="Hidden cost of manual quality checks">
            <div className="d-flex justify-content-center">
              <span className="hidden-cost-badge">The Hidden Cost of Manual QC</span>
            </div>
            <h2 className="hidden-cost-title">
              Your Production Line is <span className="accent-red">Bleeding Revenue</span>
            </h2>
            <p className="hidden-cost-subtitle">
              Every minute of manual inspection is a minute of missed defects reaching your customers.
            </p>

            <div className="hidden-cost-grid">
              {hiddenCostCards.map((item) => (
                <article key={item.title} className="hidden-cost-card">
                  <span
                    className={`hidden-cost-card-icon ${item.icon === "⚠" ? "is-warning" : ""}`}
                    aria-hidden="true"
                  >
                    {item.icon === "⚠" ? <FaTriangleExclamation /> : item.icon}
                  </span>
                  <h3 className="hidden-cost-card-title">{item.title}</h3>
                  <p className="hidden-cost-card-desc">{item.description}</p>
                  <div className="hidden-cost-card-metric">{item.metric}</div>
                  <div className="hidden-cost-card-metric-label">{item.metricLabel}</div>
                </article>
              ))}
            </div>

            <div className="defect-loss-card">
              <div className="defect-loss-head">
                <div>
                  <h3 className="defect-loss-title">Defect Loss Calculator</h3>
                  <p className="defect-loss-subtitle">See what missed defects are costing you</p>
                </div>
              </div>

              <div className="defect-loss-input-grid">
                <label>
                  <span className="defect-loss-label">Parts Per Hour</span>
                  <input
                    className="defect-loss-input"
                    type="number"
                    min={0}
                    value={partsPerHour}
                    onChange={(e) => setPartsPerHour(Math.max(0, Number(e.target.value) || 0))}
                  />
                </label>
                <label>
                  <span className="defect-loss-label">Defect Rate (%)</span>
                  <input
                    className="defect-loss-input"
                    type="number"
                    min={0}
                    value={defectRate}
                    onChange={(e) => setDefectRate(Math.max(0, Number(e.target.value) || 0))}
                  />
                </label>
                <label>
                  <span className="defect-loss-label">Cost Per Defective Part (₹)</span>
                  <input
                    className="defect-loss-input"
                    type="number"
                    min={0}
                    value={costPerDefectivePart}
                    onChange={(e) => setCostPerDefectivePart(Math.max(0, Number(e.target.value) || 0))}
                  />
                </label>
              </div>

              <div className="defect-loss-summary">
                <div>
                  <div className="defect-loss-metric-label">Parts/Month</div>
                  <div className="defect-loss-metric-value">{monthlyParts.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="defect-loss-metric-label">Total Defects</div>
                  <div className="defect-loss-metric-value">{monthlyDefects.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="defect-loss-metric-label">Missed by Manual QC</div>
                  <div className="defect-loss-metric-value accent-red">{missedByManualQc.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="defect-loss-metric-label">Monthly Loss</div>
                  <div className="defect-loss-metric-value accent-red">₹ {monthlyLoss.toLocaleString("en-IN")}</div>
                </div>
              </div>

              <p className="defect-loss-footnote">
                Based on {shiftHours}-hour shifts, {workingDaysPerMonth} working days/month, and {manualInspectionAccuracy}% manual inspection accuracy
              </p>
            </div>

          </section>

          <section className="vision-overview-section" aria-label="Vision M feature and replacement overview">
            <div className="vision-overview-inner">
              <div className="vision-overview-badge-wrap">
                <span className="vision-overview-badge">The Vision M System</span>
              </div>
              <h2 className="vision-overview-title">
                AI-Powered Visual Inspection <span className="accent">That Never Blinks</span>
              </h2>
              <p className="vision-overview-subtitle">
                Replace inconsistent manual inspection with a system that catches 99.7% of defects, 24/7 at
                production speed.
              </p>

              <div className="vision-overview-grid">
                {visionSystemOverviewCards.map((card) => (
                  <article className="vision-overview-card" key={card.title}>
                    <span className="vision-overview-icon" aria-hidden="true">
                      {card.icon === "camera" ? <FaCamera /> : null}
                      {card.icon === "edge" ? <FaMicrochip /> : null}
                      {card.icon === "analytics" ? <FaChartBar /> : null}
                      {card.icon === "api" ? <FaPlug /> : null}
                    </span>
                    <h3 className="vision-overview-card-title">{card.title}</h3>
                    <p className="vision-overview-card-text">{card.description}</p>
                  </article>
                ))}
              </div>

              <div className="vision-overview-comparison">
                <h3 className="vision-overview-comparison-title">What You Get vs What It Replaces</h3>
                <p className="vision-overview-comparison-subtitle">See the difference automated vision inspection makes</p>
                <div className="vision-overview-table-wrap">
                  <table className="vision-overview-table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>
                          <span className="vision-overview-pill visionm">✓ Vision M</span>
                        </th>
                        <th>
                          <span className="vision-overview-pill manual">✕ Manual QC</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visionSystemComparisonRows.map((row) => (
                        <tr key={row.feature}>
                          <td><strong>{row.feature}</strong></td>
                          <td><span className="vision-overview-icon-check">✓</span>{row.visionM}</td>
                          <td><span className="vision-overview-icon-cross">✕</span>{row.manualQc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="vision-overview-cta-wrap">
                <button type="button" className="vision-overview-cta">See How It Works On Your Line →</button>
              </div>
            </div>
          </section>

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
                <p className="industry-description-subtext">
                  {industryShowcases[activeIndustryIndex].summary}
                </p>
                {industryShowcases[activeIndustryIndex].layout === "metric" ? (
                  <>
                    <div className="industry-metric-grid">
                      <article className="industry-metric-card">
                        <p className="industry-metric-label">{industryShowcases[activeIndustryIndex].useCases[0].title}</p>
                        <p className="industry-metric-value">{industryShowcases[activeIndustryIndex].useCases[0].description}</p>
                        <p className="industry-metric-foot">{industryShowcases[activeIndustryIndex].useCases[0].tags[0]}</p>
                      </article>
                      <article className="industry-metric-card after">
                        <p className="industry-metric-label">{industryShowcases[activeIndustryIndex].useCases[1].title}</p>
                        <p className="industry-metric-value after">{industryShowcases[activeIndustryIndex].useCases[1].description}</p>
                        <p className="industry-metric-foot">{industryShowcases[activeIndustryIndex].useCases[1].tags[0]}</p>
                      </article>
                    </div>
                    <div className="industry-savings-bar">{industryShowcases[activeIndustryIndex].kpis[0]}</div>
                    <p className="industry-outcome-line">
                      {industryShowcases[activeIndustryIndex].kpis[1]} and{" "}
                      {industryShowcases[activeIndustryIndex].kpis[2].toLowerCase()}.
                    </p>
                    <p className="industry-detail-note">
                      {industryShowcases[activeIndustryIndex].detailNote}
                    </p>
                  </>
                ) : (
                  <>
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
                    <p className="industry-detail-note">
                      {industryShowcases[activeIndustryIndex].detailNote}
                    </p>
                  </>
                )}
              </aside>
            </motion.div>
          </section>

          <section className="vision-system-section" aria-label="Vision M system overview">
            <div className="vision-system-badge-wrap">
              <span className="vision-system-badge">Complete System</span>
            </div>
            <h2 className="vision-system-title">
              The <span className="accent">Vision M Stack</span>
            </h2>
            <p className="vision-system-subtitle">
              Four integrated modules that work together to deliver 99.7% defect detection accuracy.
            </p>

            <div className="vision-system-grid">
              {visionSystemCards.map((item) => (
                <article key={item.title} className="vision-system-card">
                  <div className="vision-system-icon-wrap">
                    <span className="vision-system-icon" aria-hidden="true">
                      {item.icon === "camera" ? <FaCamera /> : null}
                      {item.icon === "chip" ? <FaMicrochip /> : null}
                      {item.icon === "analytics" ? <FaChartBar /> : null}
                      {item.icon === "api" ? <FaPlug /> : null}
                    </span>
                  </div>
                  <div className="vision-system-card-body">
                    <h3 className="vision-system-card-title">{item.title}</h3>
                    <p className="vision-system-card-subtitle">{item.subtitle}</p>
                    <ul className="vision-system-points">
                      {item.points.map((point) => (
                        <li key={point} className="vision-system-point">{point}</li>
                      ))}
                    </ul>
                    <div className="vision-system-ideal">
                      <p className="vision-system-ideal-label">Ideal for:</p>
                      <p className="vision-system-ideal-copy">{item.idealFor}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="risk-free-section" aria-label="Zero risk offer section">
            <div className="risk-free-inner">
              <div className="risk-free-badge-wrap">
                <span className="risk-free-badge">Zero Risk</span>
              </div>
              <h2 className="risk-free-title">
                We Take the Risk, <span className="accent">You Take the Savings</span>
              </h2>
              <p className="risk-free-subtitle">
                Every Vision M deployment comes with ironclad guarantees. If it doesn't deliver, you don't pay.
              </p>

              <div className="risk-free-grid">
                {riskFreeCards.map((card) => (
                  <article key={card.title} className="risk-free-card">
                    <span className="risk-free-icon" aria-hidden="true">
                      {card.icon === "shield" ? <FaShieldAlt /> : null}
                      {card.icon === "target" ? <FaBullseye /> : null}
                      {card.icon === "clock" ? <FaClock /> : null}
                    </span>
                    <h3 className="risk-free-card-title">{card.title}</h3>
                    <p className="risk-free-card-text">{card.description}</p>
                    <span className="risk-free-chip">✓ {card.chip}</span>
                  </article>
                ))}
              </div>

              <p className="risk-free-commitment">
                <strong>Our commitment:</strong> We've equipped 40+ production lines across India. Not a single
                customer has asked for a refund. Our success depends on your success.
              </p>
            </div>
          </section>

          <section className="trusted-proof-section" aria-label="Trusted across industries">
            <div className="trusted-proof-inner">
              <span className="trusted-proof-badge">Trusted Across Industries</span>
              <h2 className="trusted-proof-title">
                <span className="accent">40+ Plants</span> Can't Be Wrong
              </h2>
              <p className="trusted-proof-subtitle">
                From Pune to Chennai, Indian manufacturers are choosing Vision M for reliable, high-accuracy defect
                detection.
              </p>

              <div className="trusted-proof-stats">
                {trustStats.map((stat) => (
                  <article key={stat.label} className="trusted-proof-stat">
                    <span className="trusted-proof-stat-icon" aria-hidden="true">
                      {stat.icon === "lines" ? <FaChartBar /> : null}
                      {stat.icon === "segments" ? <FaLayerGroup /> : null}
                      {stat.icon === "savings" ? <FaRupeeSign /> : null}
                    </span>
                    <div className="trusted-proof-stat-value">{stat.value}</div>
                    <div className="trusted-proof-stat-label">{stat.label}</div>
                  </article>
                ))}
              </div>

              <p className="trusted-proof-industries-label">Industries we serve:</p>
              <div className="trusted-proof-industries">
                {trustIndustries.map((industry) => (
                  <span key={industry} className="trusted-proof-chip">{industry}</span>
                ))}
              </div>

              <div className="trusted-proof-foot">
                <span className="trusted-proof-foot-item"><strong>Compliance Ready</strong> ISO 9001 · IATF 16949</span>
                <span className="trusted-proof-foot-item"><strong>Made In</strong> India</span>
                <span className="trusted-proof-foot-item"><strong>Support</strong> 24/7 Technical</span>
              </div>
            </div>
          </section>

          <section className="resources-section" aria-label="Download resources">
            <div className="resources-inner">
              <span className="resources-badge">Resources</span>
              <h2 className="resources-title">
                Get the <span className="accent">Full Picture</span>
              </h2>
              <p className="resources-subtitle">
                Download detailed documentation to share with your team or evaluate independently.
              </p>

              <div className="resources-grid">
                {resourceCards.map((card) => (
                  <article key={card.title} className="resources-card">
                    <span className="resources-icon" aria-hidden="true">
                      {card.icon === "pdf" ? <FaFileAlt /> : null}
                      {card.icon === "excel" ? <FaCalculator /> : null}
                      {card.icon === "guide" ? <FaCode /> : null}
                    </span>
                    <h3 className="resources-card-title">{card.title}</h3>
                    <p className="resources-card-text">{card.description}</p>
                    <a href="#" className="resources-card-link">↓ {card.cta}</a>
                  </article>
                ))}
              </div>

              <p className="resources-note">Resources will be sent to your email after form submission above.</p>
              <p className="resources-note-link">Fill the form to receive all resources →</p>
            </div>
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
