# RegimeIQ

Rules-based investment tools for disciplined capital allocation. No predictions, no emotions — systematic execution.

**Live:** [regimeiq.com](https://regimeiq.com)

---

## Tools

### ⚡ Buy Fear

Calculates how much capital to deploy when assets pull back from recent highs. Removes emotion from buy decisions during fear and capitulation.

**How it works:**

1. **Drawdown tiers** — Each asset has defined pullback thresholds. When price drops X% from its 60-day high, a corresponding percentage of your available buy fund is flagged for deployment. Tiers are cumulative: deeper drawdowns unlock larger deployments.

2. **Confirmation bonuses** — Secondary indicators (VIX, RSI, Fear & Greed, MVRV Z-Score, NUPL, Gold/Silver ratio) add percentage bonuses on top of active tiers. These reward conviction when multiple signals align.

3. **Buy fund** — Your available cash minus your cash floor (emergency fund). The engine never touches your floor.

| Asset | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|-------|--------|--------|--------|--------|--------|
| SPX   | -2% → 5% | -5% → 15% | -10% → 25% | -15% → 25% | -20% → 30% |
| BTC   | -20% → 5% | -30% → 15% | -40% → 20% | -50% → 25% | -60% → 35% |
| Gold  | -5% → 10% | -10% → 25% | -15% → 35% | -20% → 30% | — |

**Confirmation indicators:**

- **VIX** > 30 → +5%, > 40 → +10% (SPX)
- **SPX Monthly RSI** < 30 → +5% (SPX)
- **Crypto Fear & Greed** < 25 → +5%, < 10 → +10% (BTC)
- **MVRV Z-Score** < 0 → +15% (BTC)
- **NUPL** < 0 → +10% (BTC)
- **BTC Weekly RSI** < 30 → +5% (BTC)
- **Gold/Silver Ratio** > 90 → +5% (Gold)

---

### ⚖️ Portfolio Rebalancer

Generates target allocations based on a profiling questionnaire, then tracks portfolio drift.

**Profiling flow:**

1. **Asset selection** — SPX, BTC, Gold, Cash (pick 2+)
2. **BTC conviction** — True Conviction (40–50%), Moderate (15–25%), Some Exposure (5–10%)
3. **Gold thesis** — Hard Asset / Austrian (15–25%), Defensive Hedge (5–10%)
4. **Risk tolerance** — Aggressive, Semi-Aggressive, Balanced, Conservative, Preservation

**Drift monitor:** Input current dollar holdings per asset. The tool calculates actual vs. target percentages and flags when drift exceeds your configurable threshold (default 5%). Shows exact buy/sell amounts to rebalance.

---

### 🌡️ Euphoria Gauge

Inverse of Buy Fear. Detects euphoria to avoid buying into — or to consider trimming. Not sell signals — awareness checks.

Each indicator evaluates to 🔴 Danger, 🟡 Warning, or 🟢 Clear. Multiple danger signals firing simultaneously is the highest-conviction warning.

**Bitcoin — Cycle Top Detection:**

| Indicator | Warning | Danger |
|-----------|---------|--------|
| MVRV Z-Score | ≥ 4 | ≥ 7 |
| NUPL | ≥ 0.5 | ≥ 0.75 |
| Crypto Fear & Greed | ≥ 75 | ≥ 90 |
| Weekly RSI | ≥ 70 | ≥ 90 |
| Price vs 200D MA | ≥ 50% above | ≥ 100% above |

On-chain metrics (MVRV, NUPL) have historically identified cycle tops within 2 weeks. High confidence at extremes.

**S&P 500 — Caution Flags:**

| Indicator | Warning | Danger |
|-----------|---------|--------|
| VIX | ≤ 12 | — |
| Monthly RSI | ≥ 70 | ≥ 80 |
| Shiller CAPE | ≥ 35 | ≥ 40 |

These are caution flags, not top signals. Markets can stay irrational — overbought and expensive — far longer than expected. High valuations compress forward returns but don't predict imminent crashes.

**Gold:**

| Indicator | Warning | Danger |
|-----------|---------|--------|
| Gold/Silver Ratio | ≤ 60 | — |
| Monthly RSI | ≥ 80 | ≥ 90 |

---

### 📖 Methodology

In-app documentation covering the philosophy, logic, and assumptions behind every tool. Includes full tier tables, confirmation rationale, profiling matrix, data sources, and disclaimer.

---

## Data Sources

Auto-populated via serverless API proxy:

| Source | Data | Auth |
|--------|------|------|
| EODHD | SPX, Gold, Silver, VIX | API key |
| Alpha Vantage | SPX monthly RSI, Gold monthly RSI | API key |
| CoinGecko | BTC price, BTC weekly RSI, BTC vs 200D MA % | Free |
| Bitcoin Lab | MVRV Z-Score, NUPL | API key |
| multpl.com | Shiller CAPE (scraped) | Free |
| alternative.me | Crypto Fear & Greed | Free |

All indicators fully auto-populated.

## Stack

- React (Vite)
- Vercel serverless functions (API proxy + 5-min cache)
- No database — all inputs are session-based

## Local Development

```bash
git clone https://github.com/YOUR_USERNAME/regimeiq.git
cd regimeiq
npm install
npm run dev
```

API keys required in `.env`:
```
EODHD_KEY=
ALPHA_VANTAGE_KEY=
BTCLAB_KEY=
```

## License

Personal use. Not financial advice.
