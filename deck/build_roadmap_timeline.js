// Builds deck/roadmap_timeline.pptx — the roadmap slide redesigned as a timeline.
// Run: PPTX_SKILL=<pptx skill dir> node deck/build_roadmap_timeline.js
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const THEME = {
  name: "Multivar", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: "1B1F24", lt1: "FFFFFF", dk2: "1B3139", lt2: "F3F1EC", accent1: "FF3621", accent2: "F59E0B",
            accent3: "0B6E4F", accent4: "5D6570", accent5: "E3DED4", accent6: "2F3C7E", hlink: "FF3621", folHlink: "5D6570" },
};
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Multivar Roadmap";
const C = pres.SchemeColor;
const W = 13.33, M = 0.6;

pres.defineSlideMaster({
  title: "CONTENT", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: M, y: 0.4, w: W - 2 * M, h: 0.4, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.8, w: W - 2 * M, h: 1.0, fontSize: 34, bold: true, color: C.text1, align: "left", valign: "top", margin: 0 }, text: "" } },
    { text: { text: "Multivar × Databricks  ·  Confidential", options: { x: M, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: C.accent4, margin: 0 } } },
  ],
});

pres.addSection({ title: "Roadmap" });
const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Roadmap" });
s.addText("· THE ROADMAP", { placeholder: "kicker" });
s.addText("Value in weeks. Each phase pays for the next", { placeholder: "title" });

const phases = [
  { name: "PROVE", when: "WEEKS 0–6", color: C.accent1, head: "Stock-outs + markdown baseline",
    items: ["Connect POS, web, inventory and loyalty for one market", "Dashboard + Genie for merch & finance", "Validate the $ case on real data"],
    exit: "CFO signs off baseline and target" },
  { name: "SCALE", when: "MONTHS 2–6", color: C.accent2, head: "All markets, forecasting live",
    items: ["SKU × store forecast in the weekly buy/replenishment cycle", "Markdown recommendations for Winter26 end of season", "CDP powered C360"],
    exit: "Measured drop in stock-outs and markdowns" },
  { name: "DIFFERENTIATE", when: "MONTHS 6–18", color: C.accent3, head: "Personalisation & AI assistants",
    items: ["Loyalty personalisation and retention", "Planner & store-manager AI assistants", "Supplier collaboration, pricing"],
    exit: "Growth levers, not only savings" },
];

// Segment widths grow with each phase so the bar hints at the longer horizon.
const widths = [3.55, 4.05, 4.53];
const xs = widths.reduce((acc, w, i) => (acc.push(i ? acc[i - 1] + widths[i - 1] : M), acc), []);
const barY = 3.0, barH = 0.62, colPad = 0.15;

phases.forEach((p, i) => {
  const x = xs[i], w = widths[i], cx = x + colPad, cw = w - 2 * colPad - 0.2;

  // Above the bar: timing + outcome
  s.addText(p.when, { x: cx, y: 1.85, w: cw, h: 0.3, fontSize: 12, bold: true, color: p.color, charSpacing: 1, margin: 0, isTextBox: true });
  s.addText(p.head, { x: cx, y: 2.15, w: cw, h: 0.7, fontSize: 18, bold: true, color: C.text1, valign: "top", margin: 0, isTextBox: true });

  // The timeline bar: one arrow segment per phase
  s.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, {
    x, y: barY, w: w + (i < 2 ? 0.25 : 0), h: barH, fill: { color: p.color }, line: { color: C.background1, width: 2 },
    objectName: `phase-${i + 1}-bar` });
  s.addText(p.name, { x: x + (i ? 0.45 : 0.2), y: barY, w: w - 0.8, h: barH, fontSize: 15, bold: true, color: C.background1,
    charSpacing: 2, valign: "middle", margin: 0, isTextBox: true });

  // Below the bar: what we do
  s.addText(p.items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < p.items.length - 1, paraSpaceAfter: 6 } })),
    { x: cx, y: 3.9, w: cw, h: 1.75, fontSize: 14, color: C.accent4, valign: "top", margin: 0, isTextBox: true });

  // Exit gate: diamond milestone + criterion
  const gy = 5.8;
  s.addShape(pres.shapes.DIAMOND, { x: cx, y: gy + 0.04, w: 0.32, h: 0.32, fill: { color: p.color }, objectName: `phase-${i + 1}-gate` });
  s.addText("EXIT GATE", { x: cx + 0.45, y: gy, w: cw - 0.45, h: 0.24, fontSize: 10, bold: true, color: p.color, charSpacing: 1, margin: 0, isTextBox: true });
  s.addText(p.exit, { x: cx + 0.45, y: gy + 0.24, w: cw - 0.45, h: 0.55, fontSize: 14, bold: true, color: C.text1, valign: "top", margin: 0, isTextBox: true });
});

// Thin dividers between phase columns (below the bar) to anchor each column to its segment
[1, 2].forEach((i) => {
  s.addShape(pres.shapes.LINE, { x: xs[i] - 0.05, y: 3.8, w: 0, h: 2.75, line: { color: C.accent5, width: 1, dashType: "dash" }, objectName: `divider-${i}` });
});

s.addNotes("Read the timeline left to right. Each phase ends at an exit gate the business signs off before the next one starts, so the commitment grows only as value is proven. Phase 1 is six weeks on one market; phase 2 scales to all markets and puts forecasting into the weekly buy and replenishment cycle; phase 3 moves from savings to growth.");

(async () => {
  const out = path.join(__dirname, "roadmap_timeline.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
