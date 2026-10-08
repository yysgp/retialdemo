# Run-of-show and talk track (60 min)

**Opening (2 min):** Address the empty chairs straight away. "Our sales lead and your SA are stuck at the airport. You still get the full conversation, and I'll follow up with them within 24 hours. I'd rather spend most of today listening than presenting."

## 1. Discovery (10 min): slides 0–2
Ask before you tell. Each person gets one question:
- **CFO:** "What did markdowns cost you last year as a % of sales? What GM% are you committed to this year?"
- **Head of Merch:** "When a fast mover sells out in Lyon, when do you find out? What forecast do the buyers trust today?"
- **VP Ops & Data:** "How many people are on the data team? What's at the top of the backlog? What failed last time you tried a platform?"
Write down their numbers and plug them into slide 2 in your own words ("so for you that's roughly €X").
Validate the assumptions: about €400M revenue, 5 markets, around 15% online, loyalty covering about 40–60% of sales.

## 2. Success criteria (3 min): slide 3
Get each person to agree to one metric. Don't move on until the CFO has agreed to the baseline-and-target idea.

## 3. Demo (7 min): slide 4, then the dashboard and Genie
1. **Dashboard, Margin page (CFO):** "This is FY26 on one page across both channels. Here's what was given away in markdowns, and here's what was lost to empty shelves."
2. **Stock page (Merch):** "Lost sales cluster in four stores. That's a replenishment problem, not a demand problem. Here's the 12-week forecast, built with one SQL function and no data scientists. And this is the reorder list your planners would get every Monday."
3. **Genie (each persona):** ask the three questions in `genie/genie_agent_config.md`. Hand the keyboard to the VP Ops if they're willing.
4. **Customer page (Ops):** "Omnichannel members spend about 3x more. Before today, you couldn't connect the online shopper to the loyalty card."

If something breaks, say: "This step joins the online email to the loyalty ID. That join is the whole single customer view." Then explain the logic and keep going.

## 4. Vision, roadmap, close (15 min): slides 5–7
- Frame the vision as See → Predict → Act. **Comparable peers:** European omnichannel leaders such as Inditex, H&M and Primark run demand-led allocation. Lakehouse platforms make that achievable for a mid-market team.
- **Objection, "We can't staff it":** It's serverless, there's no infrastructure, and SQL-first means your existing 2–4 analysts can run it. Genie takes the ad-hoc questions off their backlog.
- **Objection, "Cost/risk":** The 6-week sprint has fixed scope and an exit gate, it's pay-per-use, and your data stays in your cloud with open formats (Delta/Iceberg), so there's no lock-in.
- **Objection, "Why not our ERP/BI vendor?":** Their tools report on the past, and none of them combine loyalty, web and stock in one place with forecasting and AI built in.
- **Close:** "Can we agree on a sponsor and the success metrics by Thursday, so we can kick off on day 10?" Get a name and a date.

## 5. Debrief: what I'd say I'd do differently
I'd send pre-read discovery questions so the € baseline is theirs and not mine, bring a peer reference customer, and check how the panel shares data with their suppliers.
