import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeInUpVariants } from "@/utils/animations";

const Landing = () => {
  const navigate = useNavigate();
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [confidences, setConfidences] = useState([92, 89, 86]);
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
          overflow: hidden;
          border: 1px solid rgba(71, 85, 105, 0.55);
          border-radius: 1rem;
          background:
            linear-gradient(180deg, rgba(51, 65, 85, 0.35), rgba(15, 23, 42, 0.25) 26%, rgba(2, 6, 23, 0.45) 100%);
          box-shadow:
            inset 0 10px 18px rgba(148, 163, 184, 0.08),
            inset 0 -12px 20px rgba(2, 6, 23, 0.65),
            0 12px 26px rgba(2, 6, 23, 0.35);
          min-height: 104px;
          display: flex;
          align-items: center;
          padding: 1rem 0;
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
          inset: 11px 0 11px 0;
          border-top: 2px solid rgba(148, 163, 184, 0.38);
          border-bottom: 2px solid rgba(30, 41, 59, 0.95);
          box-shadow:
            inset 0 1px 0 rgba(226, 232, 240, 0.08),
            inset 0 -1px 0 rgba(2, 6, 23, 0.8);
        }
        .trusted-row .belt-texture {
          position: absolute;
          inset: 13px 0;
          z-index: 0;
          background:
            repeating-linear-gradient(
              90deg,
              rgba(51, 65, 85, 0.34) 0px,
              rgba(51, 65, 85, 0.34) 12px,
              rgba(30, 41, 59, 0.6) 12px,
              rgba(30, 41, 59, 0.6) 24px
            );
          animation: beltMove 1.15s linear infinite;
          opacity: 0.8;
        }
        .trusted-track {
          position: relative;
          z-index: 1;
          display: flex;
          width: max-content;
          align-items: center;
          gap: 1.4rem;
          padding: 0 0.75rem;
          animation: conveyorRight 26s linear infinite;
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
        }
        .trusted-logo.is-white {
          filter: brightness(0) invert(1) contrast(1.08);
          width: 88px;
          height: 88px;
        }
        @keyframes conveyorRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes beltMove {
          0% { background-position-x: 0; }
          100% { background-position-x: 24px; }
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

              <div className="d-flex flex-wrap align-items-center gap-3">
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
              <div className="trusted-track">
                {[...trustedCompanies, ...trustedCompanies].map((company, index) => (
                  <span className="trusted-pill" key={`${company.name}-${index}`}>
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
        </div>
      </motion.section>
    </div>
  );
};

export default Landing;
