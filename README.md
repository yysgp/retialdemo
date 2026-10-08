# Multivar Retail: Databricks prototype and executive deck

| Component | File |
|---|---|
| Synthetic data (8 tables, FY26 Oct-25–Sep-26, 5 EU markets) | `notebooks/01_generate_data.py` |
| Gold layer: unified sales, customer 360, stock health, markdowns, AI forecast, actions | `notebooks/02_gold_layer.sql` |
| AI/BI dashboard (3 pages: CFO / Merch / Ops) | `dashboard/multivar_exec.lvdash.json` (regenerate with `build_dashboard.py`) |
| Genie agent instructions, trusted SQL, demo questions | `genie/genie_agent_config.md` |
| 8-slide executive deck | `deck/multivar_exec_deck.pptx` (PowerPoint, speaker notes included; rebuild with `deck/build_pptx.js`) · `deck/multivar_exec_deck.html` |
| One-page retail industry study summary (sourced) | `deck/retail_industry_summary.pptx` (rebuild with `deck/build_industry_summary.js`) |
| One-page Databricks retail customer results (Al-Futtaim, Wehkamp, Skechers) | `deck/databricks_retail_case_studies.pptx` (rebuild with `deck/build_customer_cases.js`) |
| Run-of-show and talk track | `TALK_TRACK.md` |

## Deploy (about 15 min)
1. Import both notebooks into the workspace. Run `01` on serverless (about 2 min). It creates `multivar.retail.*`; change `CATALOG` if needed.
2. Run `02` on a SQL warehouse. `AI_FORECAST` needs a Pro or Serverless warehouse.
3. Dashboards → Import → `multivar_exec.lvdash.json`. Choose the warehouse and publish.
4. Genie → New agent. Add the tables listed in the config, then paste the instructions and the example SQL.

## Tables
`stores` (16) · `products` (58) · `customers` (6,000) · `pos_transactions` (~35k) · `online_orders` (~3.4k) ·
`inventory_snapshots` (~48k weekly) · `markdowns` (62) · `loyalty_events` (~5k)

The data includes these story signals: chronic stock-outs in a few stores with weak replenishment (estimated lost sales of about 2.5% of revenue); seasonal over-buying that leads to late, deep markdowns; omnichannel loyalty members spending about 3.3x more than store-only members; and online orders keyed by email hash, so they only join to loyalty through `customers`.

To run locally: `python notebooks/01_generate_data.py --local out/` writes CSVs.
