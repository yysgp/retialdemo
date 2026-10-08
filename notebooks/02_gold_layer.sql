-- Databricks notebook source
-- MAGIC %md
-- MAGIC # Multivar — gold layer: one trusted view of customer, stock and margin
-- MAGIC These views are what the dashboard and the Genie agent read. Each one replaces a spreadsheet the team rebuilds by hand today.

-- COMMAND ----------
USE CATALOG multivar;
USE SCHEMA retail;

-- COMMAND ----------
-- 1. Unified sales: store + online in one table, online customers resolved to their loyalty id
CREATE OR REPLACE VIEW sales_unified
COMMENT 'All sales lines across stores and e-commerce. channel = Store | Online. loyalty_id null = anonymous/guest. Amounts in EUR.'
AS
SELECT p.pos_line_id AS line_id, 'Store' AS channel, CAST(p.txn_ts AS DATE) AS sale_date, p.store_id, s.market,
       p.loyalty_id, p.sku, p.quantity, p.unit_price_eur, p.discount_pct, p.net_sales_eur, p.cost_eur,
       p.net_sales_eur - p.cost_eur AS gross_margin_eur,
       ROUND(p.net_sales_eur / (1 - p.discount_pct), 2) - p.net_sales_eur AS markdown_cost_eur,
       FALSE AS returned
FROM pos_transactions p JOIN stores s USING (store_id)
UNION ALL
SELECT o.order_line_id, 'Online', CAST(o.order_ts AS DATE), 'WEB', o.ship_market,
       c.loyalty_id, o.sku, o.quantity, o.unit_price_eur, o.discount_pct, o.net_sales_eur, o.cost_eur,
       o.net_sales_eur - o.cost_eur,
       ROUND(o.net_sales_eur / (1 - o.discount_pct), 2) - o.net_sales_eur,
       o.returned
FROM online_orders o LEFT JOIN customers c ON o.customer_email_hash = c.email_hash;

-- COMMAND ----------
-- 2. Customer 360: single view of every loyalty member across channels
CREATE OR REPLACE VIEW customer_360
COMMENT 'One row per loyalty member with 12-month spend by channel and channel segment (Store only / Online only / Omnichannel / Inactive).'
AS
WITH s AS (
  SELECT loyalty_id,
         SUM(CASE WHEN channel = 'Store'  THEN net_sales_eur END) AS store_spend_eur,
         SUM(CASE WHEN channel = 'Online' THEN net_sales_eur END) AS online_spend_eur,
         SUM(gross_margin_eur) AS gross_margin_eur,
         COUNT(DISTINCT sale_date || channel) AS visits,
         MAX(sale_date) AS last_purchase_date
  FROM sales_unified WHERE loyalty_id IS NOT NULL GROUP BY loyalty_id)
SELECT c.loyalty_id, c.market, c.loyalty_tier, c.age_band, c.marketing_opt_in, c.home_store_id,
       COALESCE(store_spend_eur, 0) AS store_spend_eur, COALESCE(online_spend_eur, 0) AS online_spend_eur,
       COALESCE(store_spend_eur, 0) + COALESCE(online_spend_eur, 0) AS total_spend_eur,
       COALESCE(gross_margin_eur, 0) AS gross_margin_eur, COALESCE(visits, 0) AS visits, last_purchase_date,
       CASE WHEN store_spend_eur > 0 AND online_spend_eur > 0 THEN 'Omnichannel'
            WHEN store_spend_eur > 0 THEN 'Store only'
            WHEN online_spend_eur > 0 THEN 'Online only' ELSE 'Inactive' END AS channel_segment,
       DATEDIFF(DATE'2026-09-30', last_purchase_date) > 90 AS at_risk_lapsing
FROM customers c LEFT JOIN s USING (loyalty_id);

-- COMMAND ----------
-- 3. Stock health: latest position + lost sales from stock-outs over the year
CREATE OR REPLACE VIEW stock_health
COMMENT 'Per store x SKU: weeks out of stock in the last 12 months, estimated lost sales EUR (stock-out weeks x average weekly in-stock sales), and current on-hand / weeks of cover.'
AS
WITH wk AS (
  SELECT store_id, sku, DATE_TRUNC('WEEK', sale_date) AS wk, SUM(quantity) AS units, SUM(net_sales_eur) AS sales
  FROM sales_unified GROUP BY ALL),
avgw AS (SELECT store_id, sku, AVG(units) AS avg_weekly_units, AVG(sales) AS avg_weekly_sales_eur FROM wk GROUP BY ALL),
oos AS (SELECT store_id, sku, SUM(CAST(is_stockout AS INT)) AS stockout_weeks FROM inventory_snapshots GROUP BY ALL),
latest AS (SELECT * FROM inventory_snapshots WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM inventory_snapshots))
SELECT st.store_id, st.store_name, st.market, st.store_format, p.sku, p.product_name, p.category, p.season,
       o.stockout_weeks, ROUND(o.stockout_weeks / 52.0, 3) AS stockout_rate,
       ROUND(COALESCE(a.avg_weekly_units, 0), 1) AS avg_weekly_units,
       ROUND(o.stockout_weeks * COALESCE(a.avg_weekly_sales_eur, 0), 0) AS est_lost_sales_eur,
       l.on_hand_units, l.weeks_of_cover, l.reorder_point
FROM oos o JOIN stores st USING (store_id) JOIN products p USING (sku)
LEFT JOIN avgw a USING (store_id, sku) LEFT JOIN latest l USING (store_id, sku);

-- COMMAND ----------
-- 4. Markdown performance by season & category
CREATE OR REPLACE VIEW markdown_performance
COMMENT 'Seasonal sell-through and markdown cost. markdown_cost_eur = revenue given away versus full price. sell_through_full_price_pct = share of units sold before any markdown.'
AS
SELECT p.season, p.category, u.market,
       SUM(u.quantity) AS units_sold,
       SUM(CASE WHEN u.discount_pct = 0 THEN u.quantity END) / SUM(u.quantity) AS sell_through_full_price_pct,
       SUM(u.net_sales_eur) AS net_sales_eur, SUM(u.markdown_cost_eur) AS markdown_cost_eur,
       SUM(u.gross_margin_eur) / SUM(u.net_sales_eur) AS gross_margin_pct,
       AVG(CASE WHEN u.discount_pct > 0 THEN u.discount_pct END) AS avg_markdown_depth
FROM sales_unified u JOIN products p USING (sku)
GROUP BY ALL;

-- COMMAND ----------
-- 5. Weekly demand + 12-week forecast per category (AI_FORECAST — no data-science team needed)
CREATE OR REPLACE TABLE demand_forecast
COMMENT 'Weekly units per category: actuals (is_forecast = false) and 12-week forecast with 80% interval (is_forecast = true).'
AS
WITH hist AS (
  SELECT DATE_TRUNC('WEEK', sale_date) AS week, p.category, SUM(quantity) AS units
  FROM sales_unified u JOIN products p USING (sku) GROUP BY ALL),
fc AS (
  SELECT * FROM AI_FORECAST(TABLE(hist), horizon => '2026-12-28', time_col => 'week',
                            value_col => 'units', group_col => 'category', prediction_interval_width => 0.8))
SELECT week, category, units, CAST(NULL AS DOUBLE) AS units_lower, CAST(NULL AS DOUBLE) AS units_upper, FALSE AS is_forecast FROM hist
UNION ALL
SELECT week, category, units_forecast, units_lower, units_upper, TRUE FROM fc;

-- COMMAND ----------
-- 6. Action list for merchandising: what to reorder / rebalance this week
CREATE OR REPLACE VIEW replenishment_actions
COMMENT 'Current at-risk store x SKU positions (weeks_of_cover < 1 on items that sell) with recommended action.'
AS
SELECT store_name, market, sku, product_name, category, on_hand_units, weeks_of_cover, avg_weekly_units,
       est_lost_sales_eur AS lost_sales_last_12m_eur,
       CASE WHEN on_hand_units = 0 THEN 'Urgent reorder / transfer'
            WHEN weeks_of_cover < 1 THEN 'Reorder this week' END AS recommended_action
FROM stock_health
WHERE avg_weekly_units >= 1 AND weeks_of_cover < 1 AND season = 'CORE';
