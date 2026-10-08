// Builds deck/retail_industry_summary.pptx — one-page retail industry study summary.
// Run: PPTX_SKILL=<pptx skill dir> node deck/build_industry_summary.js
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
pres.title = "Retail Industry Study Summary";
const C = pres.SchemeColor;
const W = 13.33, M = 0.5;

pres.defineSlideMaster({
  title: "ONEPAGER", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: M, y: 0.3, w: W - 2 * M, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.6, w: W - 2 * M, h: 0.65, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});

pres.addSection({ title: "Industry summary" });
const s = pres.addSlide({ masterName: "ONEPAGER", sectionTitle: "Industry summary" });
s.addText("RETAIL INDUSTRY STUDY · SUMMARY OF PUBLISHED RESEARCH, 2025–2026", { placeholder: "kicker" });
s.addText("Retail's margin squeeze is a data problem first", { placeholder: "title" });

const cols = [
  { tag: "BUSINESS CHALLENGES", color: C.accent1, items: [
    ["~$1.7T", "lost a year to out-of-stocks and overstocks: 6.2% of global retail sales", "1"],
    ["15.8%", "of US retail sales returned in 2025 (~$850B); 19.3% for online sales", "2"],
    ["~70%", "of retail leaders see trading down as structural; nearly all expect higher trade costs", "3"],
    ["1–2%", "forecast 2026 fashion growth in Europe; nearly half of executives expect worse", "4"],
  ] },
  { tag: "GROWTH AREAS", color: C.accent3, items: [
    ["40%", "more revenue from personalisation at leaders; 71% of consumers expect it", "5"],
    ["68%", "of retailers plan to deploy agentic AI within the next 12–24 months", "3"],
    ["$178B", "commerce media revenue in 2025 (+11.6%), now ahead of TV; retail media up 11.3%", "6"],
    ["2–3×", "faster growth for resale than first-hand fashion through 2027", "4"],
  ] },
  { tag: "ASSOCIATED DATA ISSUES", color: C.accent6, items: [
    ["63%", "of organisations lack, or can't confirm, data management practices ready for AI", "7"],
    ["60%", "of AI projects without AI-ready data will be abandoned through 2026 (Gartner forecast)", "7"],
    ["3 in 10", "retailers use AI for supply-chain visibility today; 41% expect to within a year", "3"],
    ["78%", "of EU internet users bought online in 2025: journeys now span store and web", "8"],
  ] },
];

const top = 1.5, colH = 4.45, gap = 0.3, cw = (W - 2 * M - 2 * gap) / 3;
cols.forEach((col, ci) => {
  const x = M + ci * (cw + gap);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: top, w: cw, h: colH, rectRadius: 0.1, fill: { color: C.background2 },
    line: { color: C.accent5, width: 0.75 }, objectName: `column-${ci + 1}` });
  s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: top + 0.22, w: 0.22, h: 0.22, fill: { color: col.color }, objectName: `dot-${ci + 1}` });
  s.addText(col.tag, { x: x + 0.57, y: top + 0.17, w: cw - 0.8, h: 0.32, fontSize: 13, bold: true, color: col.color, charSpacing: 1, margin: 0, isTextBox: true });
  col.items.forEach(([stat, text, ref], i) => {
    const y = top + 0.68 + i * 0.95;
    s.addText(stat, { x: x + 0.25, y, w: 1.15, h: 0.8, fontSize: 22, bold: true, color: col.color, fontFace: THEME.headFontFace, valign: "top", margin: 0, isTextBox: true });
    s.addText([{ text }, { text: ` [${ref}]`, options: { color: C.accent4, superscript: false, fontSize: 10 } }],
      { x: x + 1.45, y, w: cw - 1.65, h: 0.85, fontSize: 12.5, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  });
});

// Takeaway
s.addText([{ text: "So what: ", options: { bold: true, color: C.accent1 } },
  { text: "the growth levers (forecasting, markdown, personalisation, AI agents) all depend on one trusted view of customer, stock and returns. Retailers that fix the data foundation first can capture them; the rest stay in pilots." }],
  { x: M, y: top + colH + 0.12, w: W - 2 * M, h: 0.5, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true });

// Sources
const src = [
  "[1] IHL Group, The 2026 Inventory Distortion Study (2026)",
  "[2] NRF & Happy Returns, 2025 Retail Returns Landscape (Oct 2025)",
  "[3] Deloitte, 2026 Global Retail Industry Outlook (survey of 330 retail executives)",
  "[4] The Business of Fashion & McKinsey & Company, The State of Fashion 2026 (Nov 2025)",
  "[5] McKinsey & Company, The value of getting personalization right—or wrong—is multiplying (Nov 2021)",
  "[6] WPP Media, This Year Next Year: end-of-year global forecast (Dec 2025)",
  "[7] Gartner, Lack of AI-Ready Data Puts AI Projects at Risk (press release, 26 Feb 2025)",
  "[8] Eurostat, E-commerce statistics for individuals (2025 data, Feb 2026)",
];
const half = Math.ceil(src.length / 2);
[src.slice(0, half), src.slice(half)].forEach((list, i) => {
  s.addText(list.map((t, j) => ({ text: t, options: { breakLine: j < list.length - 1 } })),
    { x: M + i * ((W - 2 * M) / 2 + 0.1), y: 6.78, w: (W - 2 * M) / 2 - 0.1, h: 0.68, fontSize: 9, color: C.accent4, valign: "top", margin: 0, isTextBox: true, objectName: `sources-${i + 1}` });
});

s.addNotes("All figures are from published research by the organisations listed at the foot of the slide. Survey-based figures (Deloitte, BoF-McKinsey, Gartner) are executive expectations; IHL and NRF figures are modelled estimates. Use the 2–3 numbers most relevant to the audience: inventory distortion and returns for merchandising, value-seeking and margin for the CFO, AI-ready data for the data leader.");

(async () => {
  const out = path.join(__dirname, "retail_industry_summary.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
