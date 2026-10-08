# Genie Agent — "Multivar Commercial Assistant"

**Tables to add (gold first, raw for drill-down):** `multivar.retail.sales_unified`, `customer_360`, `stock_health`,
`markdown_performance`, `demand_forecast`, `replenishment_actions`, `products`, `stores`.
**Warehouse:** Serverless SQL (small). **Audience:** Exec team, merchandising, store ops.

## General instructions (paste into the agent)
```
You are the commercial analyst for Multivar, an omnichannel fashion & lifestyle retailer in NL, BE, DE, FR and ES.
Answer for business leaders: lead with the number and the "so what" in one sentence, then a small table or chart.

Business definitions (always use these):
- Revenue / net sales = SUM(net_sales_eur). All money is EUR. Format as € with thousands separators.
- Gross margin € = SUM(gross_margin_eur); gross margin % = gross margin € / net sales.
- Markdown cost = SUM(markdown_cost_eur) = revenue given away versus full price.
- Full-price sell-through = share of units sold with discount_pct = 0.
- Stock-out = a store x SKU with zero on-hand in a weekly snapshot. Lost sales = stock_health.est_lost_sales_eur.
- Omnichannel customer = loyalty member who bought both in store and online (customer_360.channel_segment).
- "Last 12 months" / "this year" = 2025-10-01 to 2026-09-30 (fiscal year FY26). Q1 = Oct-Dec.
- Seasons: AW25 = Autumn/Winter (Sep-Feb), SS26 = Spring/Summer (Mar-Aug), CORE = never-out-of-stock basics.
- Store 'WEB' / channel 'Online' is the e-commerce site; market 'ALL' on the web store means cross-market.
- For forecasts use demand_forecast where is_forecast = true; quote the range (units_lower-units_upper), not only the point.

Rules:
- Prefer the gold views (sales_unified, customer_360, stock_health, markdown_performance, demand_forecast) over raw tables.
- Exclude returned online lines (returned = true) when the user asks about "net of returns".
- Round money to the nearest € thousand in commentary. Never invent data that is not in the tables.
- If a question is ambiguous (e.g., "best store"), state the assumption you used (by revenue unless told otherwise).
```

## Example SQL (add as trusted queries)
**Where are stock-outs costing us the most?**
```sql
SELECT store_name, market, SUM(est_lost_sales_eur) AS lost_sales_eur, SUM(stockout_weeks) AS stockout_weeks
FROM multivar.retail.stock_health GROUP BY ALL ORDER BY lost_sales_eur DESC LIMIT 10;
```
**How much are omnichannel customers worth versus single-channel?**
```sql
SELECT channel_segment, COUNT(*) AS members, ROUND(AVG(total_spend_eur),0) AS avg_spend_eur,
       ROUND(AVG(gross_margin_eur),0) AS avg_margin_eur
FROM multivar.retail.customer_360 WHERE channel_segment <> 'Inactive' GROUP BY ALL ORDER BY avg_spend_eur DESC;
```
**What did markdowns cost us by category last season?**
```sql
SELECT category, SUM(markdown_cost_eur) AS markdown_cost_eur, SUM(net_sales_eur) AS net_sales_eur,
       ROUND(SUM(markdown_cost_eur)/SUM(net_sales_eur+markdown_cost_eur)*100,1) AS pct_of_full_price
FROM multivar.retail.markdown_performance WHERE season = 'SS26' GROUP BY ALL ORDER BY 2 DESC;
```

## Demo questions (in this order — one per persona)
1. **Head of Merchandising:** *"Which 5 stores lost the most sales to stock-outs this year, and in which categories?"*
   → A handful of stores (Lille, Utrecht, Berlin, Barcelona) stand out — a replenishment-process problem, not a demand problem. "This is the list your planners don't have today."
2. **VP Retail Ops & Data:** *"How much more do omnichannel loyalty members spend than store-only members, and how many store-only members in Germany have opted in to marketing?"*
   → ~3x spend; yields an addressable target list — single view of customer in one question, no ticket to the data team.
3. **CFO:** *"What was our total markdown cost in FY26 as a % of full-price sales, and what would a 20% reduction be worth in margin?"*
   → Turns the analysis into a € number the CFO can underwrite.

Backup: *"Forecast Womenswear units for the next 8 weeks with a range"* · *"Which CORE SKUs need reordering this week?"*
