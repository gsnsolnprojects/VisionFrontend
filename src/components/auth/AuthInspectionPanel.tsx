import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IndustryArt } from "@/components/landing/IndustryArt";

/**
 * Dark side panel for the sign-in / sign-up page, in the landing page's style: the industry
 * drawings take turns while a scan line passes over them, as if the AI were inspecting each one.
 * On small screens only the logo and tagline show, as a strip above the form.
 */

const CAPTIONS = [
  "Checking every nut for scratches",
  "Looking for missing components",
  "Counting tablets in every blister pack",
  "Making sure labels sit straight",
  "Spotting chipped corners on moulded parts",
  "Finding pulled threads in the fabric",
];

const INTERVAL_MS = 3500;

const CSS = `
.auth-panel { background: rgb(23, 31, 27); color: #f5f5ee; font-family: Arial, Helvetica, sans-serif; }
.auth-panel .auth-art { background: rgb(36, 47, 39); border: 1px solid rgb(66, 81, 64); border-radius: 4px; position: relative; overflow: hidden; }
.auth-panel .auth-art svg { width: 100%; height: auto; display: block; }
.auth-panel .auth-art-frame { animation: auth-fade 0.6s ease; }
.auth-panel .auth-scan { position: absolute; left: 0; right: 0; height: 2px; background: #e9ff65; box-shadow: 0 0 12px #e9ff65; opacity: 0.55; animation: auth-scan ${INTERVAL_MS}ms linear infinite; }
.auth-panel .auth-dot { width: 8px; height: 8px; border-radius: 9999px; background: rgb(72, 88, 64); transition: background 0.2s, width 0.2s; }
.auth-panel .auth-dot[aria-current="true"] { background: #e9ff65; width: 22px; }
.auth-panel em { font-style: normal; background: #e9ff65; color: #171c1b; padding: 0 6px 2px 2px; }
@keyframes auth-fade { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: none; } }
@keyframes auth-scan { from { top: 0; } to { top: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .auth-panel .auth-art-frame, .auth-panel .auth-scan { animation: none; }
  .auth-panel .auth-scan { display: none; }
}
`;

export const AuthInspectionPanel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Next drawing after a full interval; restarts whenever the drawing changes (also when picked)
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || paused) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % CAPTIONS.length), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  return (
    <aside className="auth-panel order-first flex flex-col px-6 py-5 lg:order-last lg:min-h-screen lg:px-14 lg:py-10">
      <style>{CSS}</style>
      <Link to="/" className="text-2xl font-extrabold tracking-tight" aria-label="Vision-M home">
        Vision-M<span className="ml-1 inline-block h-2 w-2 bg-[#88a530]" />
      </Link>

      <div className="hidden flex-1 flex-col justify-center gap-8 lg:flex">
        <h2 className="text-5xl font-normal leading-[1.05] tracking-tight">
          Small details.
          <br />
          Big possibilities.
          <br />
          <em>That’s vision.</em>
        </h2>

        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="auth-art">
            <div key={index} className="auth-art-frame">
              <IndustryArt index={index} />
            </div>
            <div key={`scan-${index}`} className="auth-scan" aria-hidden="true" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-wide text-[#a4b797]" aria-live="polite">
              {CAPTIONS[index]}…
            </p>
            <div className="flex items-center gap-1.5" role="group" aria-label="Choose an example">
              {CAPTIONS.map((caption, i) => (
                <button
                  key={caption}
                  type="button"
                  className="auth-dot"
                  aria-label={caption}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="hidden text-xs text-[#9aad95] lg:block">Machine vision. Human possibilities.</p>
      <p className="mt-1 text-sm text-[#a4b797] lg:hidden">Small details. Big possibilities.</p>
    </aside>
  );
};
