/** Styles for the light Vision-M public pages (landing, blog). Everything is scoped under `.vm2`. */
export const VM2_CSS = `
.vm2 { --ink: #171c1b; --paper: #f5f5ee; --yellow: #e9ff65; --muted: #6b726c; --line: #d9ded3;
  background: var(--paper); color: var(--ink); font-family: Arial, Helvetica, sans-serif; line-height: normal; min-height: 100vh; }
.vm2 * { box-sizing: border-box; }
.vm2 a { color: inherit; text-decoration: none; }
.vm2 button, .vm2 input, .vm2 select, .vm2 textarea { font: inherit; }
.vm2 button, .vm2 a, .vm2 input, .vm2 select, .vm2 textarea { touch-action: manipulation; }
.vm2 button { cursor: pointer; }
.vm2 button:focus-visible, .vm2 a:focus-visible { outline: rgb(119, 155, 38) solid 3px; outline-offset: 5px; }
.vm2 .wrap { max-width: 1240px; margin: auto; padding: 0 40px; }
.vm2 header { background: rgba(245, 245, 238, 0.96); position: sticky; top: 0; z-index: 20; border-bottom: 1px solid var(--line); }
.vm2 nav { height: 80px; display: flex; align-items: center; gap: 32px; }
.vm2 .brand { font-size: 27px; font-weight: 800; letter-spacing: -1.5px; margin-right: auto; }
.vm2 .brand span { display: inline-block; width: 9px; height: 9px; background: rgb(136, 165, 48); margin-left: 5px; }
.vm2 nav > a:not(.brand) { font-size: 13px; }
.vm2 .nav-divider { width: 1px; height: 22px; background: var(--line); }
.vm2 .nav-login { font-weight: 600; margin-right: -12px; }
.vm2 .nav-login:hover { text-decoration: underline; text-underline-offset: 4px; }
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
.vm2 .iso-badges { display: flex; gap: 16px; }
.vm2 .iso-badge { width: 96px; height: 96px; display: block; }
@media (max-width: 950px) {
  .vm2 nav { gap: 20px; }
  .vm2 nav > * { white-space: nowrap; flex-shrink: 0; }
  .vm2 nav .btn { padding: 13px 14px; font-size: 12px; }
  .vm2 .nav-divider { display: none; }
  .vm2 .nav-login { margin-right: -8px; }
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
  .vm2 nav { height: 68px; }
  .vm2 nav > a:not(.brand):not(.btn) { display: none; }
  .vm2 nav .btn { padding: 12px; font-size: 11px; }
  .vm2 nav > a.nav-login:not(.brand):not(.btn) { display: inline; font-size: 12px; margin-right: -6px; }
  .vm2 .nav-divider { display: none; }
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
/* ---------- Blog (landing section, /blogs, /blogs/:slug) ---------- */
.vm2 .blog-tabs { display: flex; gap: 9px; flex-wrap: wrap; margin: 0 0 30px; }
.vm2 .blog-tabs button { background: transparent; border: 1px solid rgb(200, 205, 191); padding: 10px 15px; border-radius: 3px; color: var(--ink); font-size: 12px; }
.vm2 .blog-tabs button.active { background: var(--ink); border-color: var(--ink); color: white; }
.vm2 .blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.vm2 .blog-card { display: flex; flex-direction: column; background: white; border: 1px solid var(--line); border-radius: 5px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
.vm2 .blog-card:hover { transform: translateY(-3px); box-shadow: rgba(36, 45, 32, 0.1) 0 16px 40px; }
.vm2 .blog-card .blog-cover { width: 100%; aspect-ratio: 5 / 3; display: block; }
.vm2 .blog-card-body { padding: 22px 22px 24px; display: flex; flex-direction: column; flex: 1; }
.vm2 .blog-tag { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: rgb(116, 140, 60); }
.vm2 .blog-card h3 { font-size: 19px; line-height: 1.3; margin: 10px 0 0; letter-spacing: -0.3px; }
.vm2 .blog-card p { font-size: 13px; line-height: 1.6; margin: 10px 0 16px; flex: 1; }
.vm2 .blog-meta { font: 11px monospace; color: var(--muted); }
.vm2 .blog-more { display: flex; justify-content: center; margin-top: 36px; }
.vm2 .blog-empty { padding: 40px 0; color: var(--muted); }
.vm2 .blog-hero { padding-top: 64px; padding-bottom: 30px; }
.vm2 .blog-hero h1 { font-size: clamp(40px, 5vw, 62px); letter-spacing: -2.5px; margin: 20px 0 10px; }
.vm2 .blog-hero p { max-width: 560px; }
.vm2 .blog-list { padding-top: 10px; }
.vm2 .pager { display: flex; justify-content: center; gap: 8px; margin-top: 36px; }
.vm2 .pager button { min-width: 38px; padding: 9px 12px; border: 1px solid var(--line); background: transparent; border-radius: 3px; font-size: 12px; }
.vm2 .pager button.active { background: var(--ink); color: white; border-color: var(--ink); }
.vm2 .pager button:disabled { opacity: 0.4; cursor: default; }
.vm2 .crumbs { font-size: 12px; color: var(--muted); display: flex; gap: 8px; flex-wrap: wrap; }
.vm2 .crumbs a:hover { color: var(--ink); text-decoration: underline; }
.vm2 .post { max-width: 780px; margin: 0 auto; padding: 48px 40px 10px; }
.vm2 .post h1 { font-size: clamp(34px, 4.4vw, 52px); letter-spacing: -2px; line-height: 1.1; margin: 18px 0 16px; }
.vm2 .post-cover { width: 100%; aspect-ratio: 5 / 3; display: block; border-radius: 6px; margin: 26px 0 10px; }
.vm2 .post-body p, .vm2 .post-body li { font-size: 17px; line-height: 1.75; color: rgb(52, 60, 55); }
.vm2 .post-body p { margin: 0 0 20px; }
.vm2 .post-body h2 { font-size: 29px; letter-spacing: -0.8px; margin: 44px 0 14px; }
.vm2 .post-body h3 { font-size: 21px; margin: 30px 0 10px; }
.vm2 .post-body ul, .vm2 .post-body ol { padding-left: 24px; margin: 0 0 22px; }
.vm2 .post-body li { margin-bottom: 10px; }
.vm2 .post-body strong { color: var(--ink); }
.vm2 .post-callout { border-left: 4px solid rgb(138, 171, 56); background: rgb(233, 237, 222); padding: 18px 22px; margin: 0 0 24px; border-radius: 0 4px 4px 0; }
.vm2 .post-callout p { margin: 0; }
.vm2 .post-table { width: 100%; border-collapse: collapse; margin: 0 0 26px; font-size: 14px; }
.vm2 .post-table-wrap { overflow-x: auto; }
.vm2 .post-table th, .vm2 .post-table td { text-align: left; padding: 11px 12px; border-bottom: 1px solid var(--line); line-height: 1.5; vertical-align: top; }
.vm2 .post-table th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.vm2 .post-faq { margin-top: 48px; }
.vm2 .post-faq h2 { margin-bottom: 6px; }
.vm2 .post-cta { margin: 50px 0 10px; background: rgb(23, 31, 27); color: var(--paper); border-radius: 6px; padding: 34px; }
.vm2 .post-cta h3 { margin: 0 0 8px; font-size: 26px; }
.vm2 .post-cta p { color: rgb(165, 176, 165); margin: 0 0 22px; }
.vm2 .post-back { display: inline-block; margin-top: 26px; font-size: 13px; font-weight: 700; }
.vm2 .related { border-top: 1px solid var(--line); margin-top: 60px; }
@media (max-width: 950px) {
  .vm2 .blog-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .vm2 .blog-grid { grid-template-columns: 1fr; }
  .vm2 .post { padding: 32px 22px 10px; }
  .vm2 .post-body p, .vm2 .post-body li { font-size: 16px; }
  .vm2 .post-cta { padding: 26px; }
}
`;
