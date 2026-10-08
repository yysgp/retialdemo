# Databricks notebook source
# MAGIC %md
# MAGIC # Multivar — synthetic omnichannel dataset (bronze/silver)
# MAGIC Generates 8 tables, 1 year of history (Oct 2025 – Sep 2026), 5 European markets.
# MAGIC The data deliberately reproduces Multivar's pain points so the dashboard and Genie tell a real story:
# MAGIC * **Siloed systems** — POS and e-commerce land in separate tables with different customer keys (loyalty id vs. email hash).
# MAGIC * **Stock-outs** on fast movers in a handful of stores → lost sales.
# MAGIC * **Over-buy on seasonal fashion** → late, deep markdowns that erode margin.
# MAGIC * **Omnichannel loyalty members** are worth far more than single-channel shoppers.
# MAGIC
# MAGIC Pure pandas/numpy so it also runs locally (`python 01_generate_data.py --local out/`).

# COMMAND ----------

import sys
import numpy as np
import pandas as pd

CATALOG = "multivar"
SCHEMA = "retail"
SEED = 42
START, END = pd.Timestamp("2025-10-01"), pd.Timestamp("2026-09-30")

MARKETS = {  # market: (currency-neutral EUR, cities)
    "NL": ["Amsterdam", "Rotterdam", "Utrecht"],
    "BE": ["Brussels", "Antwerp"],
    "DE": ["Berlin", "Hamburg", "Cologne", "Munich"],
    "FR": ["Paris", "Lyon", "Lille"],
    "ES": ["Madrid", "Barcelona", "Valencia"],
}

# category: (seasonal, avg price EUR, gross margin %, weekly base units per store)
CATEGORIES = {
    "Womenswear":   (True, 49, 0.62, 6),
    "Menswear":     (True, 45, 0.60, 4),
    "Kidswear":     (True, 25, 0.55, 4),
    "Footwear":     (True, 69, 0.52, 3),
    "Home & Living":(False, 29, 0.58, 3),
    "Beauty":       (False, 15, 0.65, 7),
    "Accessories":  (False, 19, 0.70, 5),
}
SEASONS = {"AW25": ("2025-09-01", "2026-02-28"), "SS26": ("2026-03-01", "2026-08-31"), "CORE": (None, None)}


def generate(rng=None):
    rng = rng or np.random.default_rng(SEED)
    weeks = pd.date_range(START, END, freq="W-MON")

    # ---------------- stores ----------------
    stores = []
    sid = 1
    for m, cities in MARKETS.items():
        for c in cities:
            fmt = "Flagship" if sid % 5 == 1 else ("Outlet" if sid % 7 == 0 else "High Street")
            stores.append(dict(store_id=f"S{sid:03d}", store_name=f"Multivar {c}", market=m, city=c,
                               store_format=fmt, opened_year=int(rng.integers(2008, 2023)),
                               sqm=int({"Flagship": 1800, "High Street": 900, "Outlet": 1200}[fmt] * rng.uniform(.8, 1.2))))
            sid += 1
    stores.append(dict(store_id="WEB", store_name="Multivar Online", market="ALL", city="E-commerce DC",
                       store_format="Online", opened_year=2016, sqm=0))
    stores = pd.DataFrame(stores)
    phys = stores[stores.store_format != "Online"].reset_index(drop=True)

    # ---------------- products ----------------
    prods = []
    pid = 1
    for cat, (seasonal, price, gm, _) in CATEGORIES.items():
        n = 10 if seasonal else 6
        for i in range(n):
            season = ("AW25" if i % 2 == 0 else "SS26") if seasonal else "CORE"
            p = round(price * rng.uniform(.6, 1.6), 0) - 0.01
            prods.append(dict(sku=f"SKU{pid:04d}", product_name=f"{cat} item {i+1:02d}", category=cat,
                              season=season, is_seasonal=seasonal, full_price_eur=p,
                              unit_cost_eur=round(p * (1 - gm) * rng.uniform(.9, 1.1), 2),
                              supplier=f"Supplier {chr(65 + pid % 9)}",
                              lead_time_days=int(rng.choice([14, 21, 35, 56] if seasonal else [7, 14]))))
            pid += 1
    products = pd.DataFrame(prods)
    # popularity: a few hero SKUs drive volume (long tail)
    products["popularity"] = rng.pareto(1.6, len(products)) + 0.3
    hero = products.sort_values("popularity", ascending=False).head(8).sku.tolist()

    # ---------------- customers (loyalty) ----------------
    n_cust = 6000
    cmk = rng.choice(list(MARKETS), n_cust, p=[.22, .12, .30, .21, .15])
    tier = rng.choice(["Bronze", "Silver", "Gold"], n_cust, p=[.62, .28, .10])
    pref = rng.choice(["Store only", "Online only", "Omnichannel"], n_cust, p=[.52, .23, .25])
    customers = pd.DataFrame(dict(
        loyalty_id=[f"L{i:06d}" for i in range(1, n_cust + 1)],
        email_hash=[f"h{rng.integers(1e12, 9e12):x}" for _ in range(n_cust)],
        market=cmk, loyalty_tier=tier,
        join_date=pd.to_datetime("2018-01-01") + pd.to_timedelta(rng.integers(0, 3100, n_cust), "D"),
        age_band=rng.choice(["18-24", "25-34", "35-44", "45-54", "55+"], n_cust, p=[.14, .27, .25, .19, .15]),
        marketing_opt_in=rng.random(n_cust) < .64,
        _pref=pref,
    ))
    customers["home_store_id"] = [rng.choice(phys[phys.market == m].store_id) for m in customers.market]

    # ---------------- weekly demand & inventory (per store x sku) ----------------
    def seasonality(cat_seasonal, season, wk):
        m = wk.month
        base = 1.0 + (0.6 if m in (11, 12) else 0) + (0.25 if m in (7, 8) else 0) - (0.2 if m in (1, 2) else 0)
        if cat_seasonal:
            a, b = SEASONS[season]
            in_season = pd.Timestamp(a) <= wk <= pd.Timestamp(b)
            base *= 1.0 if in_season else 0.15
        return base

    inv_rows, demand_rows = [], []
    for _, s in pd.concat([phys, stores[stores.store_id == "WEB"]]).iterrows():
        size = {"Flagship": 1.6, "High Street": 1.0, "Outlet": 0.7, "Online": 3.0}[s.store_format]
        # stores with poor replenishment => chronic stock-outs (the "flying blind" problem)
        weak_repl = s.store_id in ("S003", "S007", "S012", "S014")
        for _, p in products.iterrows():
            seasonal, _, _, wbase = CATEGORIES[p.category]
            lam_base = wbase * size * p.popularity / 1.2
            if p.season != "CORE":
                a, b = SEASONS[p.season]
                # buy for season up front: over-buy by 35% on seasonal (planners guess)
                season_wks = [w for w in weeks if pd.Timestamp(a) <= w <= pd.Timestamp(b)]
                exp = sum(lam_base * seasonality(True, p.season, w) for w in season_wks)
                on_hand = int(exp * rng.uniform(1.15, 1.55)) if season_wks else 0
            else:
                on_hand = int(lam_base * 4)
            reorder_pt = max(2, int(lam_base * (1.0 if weak_repl else 2.0)))
            for w in weeks:
                lam = lam_base * seasonality(seasonal, p.season, w) * rng.uniform(.8, 1.2)
                demand = rng.poisson(lam)
                # core replenishment (seasonal is one-shot buy)
                if p.season == "CORE" and on_hand <= reorder_pt and not (weak_repl and p.sku in hero and rng.random() < .6):
                    on_hand += int(lam_base * 3)
                sold = min(demand, on_hand)
                lost = demand - sold
                on_hand -= sold
                demand_rows.append((s.store_id, p.sku, w, sold, lost))
                inv_rows.append(dict(snapshot_date=w.date(), store_id=s.store_id, sku=p.sku,
                                     on_hand_units=on_hand, reorder_point=reorder_pt,
                                     is_stockout=on_hand == 0 and lam > 0.5,
                                     weeks_of_cover=round(on_hand / max(lam, 0.1), 1)))
    inventory = pd.DataFrame(inv_rows)
    dem = pd.DataFrame(demand_rows, columns=["store_id", "sku", "week", "sold", "lost"])

    # ---------------- markdowns: late & deep on seasonal over-buy ----------------
    md = []
    mid = 1
    for season, (a, b) in [("AW25", SEASONS["AW25"]), ("SS26", SEASONS["SS26"])]:
        end = pd.Timestamp(b)
        for _, p in products[products.season == season].iterrows():
            # reactive: first markdown at 70-85% of season, 30-50% off; sometimes a second wave
            first = end - pd.Timedelta(days=int(rng.integers(25, 50)))
            if first > END:
                continue
            md.append(dict(markdown_id=f"MD{mid:05d}", sku=p.sku, market="ALL", start_date=first.date(),
                           end_date=(first + pd.Timedelta(days=21)).date(),
                           discount_pct=float(rng.choice([0.3, 0.4, 0.5])), reason="End of season clearance"))
            mid += 1
            if rng.random() < .55 and end + pd.Timedelta(days=1) <= END:
                md.append(dict(markdown_id=f"MD{mid:05d}", sku=p.sku, market="ALL",
                               start_date=(end - pd.Timedelta(days=4)).date(),
                               end_date=(end + pd.Timedelta(days=28)).date(),
                               discount_pct=float(rng.choice([0.6, 0.7])), reason="Final clearance"))
                mid += 1
    markdowns = pd.DataFrame(md)

    def discount_for(sku, d):
        if markdowns.empty:
            return 0.0
        m = markdowns[(markdowns.sku == sku) & (pd.to_datetime(markdowns.start_date) <= d) & (pd.to_datetime(markdowns.end_date) >= d)]
        return float(m.discount_pct.max()) if len(m) else 0.0

    # ---------------- explode weekly sold units into transactions ----------------
    pinfo = products.set_index("sku")
    cust_store = customers[customers._pref != "Online only"]
    cust_web = customers[customers._pref != "Store only"]
    # omnichannel members shop more often
    w_store = np.where(cust_store._pref == "Omnichannel", 3.0, 1.0) * np.where(cust_store.loyalty_tier == "Gold", 2.5, 1.0)
    w_web = np.where(cust_web._pref == "Omnichannel", 3.0, 1.0) * np.where(cust_web.loyalty_tier == "Gold", 2.5, 1.0)
    w_store, w_web = w_store / w_store.sum(), w_web / w_web.sum()

    pos, web = [], []
    dsold = dem[dem.sold > 0]
    # scale to ~10k line rows per channel table: sample basket lines proportional to units
    for _, r in dsold.iterrows():
        p = pinfo.loc[r.sku]
        n_lines = max(1, int(np.ceil(r.sold / 20)))  # aggregate units into basket lines to keep ~10-20k rows
        units_left = r.sold
        for i in range(n_lines):
            q = units_left if i == n_lines - 1 else max(1, units_left // (n_lines - i))
            units_left -= q
            if q <= 0:
                continue
            d = r.week + pd.Timedelta(days=int(rng.integers(0, 7)))
            if d > END:
                d = END
            disc = discount_for(r.sku, d)
            price = round(p.full_price_eur * (1 - disc), 2)
            row = dict(sku=r.sku, quantity=int(q), unit_price_eur=price, discount_pct=disc,
                       net_sales_eur=round(price * q, 2), cost_eur=round(p.unit_cost_eur * q, 2))
            if r.store_id == "WEB":
                is_member = rng.random() < .58
                c = cust_web.iloc[rng.choice(len(cust_web), p=w_web)] if is_member else None
                web.append(dict(order_ts=d + pd.Timedelta(minutes=int(rng.integers(0, 1440))),
                                customer_email_hash=c.email_hash if c is not None else None,
                                ship_market=c.market if c is not None else rng.choice(list(MARKETS)),
                                fulfilment=rng.choice(["Home delivery", "Click & Collect"], p=[.72, .28]),
                                returned=bool(rng.random() < (.28 if p.category in ("Womenswear", "Footwear") else .12)),
                                **row))
            else:
                is_member = rng.random() < .41
                c = cust_store.iloc[rng.choice(len(cust_store), p=w_store)] if is_member else None
                pos.append(dict(txn_ts=d + pd.Timedelta(minutes=int(rng.integers(540, 1260))), store_id=r.store_id,
                                loyalty_id=c.loyalty_id if c is not None else None,
                                payment_type=rng.choice(["Card", "Cash", "Mobile"], p=[.66, .12, .22]), **row))

    pos = pd.DataFrame(pos).sort_values("txn_ts").reset_index(drop=True)
    pos.insert(0, "pos_line_id", [f"P{i:07d}" for i in range(1, len(pos) + 1)])
    web = pd.DataFrame(web).sort_values("order_ts").reset_index(drop=True)
    web.insert(0, "order_line_id", [f"W{i:07d}" for i in range(1, len(web) + 1)])

    # ---------------- loyalty events (points, campaign responses) ----------------
    ev = []
    members = customers.sample(2500, random_state=SEED)
    for i, c in enumerate(members.itertuples()):
        for _ in range(int(rng.integers(1, 4))):
            ev.append(dict(event_id=f"E{len(ev)+1:06d}", loyalty_id=c.loyalty_id,
                           event_date=(START + pd.Timedelta(days=int(rng.integers(0, 365)))).date(),
                           event_type=rng.choice(["Points earned", "Voucher redeemed", "Campaign opened", "App login", "Tier upgrade"],
                                                 p=[.35, .15, .25, .22, .03]),
                           channel=rng.choice(["App", "Email", "Store"]),
                           points=int(rng.integers(10, 400))))
    loyalty_events = pd.DataFrame(ev)

    # ---------------- customer identity map (the piece that unlocks "single view") ----------------
    customers = customers.drop(columns=["_pref"])
    products = products.drop(columns=["popularity"])
    inventory = inventory.sample(frac=1, random_state=SEED)  # keep all rows
    return dict(stores=stores, products=products, customers=customers, pos_transactions=pos,
                online_orders=web, inventory_snapshots=inventory, markdowns=markdowns, loyalty_events=loyalty_events)


# COMMAND ----------

def write_databricks(tables):
    spark.sql(f"CREATE CATALOG IF NOT EXISTS {CATALOG}")
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
    comments = {
        "stores": "Physical stores per market plus the WEB (e-commerce) virtual store. Source: store master (ERP).",
        "products": "Product master: SKU, category, season (AW25/SS26/CORE), full price and unit cost in EUR. Source: PIM.",
        "customers": "Loyalty programme members. loyalty_id is used by POS, email_hash is used by e-commerce. Source: loyalty CRM.",
        "pos_transactions": "In-store till line items. loyalty_id null = anonymous shopper. Source: POS system.",
        "online_orders": "E-commerce order lines. customer_email_hash null = guest checkout. Source: web shop platform.",
        "inventory_snapshots": "Weekly (Monday) on-hand stock per store and SKU, with stock-out flag. Source: WMS / store stock system.",
        "markdowns": "Price markdown events per SKU (end-of-season clearance). Source: pricing spreadsheets.",
        "loyalty_events": "Loyalty programme engagement events (points, vouchers, campaigns). Source: loyalty CRM.",
    }
    for name, df in tables.items():
        sdf = spark.createDataFrame(df.astype({c: "object" for c in df.columns if str(df[c].dtype) == "object"}))
        sdf.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"{CATALOG}.{SCHEMA}.{name}")
        spark.sql(f"COMMENT ON TABLE {CATALOG}.{SCHEMA}.{name} IS '{comments[name]}'")
        print(f"{name:22s} {len(df):>8,d} rows")


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[1] == "--local":
    import os
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for name, df in generate().items():
        df.to_csv(f"{out}/{name}.csv", index=False)
        print(f"{name:22s} {len(df):>8,d} rows")
else:
    write_databricks(generate())
