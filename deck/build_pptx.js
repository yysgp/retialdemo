// Builds deck/multivar_exec_deck.pptx — run: node deck/build_pptx.js
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
pres.title = "Multivar Margin Plan";
const C = pres.SchemeColor;
let fy;
const W = 13.33, M = 0.6;

pres.defineSlideMaster({
  title: "DARK", background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: M, y: 1.6, w: W - 2 * M, h: 0.5, fontSize: 14, bold: true, color: C.accent1, charSpacing: 2 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 2.2, w: W - 2 * M, h: 2.2, fontSize: 44, bold: true, color: C.background1, valign: "top", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: M, y: 4.6, w: 10, h: 1.2, fontSize: 20, color: C.accent5, valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: M, y: 0.4, w: W - 2 * M, h: 0.4, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.8, w: W - 2 * M, h: 1.0, fontSize: 34, bold: true, color: C.text1, valign: "top", align: "left" }, text: "" } },
    { text: { text: "Multivar × Databricks  ·  Confidential", options: { x: M, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: C.accent4 } } },
  ],
  slideNumber: { x: W - 1.1, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.accent4 },
});

// ---- helpers ----
function cards(slide, items, { y = 2.1, h = 3.6, cols = items.length } = {}) {
  const gap = 0.35, cw = (W - 2 * M - gap * (cols - 1)) / cols;
  items.forEach((it, i) => {
    const x = M + i * (cw + gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h, rectRadius: 0.12, fill: { color: C.background2 },
      line: { color: C.accent5, width: 0.75 }, objectName: `card${i + 1}` });
    let ty = y + 0.25;
    if (it.tag) { slide.addText(it.tag, { x: x + 0.25, y: ty, w: cw - 0.5, h: 0.32, fontSize: 11, bold: true, color: it.tagColor || C.accent1, margin: 0, isTextBox: true }); ty += 0.4; }
    if (it.big) { slide.addText(it.big, { x: x + 0.25, y: ty, w: cw - 0.5, h: 0.9, fontSize: 48, bold: true, color: C.accent1, fontFace: THEME.headFontFace, margin: 0, isTextBox: true }); ty += 1.0; }
    slide.addText(it.head, { x: x + 0.25, y: ty, w: cw - 0.5, h: 0.75, fontSize: 18, bold: true, color: C.text1, valign: "top", margin: 0, isTextBox: true });
    ty += 0.8;
    const body = Array.isArray(it.body)
      ? it.body.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < it.body.length - 1, paraSpaceAfter: 4 } }))
      : it.body;
    slide.addText(body, { x: x + 0.25, y: ty, w: cw - 0.5, h: y + h - ty - 0.2, fontSize: 14, color: C.accent4, valign: "top", margin: 0, isTextBox: true });
  });
  return y + h + 0.4;
}
function footer(slide, runs, y = 6.05) {
  slide.addText(runs, { x: M, y, w: W - 2 * M, h: 0.75, fontSize: 16, color: C.text1, valign: "top", margin: 0, isTextBox: true });
}
const content = (sec, kicker, title) => {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
  s.addText(kicker, { placeholder: "kicker" }); s.addText(title, { placeholder: "title" });
  return s;
};

// ---- 1 Title ----
pres.addSection({ title: "Open" });
let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Open" });
s.addText("MULTIVAR × DATABRICKS  ·  EXECUTIVE SESSION", { placeholder: "kicker" });
s.addText("Stop flying blind on stock and markdowns. Protect margin in weeks, not years", { placeholder: "title" });
s.addText("One trusted view of customer and stock across every market and channel, built with the team you already have.", { placeholder: "body" });
s.addNotes("Address the empty chairs: our sales lead and your SA are stuck at the airport. You get the full conversation and I'll follow up with them within 24 hours. I'd rather spend most of today listening than presenting.");

// ---- 2 What we heard ----
pres.addSection({ title: "Discovery" });
s = content("Discovery", "01 · WHAT WE HEARD. CORRECT US.", "Margin is leaking in places nobody can see in time");
fy = cards(s, [
  { head: "Four systems, no single truth", body: "POS, web, inventory and loyalty were bolted on over time. Every decision starts with a spreadsheet that is already out of date." },
  { head: "Merchandising is guessing", body: "Seasonal buys are a one-shot bet. Markdowns come late and deep. Fast movers run out in the same stores again and again." },
  { head: "A small team with a long backlog", body: "Every ambitious ask becomes a ticket. A heavyweight platform you can't staff would only add risk." },
], { h: 2.6 });
footer(s, [{ text: "For the room: ", options: { bold: true } }, { text: "What share of revenue goes to markdowns? How fast do you know a store is out of stock? Which decision would you change first with trusted data?" }], fy);
s.addNotes("CFO: what did markdowns cost last year as % of sales, and what GM% are you committed to? Merch: when a fast mover sells out in Lyon, when do you find out? Ops & Data: how big is the team, what's at the top of the backlog, what failed last time? Validate: ~€400M revenue, 5 markets, ~15% online, loyalty covers 40-60% of sales.");

// ---- 3 Cost of inaction ----
s = content("Discovery", "02 · THE COST OF STANDING STILL", "Every season of waiting costs margin you can't recover");
fy = cards(s, [
  { big: "2–4%", head: "of sales lost to stock-outs", body: "Concentrated in a handful of stores and fast movers, so it's fixable." },
  { big: "10–15%", head: "of full-price value given away in markdowns", body: "Typical for European mid-market fashion. Late, reactive clearance is the costliest kind." },
  { big: "~3×", head: "spend from omnichannel members", body: "Today you can't see them, so you can't grow them." },
], { h: 3.0 });
footer(s, [{ text: "At around €400M revenue: " }, { text: "€4–7M gross margin a year", options: { bold: true, color: C.accent1 } },
  { text: " from recovering a third of stock-out loss and cutting markdowns 10–15%. A hypothesis we validate on your data in 6 weeks.", options: { color: C.accent4 } }], fy);
s.addNotes("Replace the €400M with their own revenue and markdown figures from discovery. Say it as 'so for you, that's roughly €X'.");

// ---- 4 Success metrics ----
s = content("Discovery", "03 · WHAT SUCCESS LOOKS LIKE, IN YOUR METRICS", "We agree on the scoreboard before we build anything");
fy = cards(s, [
  { tag: "HEAD OF MERCHANDISING & SUPPLY", head: "Stock-outs on top 200 SKUs down 30%", body: ["On-shelf availability up", "Forecast accuracy (WAPE) by category and store", "Full-price sell-through up"] },
  { tag: "CFO / COMMERCIAL DIRECTOR", head: "Markdown spend down 10–15%", body: ["Gross margin up 50–100 bps", "Value shown in weeks", "Fixed pilot cost, no multi-year commitment"] },
  { tag: "VP RETAIL OPS & DATA", head: "One customer and stock view, daily", body: ["Self-serve answers in minutes, not backlog tickets", "Run by a team of 3–4", "Open formats, no lock-in"] },
], { h: 3.3 });
s.addNotes("Get each person to agree to one metric. Don't move on until the CFO accepts the baseline-and-target approach.");

// ---- 5 Proof point ----
pres.addSection({ title: "Demo" });
s = content("Demo", "04 · PROOF POINT, BUILT ON MULTIVAR-SHAPED DATA", "What one trusted platform looks like on day one");
fy = cards(s, [
  { tag: "1 · FOUNDATION", head: "One governed place for all data", body: "POS, online, inventory, loyalty, markdowns and products together. Online shoppers matched to their loyalty IDs." },
  { tag: "2 · DASHBOARD", head: "Executive view of margin & stock", body: "Margin leakage, lost sales by store, a 12-week demand forecast, and this week's reorder list." },
  { tag: "3 · GENIE", head: "Ask in plain language", body: "\"Which stores lost the most to stock-outs?\" \"What would a 20% markdown cut be worth?\" Answers in seconds, with your definitions." },
], { h: 2.9 });
footer(s, [{ text: "Live demo: ", options: { bold: true, color: C.accent1 } }, { text: "5 minutes, one question each for Merchandising, Ops and Finance." }], fy);
s.addNotes("Dashboard Margin page (CFO) → Stock page (Merch: four stores, replenishment not demand; forecast; Monday reorder list) → Genie, one question per persona → Customer page (omnichannel ~3x). If something breaks: 'this step joins the online email to the loyalty ID — that join is the single customer view.'");

// ---- 6 Vision ----
pres.addSection({ title: "Vision & plan" });
s = content("Vision & plan", "05 · THE VISION", "From reporting the past to deciding next week");
const steps = [
  { tag: "SEE", head: "One truth", body: "Customer 360 and stock positions across 5 markets and both channels. Spreadsheets retired.", c: C.accent1 },
  { tag: "PREDICT", head: "Demand-led merchandising", body: "SKU × store forecasts drive buys, allocation and replenishment. Markdowns planned early and kept shallow.", c: C.accent2 },
  { tag: "ACT", head: "Personal & automated", body: "Next-best offers for loyalty members, AI assistants for planners and store managers, supplier data sharing.", c: C.accent3 },
];
const sw = 3.6, sg = (W - 2 * M - 3 * sw) / 2;
steps.forEach((st, i) => {
  const x = M + i * (sw + sg);
  s.addShape(pres.shapes.OVAL, { x: x, y: 2.15, w: 0.9, h: 0.9, fill: { color: st.c }, objectName: `step${i + 1}` });
  s.addText(String(i + 1), { x: x, y: 2.15, w: 0.9, h: 0.9, fontSize: 28, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText(st.tag, { x: x + 1.1, y: 2.2, w: sw - 1.1, h: 0.35, fontSize: 12, bold: true, color: st.c, margin: 0, isTextBox: true });
  s.addText(st.head, { x: x + 1.1, y: 2.55, w: sw - 1.1, h: 0.5, fontSize: 20, bold: true, color: C.text1, margin: 0, isTextBox: true });
  s.addText(st.body, { x: x, y: 3.35, w: sw, h: 1.6, fontSize: 15, color: C.accent4, valign: "top", margin: 0, isTextBox: true });
  if (i < 2) s.addText("→", { x: x + sw, y: 2.15, w: sg, h: 0.9, fontSize: 32, color: C.accent5, align: "center", valign: "middle", margin: 0, isTextBox: true });
});
footer(s, "Europe's leading omnichannel retailers already run demand-led allocation. A mid-market team can now get there without building a large data organisation.", 5.0);
s.addNotes("Peers: Inditex, H&M and Primark run demand-led allocation. Lakehouse makes that achievable for a mid-market team.");

// ---- 7 Roadmap ----
s = content("Vision & plan", "06 · THE ROADMAP", "Value in weeks. Each phase pays for the next");
fy = cards(s, [
  { tag: "WEEKS 0–6 · PROVE", tagColor: C.accent1, head: "Stock-outs + markdown baseline", body: ["Connect POS, web, inventory and loyalty for one market", "Dashboard + Genie for merch & finance", "Validate the € case on real data", "Exit: CFO signs off baseline and target"] },
  { tag: "MONTHS 2–6 · SCALE", tagColor: C.accent2, head: "All markets, forecasting live", body: ["SKU × store forecast in the weekly buy/replenishment cycle", "Markdown recommendations for AW26 end of season", "Customer 360 used by CRM", "Exit: measured drop in stock-outs and markdowns"] },
  { tag: "MONTHS 6–18 · DIFFERENTIATE", tagColor: C.accent3, head: "Personalisation & AI assistants", body: ["Loyalty personalisation and retention", "Planner & store-manager assistants", "Supplier collaboration, pricing", "Exit: growth levers, not only savings"] },
], { h: 3.9 });
s.addNotes("Objection 'we can't staff it': serverless, no infrastructure, SQL-first so your 2-4 analysts run it; Genie takes ad-hoc questions off the backlog. 'Cost/risk': fixed-scope sprint with exit gate, pay-per-use, data stays in your cloud in open formats. 'Why not our ERP/BI vendor': they report the past and don't combine loyalty, web and stock with forecasting and AI.");

// ---- 8 Decision ----
pres.addSection({ title: "Close" });
s = content("Close", "07 · DECISION TODAY", "Start a 6-week value sprint on your data");
fy = cards(s, [
  { head: "What we ask", body: ["An executive sponsor (CFO) and a business owner (Merch)", "2 people from your data team, part-time", "Read access to POS, web, inventory and loyalty extracts"] },
  { head: "What Databricks brings", body: ["Dedicated SA + field engineering pod", "Pay-as-you-go serverless: nothing to staff", "Retail accelerators: forecasting, markdown, customer 360"] },
  { head: "Next 10 days", body: ["Day 2: success metrics signed", "Day 5: data access & security review", "Day 10: kick-off; first market live in week 3"] },
], { h: 3.0 });
footer(s, [{ text: "If week 6 doesn't show a credible path to the margin target, you stop, ", options: { bold: true } }, { text: "with no long-term commitment." }], fy);
s.addNotes("Close: 'Can we agree on a sponsor and the success metrics by Thursday, so we can kick off on day 10?' Get a name and a date.");

(async () => {
  const out = path.join(__dirname, "multivar_exec_deck.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
