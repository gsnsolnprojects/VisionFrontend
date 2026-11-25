import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IndustryArt } from "@/components/landing/IndustryArt";
import { IsoBadge } from "@/components/landing/IsoBadge";
import { VM2_CSS } from "@/components/landing/vm2Styles";
import { BlogSection } from "@/components/blog/BlogSection";

/** Playground buttons start sign-up; after creating a company the app asks them to pay for the plan */
const PLAYGROUND_SIGNUP = "/auth?mode=signup&plan=playground";

/**
 * Vision-M landing page (light "A new way to see quality" design).
 *
 * Replaces the previous dark landing page (src/pages/Landing.tsx), which is kept
 * in the codebase but no longer routed. All styles are scoped under `.vm2` so they
 * don't leak into the rest of the app.
 */


type Audience = "business" | "student";

const INDUSTRIES: { tab: string; kicker: string; title: string[]; copy: string; checks: string[] }[] = [
  {
    tab: "Automotive",
    kicker: "AUTOMOTIVE COMPONENTS",
    title: ["A small surface flaw.", "A bigger quality question."],
    copy: "Explore whether visual inspection can distinguish acceptable components from the specific defects your team needs to catch.",
    checks: ["Surface damage and visible inconsistencies", "Missing features or assembly elements", "Evaluation against your acceptance criteria"],
  },
  {
    tab: "Electronics & PCB",
    kicker: "ELECTRONICS & PCB",
    title: ["Every component has a place."],
    copy: "Discuss visible assembly checks for your boards, parts and product variations.",
    checks: ["Component presence and orientation", "Visible assembly inconsistencies", "Image detail and camera positioning"],
  },
  {
    tab: "Pharma packaging",
    kicker: "PHARMA PACKAGING",
    title: ["The packaging deserves a closer look."],
    copy: "Explore visual checks on packaging against clearly defined acceptance criteria.",
    checks: ["Label presence and positioning", "Print legibility and visible packaging flaws", "Sample variation and inspection constraints"],
  },
  {
    tab: "Food & beverages",
    kicker: "FOOD & BEVERAGES",
    title: ["Quality is visible on the outside, too."],
    copy: "Evaluate visible packaging and product variations using representative samples.",
    checks: ["Packaging integrity and visible damage", "Label placement and appearance", "Variation across batches and formats"],
  },
  {
    tab: "Plastics",
    kicker: "PLASTICS & PRECISION PARTS",
    title: ["Look closer at the parts you produce."],
    copy: "Define the visible defects that distinguish an acceptable part from a reject.",
    checks: ["Surface flaws and incomplete parts", "Visible shape variation", "Material, lighting and finish considerations"],
  },
  {
    tab: "Textiles",
    kicker: "TEXTILES",
    title: ["Find the pattern. Question the variation."],
    copy: "Discuss how visible fabric defects could be evaluated for your material and process.",
    checks: ["Visible fabric irregularities", "Pattern and surface inconsistencies", "Texture, movement and lighting conditions"],
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Playground intended for students?",
    a: "Yes. Playground is the starting point for students and individuals interested in machine vision. You learn step by step with short lessons and ready-made sample datasets from real inspection projects.",
  },
  {
    q: "Do I need coding experience?",
    a: "No. Vision-M Studio runs in your browser: you look at datasets, train models and test them without writing code. Knowing the basics of how AI models learn helps, and Playground's lessons cover them.",
  },
  {
    q: "Can Vision-M inspect my product?",
    a: "Suitability needs an evaluation of your product images, visible defect types, acceptance criteria and operating conditions. The industry examples are starting points for that discussion, not performance guarantees.",
  },
  {
    q: "Does the subscription include cameras and installation?",
    a: "Hardware, lighting, installation and integration need an explicitly agreed scope. The monthly prices shown here should not be interpreted as the cost of a complete installed inspection system.",
  },
  {
    q: "What accuracy can I expect?",
    a: "Accuracy must be measured on representative samples under defined conditions. A credible evaluation should examine both missed defects and acceptable items incorrectly flagged.",
  },
  {
    q: "How do I get started?",
    a: "Sign up, create your company workspace and choose a plan on the Billing page. Plans are billed monthly per company, and everyone in your company shares the plan.",
  },
];

const LandingV2 = () => {
  const [audience, setAudience] = useState<Audience>("business");
  const [showOverlay, setShowOverlay] = useState(true);
  const [industryIndex, setIndustryIndex] = useState(0);

  const isStudent = audience === "student";
  const industry = INDUSTRIES[industryIndex];

  // Page title, light theme and smooth anchor scrolling while this page is shown
  useEffect(() => {
    const root = document.documentElement;
    const prevTitle = document.title;
    const hadDark = root.classList.contains("dark");
    const prevScrollBehavior = root.style.scrollBehavior;
    const prevScrollPadding = root.style.scrollPaddingTop;

    document.title = "Vision-M — A new way to see quality";
    root.classList.remove("dark");
    root.style.scrollBehavior = "smooth";
    root.style.scrollPaddingTop = "90px";

    return () => {
      document.title = prevTitle;
      if (hadDark) root.classList.add("dark");
      root.style.scrollBehavior = prevScrollBehavior;
      root.style.scrollPaddingTop = prevScrollPadding;
    };
  }, []);

  // Coming from another page with an anchor (e.g. "/#blogs" from a blog post): scroll to it once rendered
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
  }, []);

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    // Jump straight to the top: a long smooth scroll (the page sets scroll-behavior: smooth)
    // can be interrupted or skipped by some phone browsers, leaving the page where it was
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div className="vm2">
      <style>{VM2_CSS}</style>


      <header>
        <nav className="wrap">
          <a className="brand" href="#" onClick={scrollToTop}>
            Vision-M<span></span>
          </a>
          <a href="#journeys">Who it’s for</a>
          <a href="#industries">Industries</a>
          <a href="#plans">Plans</a>
          <a href="#blogs">Blogs</a>
          <a href="#faq">FAQs</a>
          <Link to="/showcase">Showcase</Link>
          <span className="nav-divider" aria-hidden="true"></span>
          <Link className="nav-login" to="/auth?mode=signin">
            Log in
          </Link>
          <Link className="btn light nav-signup" to="/auth?mode=signup">
            Sign up
          </Link>
        </nav>
      </header>

      <main>
        <div className="wrap hero">
          <div>
            <div className="eyebrow">A new way to see quality</div>
            <h1>
              Small details.
              <br />
              Big possibilities.
              <br />
              <em>That’s vision.</em>
            </h1>
            <p>
              {isStudent
                ? "Move from AI curiosity to a practical project. Explore machine vision through the details, differences and defects in everyday objects."
                : "From your first AI vision project to your factory’s inspection challenge. Explore what Vision-M could help you see."}
            </p>
            <div className="switch" role="group" aria-label="Choose your journey">
              <button
                className={!isStudent ? "active" : ""}
                aria-pressed={!isStudent}
                onClick={() => setAudience("business")}
              >
                For my business
              </button>
              <button
                className={isStudent ? "active" : ""}
                aria-pressed={isStudent}
                onClick={() => setAudience("student")}
              >
                For my learning
              </button>
            </div>
            <div className="hero-actions">
              {isStudent && (
                <Link className="btn" to={PLAYGROUND_SIGNUP}>
                  Explore Playground ↗
                </Link>
              )}
              <a className="textlink" style={{ margin: 0 }} href="#plans">
                View plans ↓
              </a>
            </div>
            <div className="tiny">
              {isStudent
                ? "Playground Edition · ₹999/month · Learning entry plan"
                : "Start with your product, your defect and your inspection conditions."}
            </div>
          </div>

          <div className="inspection">
            <div className="view-top">
              <span>VISION-M / INSPECTION EXPLORER</span>
              <span className="dot">● EXAMPLE</span>
            </div>
            <div className="viewport">
              <div className="vm-grid"></div>
              <div className="part">
                <div className="scratch"></div>
              </div>
              <div className="box" style={{ opacity: showOverlay ? 1 : 0 }}>
                <span>SURFACE ANOMALY ↙</span>
              </div>
              <div className="scan"></div>
              <div className="coordinates">
                SAMPLE 001 / AUTOMOTIVE COMPONENT
                <br />
                <br />
                ILLUSTRATIVE VISUAL · NOT A LIVE AI RESULT
              </div>
            </div>
            <div className="view-bottom">
              <span>A different perspective on a small detail.</span>
              <button aria-pressed={showOverlay} onClick={() => setShowOverlay((s) => !s)}>
                {showOverlay ? "Hide overlay" : "Show overlay"}
              </button>
            </div>
          </div>
        </div>

        <div className="strip">
          <div className="wrap">
            <span>ONE PLATFORM. DIFFERENT STARTING POINTS.</span>
            <span>STUDENTS &amp; EDUCATORS</span>
            <span>ENGINEERING TEAMS</span>
            <span>MANUFACTURERS</span>
          </div>
        </div>

        <section id="journeys">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">01 / Find your starting point</div>
                <h2>
                  Curiosity meets
                  <br />
                  real-world challenges.
                </h2>
              </div>
              <p>
                Whether you’re exploring machine vision or evaluating a business problem, start with the question that
                matters to you.
              </p>
            </div>
            <div className="journeys">
              <article className="journey">
                <span className="num">01 — LEARN &amp; EXPERIMENT</span>
                <h3>
                  Move beyond watching
                  <br />
                  AI tutorials.
                </h3>
                <p>
                  Your next project could explore surface defects, missing parts or packaging variations. Start
                  connecting AI concepts to things you can see.
                </p>
                <div className="journey-tags">
                  <span>Students</span>
                  <span>Aspiring AI engineers</span>
                  <span>Faculty &amp; labs</span>
                </div>
                <Link className="textlink" to={PLAYGROUND_SIGNUP}>
                  Explore Playground <span>↗</span>
                </Link>
              </article>
              <article className="journey">
                <span className="num">02 — EVALUATE &amp; APPLY</span>
                <h3>
                  Same product.
                  <br />
                  Different inspection decisions?
                </h3>
                <p>
                  Turn a quality concern into a defined evaluation. Start with representative samples, a clear defect
                  definition and your operating conditions.
                </p>
                <div className="journey-tags">
                  <span>Quality teams</span>
                  <span>Plant leaders</span>
                  <span>Automation teams</span>
                </div>
                <a className="textlink" href="#industries">
                  Find your inspection challenge <span>↗</span>
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="vm-dark" id="industries">
          <div className="wrap">
            <div className="eyebrow">02 / Explore the application</div>
            <div className="section-head">
              <h2>
                Your industry.
                <br />
                Your inspection challenge.
              </h2>
              <p>
                Discover example applications to discuss. Feasibility depends on your samples, defect criteria and
                inspection setup.
              </p>
            </div>
            <div className="tabs" role="group" aria-label="Industry examples">
              {INDUSTRIES.map((item, i) => (
                <button
                  key={item.tab}
                  className={i === industryIndex ? "active" : ""}
                  aria-pressed={i === industryIndex}
                  onClick={() => setIndustryIndex(i)}
                >
                  {item.tab}
                </button>
              ))}
            </div>
            <div className="industry-panel">
              <div className="industry-art">
                <IndustryArt index={industryIndex} />
                <span className="art-label">SCHEMATIC / EXAMPLE INSPECTION REGIONS</span>
              </div>
              <div>
                <span className="num" style={{ color: "#a4b797" }}>
                  {industry.kicker}
                </span>
                <h3>
                  {industry.title.map((line, i) => (
                    <span key={line}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </h3>
                <p>{industry.copy}</p>
                <ul className="checks">
                  {industry.checks.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <Link className="textlink" to="/showcase">
                  See real projects in the Showcase <span>↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="eyebrow">03 / Start with evidence</div>
            <h2>
              First, define the problem.
              <br />
              Then, explore the possibilities.
            </h2>
            <div className="steps">
              <article className="step">
                <strong>01 / DEFINE</strong>
                <h3>What should AI look for?</h3>
                <p>
                  Choose a product and a visible defect. Define what “acceptable” and “unacceptable” mean for your use
                  case.
                </p>
              </article>
              <article className="step">
                <strong>02 / EVALUATE</strong>
                <h3>Use representative samples.</h3>
                <p>
                  Discuss good and defective examples, lighting, image quality and the variations an evaluation needs
                  to cover.
                </p>
              </article>
              <article className="step">
                <strong>03 / DECIDE</strong>
                <h3>Make the next step informed.</h3>
                <p>
                  Review the evidence and limitations before deciding on a larger project or an operational deployment.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="price-section" id="plans">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">04 / Choose your next step</div>
                <h2>
                  Start curious.
                  <br />
                  Grow with purpose.
                </h2>
              </div>
              <p>Three monthly plans. From individual exploration to a focused business conversation.</p>
            </div>
            <div className="prices">
              <article className="price" id="playground">
                <div className="badge">For learning &amp; exploration</div>
                <h3>Playground</h3>
                <div className="amount">
                  ₹999 <span>/ month</span>
                </div>
                <p>A starting point for students, curious minds and aspiring AI engineers.</p>
                <ul className="checks">
                  <li>Explore machine vision concepts</li>
                  <li>Consider practical project ideas</li>
                  <li>Connect learning to visual inspection</li>
                </ul>
                <Link className="btn light" to={PLAYGROUND_SIGNUP}>
                  Explore Playground ↗
                </Link>
              </article>
              <article className="price featured">
                <div className="badge">For use-case evaluation</div>
                <h3>Pilot</h3>
                <div className="amount">
                  ₹9,999 <span>/ month</span>
                </div>
                <p>For engineers and teams investigating a defined inspection problem.</p>
                <ul className="checks">
                  <li>Focus on a specific use case</li>
                  <li>Define sample and defect criteria</li>
                  <li>Discuss your evaluation requirements</li>
                </ul>
              </article>
              <article className="price">
                <div className="badge">For business teams</div>
                <h3>Production</h3>
                <div className="amount">
                  ₹19,999 <span>/ month</span>
                </div>
                <p>For businesses exploring a broader inspection workflow.</p>
                <ul className="checks">
                  <li>Map operational requirements</li>
                  <li>Discuss the inspection environment</li>
                  <li>Explore a deployment roadmap</li>
                </ul>
              </article>
            </div>
            <p className="pricing-note">
              Monthly prices per company. Cameras, lighting, installation and integration are scoped separately for
              each project.
            </p>
          </div>
        </section>

        <BlogSection eyebrow="05 / From the blog" />

        <section id="faq">
          <div className="wrap faq-grid">
            <div>
              <div className="eyebrow">06 / A little more clarity</div>
              <h2>
                Good questions.
                <br />
                Better starting points.
              </h2>
              <p>Start with what you need to know.</p>
            </div>
            <div>
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="closing">
          <div className="wrap">
            <div>
              <h2>
                What would you like
                <br />
                AI to look for?
              </h2>
              <p>Bring your curiosity. Or bring your inspection challenge.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <a className="brand" href="#" onClick={scrollToTop}>
            Vision-M<span></span>
          </a>
          <div className="iso-badges">
            <IsoBadge id="iso9001" top="QUALITY MANAGEMENT" std="ISO" num="9001" year="2015" />
            <IsoBadge id="iso27001" top="INFORMATION SECURITY" std="ISO/IEC" num="27001" year="2022" />
          </div>
          <p>
            © 2026 Vision-M · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> ·{" "}
            <Link to="/refunds">Refunds</Link> · <Link to="/contact">Contact</Link>
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingV2;
