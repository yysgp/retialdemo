// Builds deck/databricks_retail_case_studies.pptx — one-page summary of 3 Databricks retail customer stories.
// All facts are taken from the customer stories on databricks.com (URLs on the slide).
// Run: PPTX_SKILL=<pptx skill dir> node deck/build_customer_cases.js
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
pres.title = "Databricks Retail Customer Results";
const C = pres.SchemeColor;
const W = 13.33, M = 0.5;

pres.defineSlideMaster({
  title: "ONEPAGER", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: M, y: 0.3, w: W - 2 * M, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.6, w: W - 2 * M, h: 0.65, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});

pres.addSection({ title: "Customer proof" });
const s = pres.addSlide({ masterName: "ONEPAGER", sectionTitle: "Customer proof" });
s.addText("RETAILERS ON DATABRICKS · PUBLISHED CUSTOMER RESULTS", { placeholder: "kicker" });
s.addText("Fix the data first, then both lines of the P&L move", { placeholder: "title" });

const cases = [
  {
    name: "Al-Futtaim", profile: "Retail group, Middle East (incl. Marks & Spencer)",
    challenge: "Data silos across brands meant no single view of the customer. BI was slow and forecasting couldn't scale.",
    built: "A \"golden customer record\" in Delta Lake that feeds demand forecasting and the Blue loyalty programme.",
    top: ["+10%", "sales from a data- and AI-targeted campaign (Toyota, UAE)"],
    bottom: ["−30%", "lost-sale and inventory holding cost (M&S forecasting)"],
    url: "databricks.com/customers/al-futtaim",
  },
  {
    name: "Wehkamp", profile: "Dutch online retailer · 400k products",
    challenge: "A Hadoop data warehouse that needed heavy DevOps support. Only analysts could use the data, and new features took over a year.",
    built: "A lakehouse with MLflow: 10 types of recommendation, product-image classification, hundreds of models trained a day.",
    top: ["2×", "revenue expected from personalisation (company target)"],
    bottom: ["−70%", "operational cost after moving from Hadoop to Databricks"],
    url: "databricks.com/customers/wehkamp",
  },
  {
    name: "Skechers", profile: "Global footwear brand · stores and e-commerce",
    challenge: "Channel-centric data and marketing; the brand couldn't treat a shopper as one customer across digital and stores.",
    built: "Customer-centric data on Databricks with a composable CDP (Uniphore, formerly ActionIQ) for personalised journeys.",
    top: ["+28%", "return on ad spend; click-through rate up 324%"],
    bottom: ["−68%", "acquisition cost (cost per click)"],
    url: "databricks.com/customers/skechers",
  },
];

const top = 1.45, cardH = 5.0, gap = 0.3, cw = (W - 2 * M - 2 * gap) / 3, pad = 0.25;
cases.forEach((c, i) => {
  const x = M + i * (cw + gap), ix = x + pad, iw = cw - 2 * pad;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: top, w: cw, h: cardH, rectRadius: 0.1, fill: { color: C.background2 },
    line: { color: C.accent5, width: 0.75 }, objectName: `case-${i + 1}` });
  s.addText(c.name, { x: ix, y: top + 0.2, w: iw, h: 0.42, fontSize: 22, bold: true, color: C.text1, fontFace: THEME.headFontFace, margin: 0, isTextBox: true });
  s.addText(c.profile, { x: ix, y: top + 0.62, w: iw, h: 0.28, fontSize: 11, color: C.accent4, margin: 0, isTextBox: true });

  const block = (label, text, y, h) => {
    s.addText(label, { x: ix, y, w: iw, h: 0.24, fontSize: 10, bold: true, color: C.accent1, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(text, { x: ix, y: y + 0.26, w: iw, h, fontSize: 12.5, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  };
  block("DATA CHALLENGE", c.challenge, top + 1.0, 0.8);
  block("WHAT THEY BUILT", c.built, top + 2.1, 0.8);

  // Top line / bottom line tiles
  const ty = top + 3.15, th = 1.4, tw = (iw - 0.15) / 2;
  [["TOP LINE", c.top, C.accent3], ["BOTTOM LINE", c.bottom, C.accent6]].forEach(([label, [stat, text], col], j) => {
    const tx = ix + j * (tw + 0.15);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx, y: ty, w: tw, h: th, rectRadius: 0.08, fill: { color: C.background1 },
      line: { color: C.accent5, width: 0.75 }, objectName: `case-${i + 1}-${label.toLowerCase().replace(" ", "-")}` });
    s.addText(label, { x: tx + 0.12, y: ty + 0.1, w: tw - 0.24, h: 0.22, fontSize: 9, bold: true, color: col, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(stat, { x: tx + 0.12, y: ty + 0.3, w: tw - 0.24, h: 0.45, fontSize: 24, bold: true, color: col, fontFace: THEME.headFontFace, margin: 0, isTextBox: true });
    s.addText(text, { x: tx + 0.12, y: ty + 0.76, w: tw - 0.24, h: 0.7, fontSize: 10, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  });
  s.addText([{ text: "Source: " }, { text: c.url, options: { hyperlink: { url: "https://www." + c.url } } }],
    { x: ix, y: top + cardH - 0.3, w: iw, h: 0.22, fontSize: 9, color: C.accent4, margin: 0, isTextBox: true });
});

s.addText([{ text: "The common pattern: ", options: { bold: true, color: C.accent1 } },
  { text: "unify siloed customer, sales and stock data first; forecasting and personalisation then pay back in revenue and cost. This is the path we propose for Multivar." }],
  { x: M, y: top + cardH + 0.15, w: W - 2 * M, h: 0.5, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true });
s.addText("Figures as published by Databricks in each customer's story on databricks.com (self-reported by the customer). Wehkamp's 2× revenue is the company's stated expectation, not a measured result.",
  { x: M, y: 7.05, w: W - 2 * M, h: 0.3, fontSize: 9, color: C.accent4, margin: 0, isTextBox: true });

s.addNotes("Use one story per person. Al-Futtaim for Merchandising and the CFO: forecasting cut lost-sale and inventory holding cost by 30%. Wehkamp for the VP Ops & Data: a European retailer that left a heavy legacy platform and cut operating cost by about 70%. Skechers for the CFO and marketing: a single customer view made acquisition 68% cheaper and raised ROAS by 28%. All figures are from Databricks' published customer stories. Be clear that Wehkamp's 2x revenue is a stated expectation.");

(async () => {
  const out = path.join(__dirname, "databricks_retail_case_studies.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
