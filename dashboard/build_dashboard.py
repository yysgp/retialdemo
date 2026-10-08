"""Builds dashboard/multivar_exec.lvdash.json (AI/BI dashboard).
Import: Workspace > Create > Dashboard > Import, or `databricks lakeview create --serialized-dashboard @file`.
One page per question the room cares about: Margin (CFO) / Stock (Merch) / Customer (Ops & Data)."""
import json, pathlib

T = "multivar.retail"
datasets = {
    "kpis": f"""SELECT SUM(net_sales_eur) AS revenue, SUM(gross_margin_eur)/SUM(net_sales_eur) AS gm_pct,
  SUM(markdown_cost_eur) AS markdown_cost, (SELECT SUM(est_lost_sales_eur) FROM {T}.stock_health) AS lost_sales,
  (SELECT AVG(stockout_rate) FROM {T}.stock_health) AS stockout_rate FROM {T}.sales_unified""",
    "monthly": f"""SELECT DATE_TRUNC('MONTH', sale_date) AS month, channel, SUM(net_sales_eur) AS revenue,
  SUM(markdown_cost_eur) AS markdown_cost FROM {T}.sales_unified GROUP BY ALL""",
    "markdown": f"SELECT season, category, SUM(markdown_cost_eur) AS markdown_cost, SUM(net_sales_eur) AS net_sales FROM {T}.markdown_performance WHERE season <> 'CORE' GROUP BY ALL",
    "lost_by_store": f"SELECT store_name, market, SUM(est_lost_sales_eur) AS lost_sales FROM {T}.stock_health GROUP BY ALL",
    "forecast": f"SELECT week, category, units, units_lower, units_upper, is_forecast FROM {T}.demand_forecast",
    "actions": f"SELECT * FROM {T}.replenishment_actions ORDER BY lost_sales_last_12m_eur DESC",
    "segments": f"""SELECT channel_segment, COUNT(*) AS members, AVG(total_spend_eur) AS avg_spend,
  SUM(total_spend_eur) AS total_spend FROM {T}.customer_360 WHERE channel_segment <> 'Inactive' GROUP BY ALL""",
    "segment_market": f"SELECT market, channel_segment, COUNT(*) AS members FROM {T}.customer_360 WHERE channel_segment <> 'Inactive' GROUP BY ALL",
}


def counter(name, ds, field, title, fmt="number"):
    return {"name": name, "queries": [{"name": "main_query", "query": {"datasetName": ds, "fields": [{"name": field, "expression": f"`{field}`"}], "disaggregated": True}}],
            "spec": {"version": 2, "widgetType": "counter", "encodings": {"value": {"fieldName": field, "displayName": title,
                     "format": {"type": "number-currency", "currencyCode": "EUR", "abbreviation": "compact"} if fmt == "eur" else {"type": "number-percent", "decimalPlaces": {"type": "max", "places": 1}}}},
                     "frame": {"showTitle": True, "title": title}}}


def chart(name, ds, wtype, x, y, title, color=None, agg="SUM", xscale="categorical", sort_y=False):
    fields = [{"name": x, "expression": f"`{x}`"}, {"name": f"{agg.lower()}({y})", "expression": f"{agg}(`{y}`)"}]
    enc = {"x": {"fieldName": x, "scale": {"type": xscale}, "displayName": x.replace("_", " ")},
           "y": {"fieldName": f"{agg.lower()}({y})", "scale": {"type": "quantitative"}, "displayName": y.replace("_", " ")}}
    if sort_y:
        enc["x"]["scale"]["sort"] = {"by": "y-reversed"}
    if color:
        fields.append({"name": color, "expression": f"`{color}`"})
        enc["color"] = {"fieldName": color, "scale": {"type": "categorical"}, "displayName": color.replace("_", " ")}
    return {"name": name, "queries": [{"name": "main_query", "query": {"datasetName": ds, "fields": fields, "disaggregated": False}}],
            "spec": {"version": 3, "widgetType": wtype, "encodings": enc, "frame": {"showTitle": True, "title": title}}}


def table(name, ds, cols, title):
    return {"name": name, "queries": [{"name": "main_query", "query": {"datasetName": ds, "fields": [{"name": c, "expression": f"`{c}`"} for c in cols], "disaggregated": True}}],
            "spec": {"version": 1, "widgetType": "table", "encodings": {"columns": [{"fieldName": c, "displayName": c.replace("_", " ")} for c in cols]},
                     "frame": {"showTitle": True, "title": title}}}


def text(name, md):
    return {"name": name, "multilineTextboxSpec": {"lines": [md]}}


def pos(w, x, y, wd, h):
    return {"widget": w, "position": {"x": x, "y": y, "width": wd, "height": h}}


page1 = [
    pos(text("t1", "## Where is margin leaking?\nFY26 (Oct-25 – Sep-26), all markets, stores + online in one view."), 0, 0, 6, 1),
    pos(counter("k_rev", "kpis", "revenue", "Net sales", "eur"), 0, 1, 2, 2),
    pos(counter("k_md", "kpis", "markdown_cost", "Markdown cost (given away vs full price)", "eur"), 2, 1, 2, 2),
    pos(counter("k_lost", "kpis", "lost_sales", "Est. sales lost to stock-outs", "eur"), 4, 1, 2, 2),
    pos(chart("c_monthly", "monthly", "bar", "month", "revenue", "Net sales by month & channel", color="channel", xscale="temporal"), 0, 3, 3, 5),
    pos(chart("c_md", "markdown", "bar", "category", "markdown_cost", "Markdown cost by category & season", color="season", sort_y=True), 3, 3, 3, 5),
]
page2 = [
    pos(text("t2", "## Stock: where are we losing sales, and what do we do this week?"), 0, 0, 6, 1),
    pos(chart("c_lost", "lost_by_store", "bar", "store_name", "lost_sales", "Estimated lost sales from stock-outs by store", sort_y=True), 0, 1, 3, 5),
    pos(chart("c_fc", "forecast", "line", "week", "units", "Weekly demand by category — actuals + 12-week AI forecast", color="category", xscale="temporal"), 3, 1, 3, 5),
    pos(table("tbl_actions", "actions", ["store_name", "sku", "product_name", "on_hand_units", "weeks_of_cover", "lost_sales_last_12m_eur", "recommended_action"], "This week's replenishment actions"), 0, 6, 6, 5),
]
page3 = [
    pos(text("t3", "## One view of the customer: omnichannel members are worth ~3x"), 0, 0, 6, 1),
    pos(chart("c_seg", "segments", "bar", "channel_segment", "avg_spend", "Average 12-month spend per member", agg="AVG", sort_y=True), 0, 1, 3, 5),
    pos(chart("c_segm", "segment_market", "bar", "market", "members", "Members by market & channel segment", color="channel_segment"), 3, 1, 3, 5),
]

dash = {
    "datasets": [{"name": k, "displayName": k, "queryLines": [v]} for k, v in datasets.items()],
    "pages": [{"name": "margin", "displayName": "Margin (CFO)", "layout": page1},
              {"name": "stock", "displayName": "Stock & Forecast (Merch)", "layout": page2},
              {"name": "customer", "displayName": "Customer (Ops)", "layout": page3}],
}
out = pathlib.Path(__file__).with_name("multivar_exec.lvdash.json")
out.write_text(json.dumps(dash, indent=2))
print("wrote", out)
