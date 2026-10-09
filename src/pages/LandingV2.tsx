import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Vision-M landing page (light "A new way to see quality" design).
 *
 * Replaces the previous dark landing page (src/pages/Landing.tsx), which is kept
 * in the codebase but no longer routed. All styles are scoped under `.vm2` so they
 * don't leak into the rest of the app.
 */

type Audience = "business" | "student";

const INDUSTRIES: { tab: string; kicker: string; title: string[]; copy: string; checks: string[]; enquire: string }[] = [
  {
    tab: "Automotive",
    kicker: "AUTOMOTIVE COMPONENTS",
    title: ["A small surface flaw.", "A bigger quality question."],
    copy: "Explore whether visual inspection can distinguish acceptable components from the specific defects your team needs to catch.",
    checks: ["Surface damage and visible inconsistencies", "Missing features or assembly elements", "Evaluation against your acceptance criteria"],
    enquire: "Automotive inspection",
  },
  {
    tab: "Electronics & PCB",
    kicker: "ELECTRONICS & PCB",
    title: ["Every component has a place."],
    copy: "Discuss visible assembly checks for your boards, parts and product variations.",
    checks: ["Component presence and orientation", "Visible assembly inconsistencies", "Image detail and camera positioning"],
    enquire: "Electronics & PCB inspection",
  },
  {
    tab: "Pharma packaging",
    kicker: "PHARMA PACKAGING",
    title: ["The packaging deserves a closer look."],
    copy: "Explore visual checks on packaging against clearly defined acceptance criteria.",
    checks: ["Label presence and positioning", "Print legibility and visible packaging flaws", "Sample variation and inspection constraints"],
    enquire: "Pharma packaging inspection",
  },
  {
    tab: "Food & beverages",
    kicker: "FOOD & BEVERAGES",
    title: ["Quality is visible on the outside, too."],
    copy: "Evaluate visible packaging and product variations using representative samples.",
    checks: ["Packaging integrity and visible damage", "Label placement and appearance", "Variation across batches and formats"],
    enquire: "Food & beverages inspection",
  },
  {
    tab: "Plastics",
    kicker: "PLASTICS & PRECISION PARTS",
    title: ["Look closer at the parts you produce."],
    copy: "Define the visible defects that distinguish an acceptable part from a reject.",
    checks: ["Surface flaws and incomplete parts", "Visible shape variation", "Material, lighting and finish considerations"],
    enquire: "Plastics inspection",
  },
  {
    tab: "Textiles",
    kicker: "TEXTILES",
    title: ["Find the pattern. Question the variation."],
    copy: "Discuss how visible fabric defects could be evaluated for your material and process.",
    checks: ["Visible fabric irregularities", "Pattern and surface inconsistencies", "Texture, movement and lighting conditions"],
    enquire: "Textiles inspection",
  },
];

const INTEREST_OPTIONS = [
  "Industrial demo",
  "Playground · ₹999/month",
  "Professional · ₹9,999/month",
  "Industrial · ₹19,999/month",
  "Automotive inspection",
  "Electronics & PCB inspection",
  "Pharma packaging inspection",
  "Food & beverages inspection",
  "Plastics inspection",
  "Textiles inspection",
  "Vision-M enquiry",
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Playground intended for students?",
    a: "Yes. In this proposed plan structure, Playground is the starting point for students and individuals interested in machine vision. Exact tools, prerequisites and learning resources still need to be confirmed.",
  },
  {
    q: "Do I need coding experience?",
    a: "Requirements depend on the final learning workflow and available tools. Discuss your experience level before choosing a plan; this concept does not promise a no-code experience.",
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
    q: "Can I upload samples or buy a plan here?",
    a: "This is an interactive design mockup. It does not upload images, process payments or send enquiries. The enquiry preview lets you review the proposed visitor journey.",
  },
];

const LandingV2 = () => {
  const [audience, setAudience] = useState<Audience>("business");
  const [showOverlay, setShowOverlay] = useState(true);
  const [industryIndex, setIndustryIndex] = useState(0);
  const [interest, setInterest] = useState(INTEREST_OPTIONS[0]);
  const [formResult, setFormResult] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const openEnquiry = (value: string) => {
    setInterest(value);
    setFormResult(null);
    dialogRef.current?.showModal();
  };

  const closeEnquiry = () => dialogRef.current?.close();

  // Close when clicking the backdrop (outside the dialog box)
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== dialogRef.current) return;
    const r = dialogRef.current.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      closeEnquiry();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name");
    setFormResult(
      `Thanks, ${name}. Your ${interest} enquiry preview is complete. This is a mockup: no enquiry has been sent and no data has been saved.`
    );
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="vm2">
      <style>{VM2_CSS}</style>

      <div className="notice">DESIGN PREVIEW · Proposed plan positioning · Demo interactions only</div>

      <header>
        <nav className="wrap">
          <a className="brand" href="#" onClick={scrollToTop}>
            Vision-M<span></span>
          </a>
          <a href="#journeys">Who it’s for</a>
          <a href="#industries">Industries</a>
          <a href="#plans">Plans</a>
          <a href="#faq">FAQs</a>
          <span className="nav-divider" aria-hidden="true"></span>
          <Link className="nav-login" to="/auth?mode=signin">
            Log in
          </Link>
          <Link className="btn light nav-signup" to="/auth?mode=signup">
            Sign up
          </Link>
          <button className="btn" onClick={() => openEnquiry("Industrial demo")}>
            Book a demo ↗
          </button>
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
              <button
                className="btn"
                onClick={() => openEnquiry(isStudent ? "Playground · ₹999/month" : "Industrial demo")}
              >
                {isStudent ? "Explore Playground ↗" : "Explore my use case ↗"}
              </button>
              <a className="textlink" style={{ margin: 0 }} href="#plans">
                View plans ↓
              </a>
            </div>
            <div className="tiny">
              {isStudent
                ? "Playground Edition · ₹999/month · Proposed learning entry plan"
                : "Start with your product, your defect and your inspection conditions."}
            </div>
          </div>

          <div className="inspection">
            <div className="view-top">
              <span>VISION-M / INSPECTION EXPLORER</span>
              <span className="dot">● CONCEPT</span>
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
                <a className="textlink" href="#plans">
                  Explore Playground <span>↗</span>
                </a>
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
                <svg
                  viewBox="0 0 500 260"
                  role="img"
                  aria-label="Illustrative inspection field with sample objects and one highlighted region"
                >
                  <defs>
                    <pattern id="vm2-g" width="25" height="25" patternUnits="userSpaceOnUse">
                      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#485840" strokeWidth=".5"></path>
                    </pattern>
                  </defs>
                  <rect width="500" height="260" fill="url(#vm2-g)"></rect>
                  <g fill="none" stroke="#88987c" strokeWidth="11">
                    <circle cx="95" cy="125" r="49"></circle>
                    <circle cx="250" cy="125" r="49"></circle>
                    <circle cx="405" cy="125" r="49"></circle>
                  </g>
                  <g fill="#171f1b" stroke="#bec9b0" strokeWidth="2">
                    <circle cx="95" cy="125" r="24"></circle>
                    <circle cx="250" cy="125" r="24"></circle>
                    <circle cx="405" cy="125" r="24"></circle>
                  </g>
                  <path d="M270 81l-10 16 12 9" fill="none" stroke="#e9ff65" strokeWidth="3"></path>
                  <rect x="247" y="66" width="48" height="52" fill="none" stroke="#e9ff65"></rect>
                  <path d="M295 66l30-30h120" fill="none" stroke="#e9ff65"></path>
                  <text x="333" y="29" fontSize="10" fontFamily="monospace" fill="#e9ff65">
                    REGION OF INTEREST
                  </text>
                </svg>
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
                <button className="btn lime" onClick={() => openEnquiry(industry.enquire)}>
                  Discuss this application ↗
                </button>
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
                <button className="btn light" onClick={() => openEnquiry("Playground · ₹999/month")}>
                  Explore Playground ↗
                </button>
              </article>
              <article className="price featured">
                <div className="badge">For use-case evaluation</div>
                <h3>Professional</h3>
                <div className="amount">
                  ₹9,999 <span>/ month</span>
                </div>
                <p>A proposed path for engineers and teams investigating a defined inspection problem.</p>
                <ul className="checks">
                  <li>Focus on a specific use case</li>
                  <li>Define sample and defect criteria</li>
                  <li>Discuss your evaluation requirements</li>
                </ul>
                <button className="btn lime" onClick={() => openEnquiry("Professional · ₹9,999/month")}>
                  Discuss Professional ↗
                </button>
              </article>
              <article className="price">
                <div className="badge">For business teams</div>
                <h3>Industrial</h3>
                <div className="amount">
                  ₹19,999 <span>/ month</span>
                </div>
                <p>A proposed path for businesses exploring a broader inspection workflow.</p>
                <ul className="checks">
                  <li>Map operational requirements</li>
                  <li>Discuss the inspection environment</li>
                  <li>Explore a deployment roadmap</li>
                </ul>
                <button className="btn light" onClick={() => openEnquiry("Industrial · ₹19,999/month")}>
                  Book an Industrial demo ↗
                </button>
              </article>
            </div>
            <p className="pricing-note">
              Concept pricing from the proposed plan structure. Descriptions show intended use, not confirmed feature
              entitlements. Usage limits, support, GST treatment, hardware and integration scope are to be confirmed. No
              payment is taken in this mockup.
            </p>
          </div>
        </section>

        <section id="faq">
          <div className="wrap faq-grid">
            <div>
              <div className="eyebrow">05 / A little more clarity</div>
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
            <button className="btn" onClick={() => openEnquiry("Vision-M enquiry")}>
              Let’s explore it ↗
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <a className="brand" href="#" onClick={scrollToTop}>
            Vision-M<span></span>
          </a>
          <p>Machine vision. Human possibilities.</p>
          <p>Landing page concept · 2026</p>
        </div>
      </footer>

      <dialog ref={dialogRef} onClick={handleDialogClick}>
        <button className="close" aria-label="Close enquiry" onClick={closeEnquiry}>
          ×
        </button>
        <div className="eyebrow">Take the next step</div>
        <h2>Explore Vision-M</h2>
        <p className="tiny">Preview the enquiry experience. Nothing is sent or stored.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Your name
            <input name="name" autoComplete="name" required placeholder="Full name" />
          </label>
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </label>
          <label>
            Company or institution
            <input name="organisation" autoComplete="organization" placeholder="Where you work or learn" />
          </label>
          <label>
            I’m interested in
            <select name="interest" value={interest} onChange={(e) => setInterest(e.target.value)}>
              {INTEREST_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label>
            What would you like to explore?
            <textarea
              name="challenge"
              rows={3}
              placeholder="Tell us about your project, product or inspection challenge."
            ></textarea>
          </label>
          <button className="btn" type="submit">
            Preview my enquiry ↗
          </button>
          {formResult && (
            <div className="success" role="status">
              {formResult}
            </div>
          )}
        </form>
      </dialog>
    </div>
  );
};

const VM2_CSS = `
.vm2 { --ink: #171c1b; --paper: #f5f5ee; --yellow: #e9ff65; --muted: #6b726c; --line: #d9ded3;
  background: var(--paper); color: var(--ink); font-family: Arial, Helvetica, sans-serif; line-height: normal; min-height: 100vh; }
.vm2 * { box-sizing: border-box; }
.vm2 a { color: inherit; text-decoration: none; }
.vm2 button, .vm2 input, .vm2 select, .vm2 textarea { font: inherit; }
.vm2 button, .vm2 a, .vm2 input, .vm2 select, .vm2 textarea { touch-action: manipulation; }
.vm2 button { cursor: pointer; }
.vm2 button:focus-visible, .vm2 a:focus-visible { outline: rgb(119, 155, 38) solid 3px; outline-offset: 5px; }
.vm2 .wrap { max-width: 1240px; margin: auto; padding: 0 40px; }
.vm2 .notice { background: var(--yellow); text-align: center; font-size: 11px; padding: 9px 20px; letter-spacing: 0.07em; }
.vm2 header { background: rgba(245, 245, 238, 0.96); position: sticky; top: 0; z-index: 20; border-bottom: 1px solid var(--line); }
.vm2 nav { height: 80px; display: flex; align-items: center; gap: 32px; }
.vm2 .brand { font-size: 27px; font-weight: 800; letter-spacing: -1.5px; margin-right: auto; }
.vm2 .brand span { display: inline-block; width: 9px; height: 9px; background: rgb(136, 165, 48); margin-left: 5px; }
.vm2 nav > a:not(.brand) { font-size: 13px; }
.vm2 .nav-divider { width: 1px; height: 22px; background: var(--line); }
.vm2 .nav-login { font-weight: 600; margin-right: -12px; }
.vm2 .nav-login:hover { text-decoration: underline; text-underline-offset: 4px; }
.vm2 .nav-signup { margin-right: -20px; }
.vm2 .nav-signup:hover { background: var(--ink); color: white; }
.vm2 .btn { display: inline-flex; justify-content: center; align-items: center; gap: 24px; padding: 17px 23px; border: 1px solid var(--ink); background: var(--ink); color: white; font-weight: 600; font-size: 13px; border-radius: 3px; transition: transform 0.2s, background 0.2s; }
.vm2 .btn:hover { transform: translateY(-2px); background: rgb(54, 64, 53); }
.vm2 .btn.light { background: transparent; color: var(--ink); }
.vm2 .btn.lime { background: var(--yellow); border-color: var(--yellow); color: var(--ink); }
.vm2 .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
.vm2 .eyebrow::before { content: ""; height: 7px; width: 7px; background: rgb(138, 171, 56); }
.vm2 .hero { padding-top: 62px; padding-bottom: 64px; display: grid; grid-template-columns: 1.05fr 1fr; gap: 44px; align-items: center; }
.vm2 h1 { font-size: clamp(46px, 5.5vw, 75px); font-weight: 500; line-height: 1.04; letter-spacing: -4px; margin: 28px 0 24px; }
.vm2 h1 em { font-style: normal; background: var(--yellow); padding: 0 8px 3px 0; }
.vm2 p { line-height: 1.7; color: var(--muted); font-size: 15px; margin: 1em 0; }
.vm2 .hero p { max-width: 480px; }
.vm2 .switch { display: flex; border-bottom: 1px solid var(--line); margin-top: 27px; width: fit-content; gap: 24px; }
.vm2 .switch button { border: none; border-bottom: 2px solid transparent; background: none; padding: 13px 0; font-size: 13px; color: var(--muted); }
.vm2 .switch button.active { border-color: var(--ink); font-weight: 700; color: var(--ink); }
.vm2 .hero-actions { display: flex; align-items: center; gap: 18px; margin-top: 22px; }
.vm2 .tiny { font-size: 11px; color: var(--muted); line-height: 1.7; }
.vm2 .hero .tiny { margin-top: 15px; }
.vm2 .inspection { background: rgb(32, 39, 37); border-radius: 7px; overflow: hidden; color: rgb(217, 224, 217); position: relative; box-shadow: rgba(36, 45, 32, 0.1) 0 24px 60px; }
.vm2 .view-top { padding: 19px 22px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.082); font: 10px monospace; letter-spacing: 0.08em; }
.vm2 .dot { color: var(--yellow); }
.vm2 .viewport { height: 385px; position: relative; background: radial-gradient(rgb(82, 92, 84) 0, rgb(40, 49, 43) 52%, rgb(32, 39, 37) 75%); overflow: hidden; }
.vm2 .vm-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255, 255, 255, 0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.016) 1px, transparent 1px); background-size: 28px 28px; }
.vm2 .part { position: absolute; width: 270px; height: 270px; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-18deg); border-radius: 50%; background: repeating-conic-gradient(rgb(104, 112, 106) 0deg, rgb(104, 112, 106) 9deg, rgb(161, 169, 157) 10deg, rgb(161, 169, 157) 12deg, rgb(83, 92, 83) 13deg, rgb(83, 92, 83) 15deg); box-shadow: rgba(0, 0, 0, 0.533) 16px 24px 30px, rgb(129, 137, 125) 0 0 0 10px inset, rgb(52, 61, 53) 0 0 0 15px inset; }
.vm2 .part::before { content: ""; position: absolute; inset: 35px; border-radius: 50%; background: conic-gradient(rgb(184, 190, 177), rgb(101, 112, 95), rgb(195, 200, 184), rgb(111, 122, 104), rgb(184, 190, 177)); box-shadow: rgb(203, 208, 194) 0 0 0 3px inset, rgb(124, 134, 117) 0 0 0 18px inset, rgb(175, 183, 164) 0 0 0 22px inset; }
.vm2 .part::after { content: ""; position: absolute; inset: 89px; background: rgb(34, 43, 36); border: 9px solid rgb(189, 196, 178); border-radius: 50%; box-shadow: rgba(0, 0, 0, 0.533) 4px 8px 10px inset, rgb(87, 99, 78) 0 0 0 4px; }
.vm2 .scratch { position: absolute; left: 64%; top: 28%; width: 4px; height: 52px; background: rgb(48, 58, 46); transform: rotate(24deg); box-shadow: rgb(200, 212, 189) 3px 0; }
.vm2 .box { position: absolute; border: 1px solid var(--yellow); width: 91px; height: 93px; left: 56%; top: 22%; z-index: 2; transition: opacity 0.3s; }
.vm2 .box span { position: absolute; top: -25px; left: -1px; background: var(--yellow); color: rgb(32, 39, 37); white-space: nowrap; padding: 5px 8px; font: 10px monospace; }
.vm2 .coordinates { position: absolute; left: 18px; bottom: 18px; font: 10px monospace; color: rgb(155, 167, 153); }
.vm2 .scan { position: absolute; top: 15%; left: 10%; right: 10%; height: 1px; background: rgba(233, 255, 101, 0.467); box-shadow: rgb(233, 255, 101) 0 0 14px; animation: vm2-scan 6s ease-in-out infinite; }
@keyframes vm2-scan { 50% { top: 85%; } }
.vm2 .view-bottom { padding: 17px 20px; border-top: 1px solid rgba(255, 255, 255, 0.082); display: flex; justify-content: space-between; align-items: center; gap: 15px; font-size: 11px; }
.vm2 .view-bottom button { background: rgba(255, 255, 255, 0.043); color: white; border: 1px solid rgba(255, 255, 255, 0.19); padding: 8px 11px; border-radius: 3px; font-size: 10px; }
.vm2 .strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 23px 0; }
.vm2 .strip .wrap { display: flex; justify-content: space-between; gap: 20px; font-size: 11px; letter-spacing: 0.06em; }
.vm2 .strip span:first-child { color: var(--muted); }
.vm2 section { padding: 90px 0; }
.vm2 h2 { font-size: clamp(34px, 4vw, 51px); font-weight: 500; line-height: 1.12; letter-spacing: -2px; margin: 18px 0 20px; }
.vm2 h3 { font-size: 23px; font-weight: 500; letter-spacing: -0.6px; margin: 1em 0; }
.vm2 .section-head { display: flex; justify-content: space-between; align-items: end; gap: 35px; margin-bottom: 35px; }
.vm2 .section-head p { max-width: 360px; margin-bottom: 23px; }
.vm2 .journeys { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.vm2 .journey { padding: 36px; border: 1px solid var(--line); border-radius: 5px; position: relative; }
.vm2 .journey:first-child { background: rgb(233, 237, 222); }
.vm2 .journey:last-child { background: rgb(255, 255, 255); }
.vm2 .num { font: 11px monospace; color: var(--muted); }
.vm2 .journey h3 { font-size: 30px; max-width: 320px; line-height: 1.18; }
.vm2 .journey p { max-width: 400px; }
.vm2 .textlink { display: inline-flex; gap: 26px; font-size: 13px; font-weight: 700; margin-top: 15px; }
.vm2 .journey-tags { display: flex; flex-wrap: wrap; gap: 7px; margin: 24px 0; }
.vm2 .journey-tags span { font-size: 10px; border: 1px solid rgb(200, 205, 191); border-radius: 20px; padding: 7px 10px; }
.vm2 .vm-dark { background: rgb(23, 31, 27); color: var(--paper); }
.vm2 .vm-dark p { color: rgb(165, 176, 165); }
.vm2 .tabs { display: flex; gap: 9px; flex-wrap: wrap; margin: 28px 0 32px; }
.vm2 .tabs button { background: transparent; border: 1px solid rgb(82, 96, 81); padding: 12px 16px; border-radius: 3px; color: rgb(216, 223, 213); font-size: 12px; }
.vm2 .tabs button.active { color: rgb(23, 32, 25); background: var(--yellow); border-color: var(--yellow); }
.vm2 .industry-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.vm2 .industry-art { height: 295px; background: rgb(36, 47, 39); position: relative; overflow: hidden; display: grid; place-items: center; border: 1px solid rgb(66, 81, 64); border-radius: 4px; }
.vm2 .industry-art svg { width: 85%; height: 85%; }
.vm2 .art-label { position: absolute; bottom: 14px; left: 17px; font: 10px monospace; color: rgb(154, 173, 149); }
.vm2 .industry-panel h3 { font-size: 32px; margin: 0 0 18px; }
.vm2 .checks { padding: 0; margin: 1em 0; list-style: none; }
.vm2 .checks li { padding: 10px 0; font-size: 13px; line-height: 1.5; }
.vm2 .checks li::before { content: "↗"; margin-right: 13px; color: rgb(143, 174, 74); }
.vm2 .vm-dark .checks li::before { color: var(--yellow); }
.vm2 .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 40px; }
.vm2 .step { border-top: 1px solid var(--line); padding-top: 22px; }
.vm2 .step strong { font: 12px monospace; color: rgb(120, 132, 105); }
.vm2 .step h3 { margin: 20px 0 10px; font-size: 23px; }
.vm2 .price-section { background: rgb(233, 237, 223); }
.vm2 .prices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 17px; margin-top: 38px; }
.vm2 .price { background: var(--paper); padding: 30px 27px; border: 1px solid rgb(210, 217, 199); border-radius: 4px; display: flex; flex-direction: column; }
.vm2 .price.featured { background: rgb(32, 43, 34); color: white; border-color: rgb(32, 43, 34); }
.vm2 .badge { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 20px; color: rgb(116, 128, 100); }
.vm2 .featured .badge { color: var(--yellow); }
.vm2 .price h3 { font-size: 24px; margin: 0 0 18px; }
.vm2 .amount { font-size: 43px; letter-spacing: -2px; }
.vm2 .amount span { font-size: 12px; letter-spacing: 0; color: rgb(124, 135, 116); }
.vm2 .featured .amount span, .vm2 .featured p { color: rgb(177, 190, 169); }
.vm2 .price p { font-size: 13px; min-height: 65px; margin: 18px 0 10px; }
.vm2 .price .checks { border-top: 1px solid rgb(204, 211, 197); padding-top: 18px; margin-bottom: 25px; flex: 1 1 0%; }
.vm2 .featured .checks { border-color: rgb(71, 85, 65); }
.vm2 .pricing-note { font-size: 11px; line-height: 1.8; max-width: 850px; margin: 22px auto 0; text-align: center; color: rgb(105, 114, 95); }
.vm2 .faq-grid { display: grid; grid-template-columns: 0.75fr 1.25fr; gap: 80px; }
.vm2 details { border-bottom: 1px solid var(--line); padding: 21px 0; }
.vm2 summary { cursor: pointer; font-size: 15px; list-style: none; display: flex; justify-content: space-between; gap: 20px; }
.vm2 summary::-webkit-details-marker { display: none; }
.vm2 summary::after { content: "+"; font-size: 20px; }
.vm2 details[open] summary::after { content: "−"; }
.vm2 details p { font-size: 13px; margin-bottom: 3px; }
.vm2 .closing { padding: 58px 0; background: var(--yellow); }
.vm2 .closing .wrap { display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.vm2 .closing h2 { max-width: 690px; margin-top: 0; }
.vm2 .closing p { color: rgb(82, 96, 46); margin: 0; }
.vm2 footer { padding: 32px 0; }
.vm2 footer .wrap { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.vm2 footer p { font-size: 11px; }
.vm2 dialog { padding: 35px; border: 1px solid var(--line); border-radius: 8px; width: min(530px, 92vw); max-height: 90vh; background: var(--paper); color: var(--ink); }
.vm2 dialog::backdrop { background: rgba(15, 27, 19, 0.733); backdrop-filter: blur(5px); }
.vm2 dialog h2 { font-size: 32px; margin: 16px 0; }
.vm2 .close { float: right; background: none; border: 0; font-size: 25px; }
.vm2 label { display: block; font-size: 12px; margin-top: 14px; }
.vm2 input, .vm2 select, .vm2 textarea { width: 100%; padding: 11px; border: 1px solid rgb(199, 207, 190); background: white; border-radius: 3px; margin-top: 6px; }
.vm2 textarea { resize: vertical; }
.vm2 form .btn { margin-top: 20px; width: 100%; }
.vm2 .success { padding: 15px; background: rgb(227, 236, 205); font-size: 13px; line-height: 1.6; margin-top: 15px; }
@media (max-width: 950px) {
  .vm2 nav { gap: 20px; }
  .vm2 nav > * { white-space: nowrap; flex-shrink: 0; }
  .vm2 nav .btn { padding: 13px 14px; font-size: 12px; }
  .vm2 .nav-divider { display: none; }
  .vm2 .nav-login { margin-right: -8px; }
  .vm2 .nav-signup { margin-right: -10px; }
  .vm2 .wrap { padding: 0 25px; }
  .vm2 h1 { letter-spacing: -2.5px; }
  .vm2 .hero { gap: 25px; }
  .vm2 .viewport { height: 345px; }
  .vm2 .part { width: 230px; height: 230px; }
  .vm2 .part::after { inset: 75px; }
  .vm2 .industry-panel { gap: 30px; }
  .vm2 .prices { gap: 10px; }
  .vm2 .price { padding: 24px 19px; }
  .vm2 .faq-grid { gap: 35px; }
}
@media (max-width: 720px) {
  .vm2 .notice { font-size: 9px; }
  .vm2 nav { height: 68px; }
  .vm2 nav > a:not(.brand):not(.btn) { display: none; }
  .vm2 nav .btn { padding: 12px; font-size: 11px; }
  .vm2 nav > a.nav-login:not(.brand):not(.btn) { display: inline; font-size: 12px; margin-right: -6px; }
  .vm2 .nav-divider, .vm2 .nav-signup { display: none; }
  .vm2 .wrap { padding: 0 22px; }
  .vm2 .hero { grid-template-columns: 1fr; padding-top: 35px; gap: 30px; }
  .vm2 h1 { font-size: 53px; letter-spacing: -3px; }
  .vm2 .hero p { font-size: 14px; }
  .vm2 .viewport { height: 330px; }
  .vm2 .strip .wrap { flex-wrap: wrap; justify-content: center; font-size: 10px; }
  .vm2 .strip span:first-child { width: 100%; text-align: center; }
  .vm2 section { padding: 58px 0; }
  .vm2 .section-head { display: block; }
  .vm2 .section-head p { max-width: none; }
  .vm2 .journeys, .vm2 .industry-panel, .vm2 .prices, .vm2 .faq-grid, .vm2 .steps { grid-template-columns: 1fr; }
  .vm2 .journey { padding: 27px; }
  .vm2 .industry-panel { gap: 26px; }
  .vm2 .steps { gap: 20px; }
  .vm2 .price p { min-height: 0; }
  .vm2 .price { padding: 30px; }
  .vm2 .prices { gap: 18px; }
  .vm2 .faq-grid { gap: 12px; }
  .vm2 .closing .wrap { display: block; }
  .vm2 .closing .btn { margin-top: 27px; }
  .vm2 footer .wrap { align-items: start; flex-direction: column; }
  .vm2 .industry-art { height: 250px; }
  .vm2 .hero-actions { gap: 14px; }
  .vm2 .hero-actions .btn { padding: 16px; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .vm2 .scan { animation: none; }
  .vm2 * { transition: none !important; }
}
`;

export default LandingV2;
