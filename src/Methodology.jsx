export default function Methodology() {
  var sectionStyle = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px", padding: "24px", marginBottom: "16px",
  };
  var h3Style = { fontSize: "16px", fontWeight: 700, color: "#fff", margin: "0 0 12px 0" };
  var pStyle = { fontSize: "13px", color: "#999", lineHeight: 1.7, margin: "0 0 12px 0" };
  var tableWrap = { overflowX: "auto", marginBottom: "12px" };
  var thStyle = { fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, padding: "8px 12px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" };
  var tdStyle = { fontSize: "13px", color: "#ccc", fontFamily: "'JetBrains Mono',monospace", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  var labelStyle = { fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: "10px" };
  var confRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" };

  return (
    <div style={{
      minHeight: "calc(100vh - 50px)", background: "#0a0a0b", color: "#e0e0e0",
      fontFamily: "'Inter',-apple-system,sans-serif",
      padding: "clamp(16px, 4vw, 40px)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "700px" }}>

        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "10px", color: "#60a5fa", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "8px" }}>
            RegimeIQ
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
            Methodology
          </h1>
          <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
            How the tools work, why they're built this way, and the logic behind every output.
          </p>
        </div>

        {/* ── Philosophy ── */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>Philosophy</h3>
          <p style={pStyle}>
            These tools exist to solve one problem: emotional decision-making during market stress. When assets are crashing, the optimal action is usually to buy — but fear makes that nearly impossible without a pre-committed framework.
          </p>
          <p style={pStyle}>
            The approach is accumulation-only. No sell signals, no trading, no regime predictions. Just systematic rules for deploying capital when prices drop. The framework assumes you have a long time horizon and conviction in the assets you've selected.
          </p>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            Every parameter is transparent and editable. Nothing is a black box.
          </p>
        </div>

        {/* ── Buy Fear ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "22px" }}>⚡</span>
            <h3 style={{ ...h3Style, margin: 0 }}>Buy Fear</h3>
          </div>

          <p style={pStyle}>
            The engine measures each asset's current price against its 60-day rolling high. This short lookback window catches real pullbacks without anchoring to all-time highs that may be months old and psychologically distorting.
          </p>

          {/* Tiers */}
          <div style={labelStyle}>Drawdown Tiers</div>
          <p style={pStyle}>
            Tiers are cumulative. If SPX drops 12% from its 60-day high, Tiers 1 through 3 all activate: 5% + 15% + 25% = 45% of your buy fund is flagged for deployment. This scales commitment to severity — nibbles on small dips, heavy buying on crashes.
          </p>

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Asset</th>
                  <th style={thStyle}>Tier 1</th>
                  <th style={thStyle}>Tier 2</th>
                  <th style={thStyle}>Tier 3</th>
                  <th style={thStyle}>Tier 4</th>
                  <th style={thStyle}>Tier 5</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, color: "#60a5fa", fontWeight: 700 }}>SPX</td>
                  <td style={tdStyle}>-2% → 5%</td>
                  <td style={tdStyle}>-5% → 15%</td>
                  <td style={tdStyle}>-10% → 25%</td>
                  <td style={tdStyle}>-15% → 25%</td>
                  <td style={tdStyle}>-20% → 30%</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, color: "#f59e0b", fontWeight: 700 }}>BTC</td>
                  <td style={tdStyle}>-20% → 5%</td>
                  <td style={tdStyle}>-30% → 15%</td>
                  <td style={tdStyle}>-40% → 20%</td>
                  <td style={tdStyle}>-50% → 25%</td>
                  <td style={tdStyle}>-60% → 35%</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, color: "#fbbf24", fontWeight: 700 }}>Gold</td>
                  <td style={tdStyle}>-5% → 10%</td>
                  <td style={tdStyle}>-10% → 25%</td>
                  <td style={tdStyle}>-15% → 35%</td>
                  <td style={tdStyle}>-20% → 30%</td>
                  <td style={{ ...tdStyle, color: "#333" }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={pStyle}>
            BTC tiers start at -20% because sub-20% drawdowns are routine noise in crypto. Gold tiers start at -5% because gold is structurally less volatile — a 5% drawdown in gold is comparable to a 20% drawdown in BTC.
          </p>

          {/* Confirmations */}
          <div style={{ ...labelStyle, marginTop: "20px" }}>Confirmation Bonuses</div>
          <p style={pStyle}>
            Confirmations are additive bonuses that stack on top of active tiers. They reward buying when multiple fear signals align — the idea being that if price is down AND sentiment is capitulating AND on-chain metrics are at cycle lows, conviction should be maximal.
          </p>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: 700, marginBottom: "8px" }}>SPX Confirmations</div>
            <div style={confRow}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>VIX &gt; 30</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+5%</span>
            </div>
            <div style={confRow}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>VIX &gt; 40</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+10%</span>
            </div>
            <div style={{ ...confRow, borderBottom: "none" }}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>Monthly RSI &lt; 30</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+5%</span>
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700, marginBottom: "8px" }}>BTC Confirmations</div>
            <div style={confRow}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>Crypto Fear &amp; Greed &lt; 25</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+5%</span>
            </div>
            <div style={confRow}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>Crypto Fear &amp; Greed &lt; 10</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+10%</span>
            </div>
            <div style={confRow}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>MVRV Z-Score &lt; 0</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+15%</span>
            </div>
            <div style={confRow}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>NUPL &lt; 0</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+10%</span>
            </div>
            <div style={{ ...confRow, borderBottom: "none" }}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>Weekly RSI &lt; 30</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+5%</span>
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 700, marginBottom: "8px" }}>Gold Confirmations</div>
            <div style={{ ...confRow, borderBottom: "none" }}>
              <span style={{ fontSize: "13px", color: "#ccc" }}>Gold/Silver Ratio &gt; 90</span>
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono',monospace", color: "#4ade80" }}>+5%</span>
            </div>
          </div>

          <p style={pStyle}>
            VIX and Fear &amp; Greed thresholds can stack — VIX at 45 triggers both +5% and +10% for a total of +15%. MVRV Z-Score and NUPL are Bitcoin on-chain valuation metrics; when both go negative simultaneously, it historically marks cycle bottoms (2015, 2018, 2022).
          </p>

          {/* Buy fund */}
          <div style={{ ...labelStyle, marginTop: "20px" }}>Buy Fund</div>
          <p style={pStyle}>
            The engine calculates your available buy fund as: Cash Balance − Cash Floor. The floor is your emergency fund — inviolable, never deployed. Only surplus cash above the floor is available for pullback buying. Deploy percentages are calculated against this buy fund, not your total portfolio.
          </p>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            Important: all tier percentages are calculated against your <strong style={{ color: "#ccc" }}>original buy fund</strong>, not against your remaining balance after earlier tiers. Tiers sum to 100% per asset by design — your buy fund is only fully exhausted at maximum historical drawdown. For example, with a $10,000 buy fund: BTC Tier 1 (-20%) deploys $500, Tier 2 (-30%) deploys another $1,500, and so on through Tier 5 (-60%) which deploys the final $3,500. Confirmation bonuses stack on top of whatever tier is active.
          </p>
        </div>

        {/* ── Rebalancer ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "22px" }}>⚖️</span>
            <h3 style={{ ...h3Style, margin: 0 }}>Portfolio Rebalancer</h3>
          </div>

          <p style={pStyle}>
            The rebalancer generates target allocations through a profiling questionnaire, then monitors your actual holdings against those targets.
          </p>

          <div style={labelStyle}>Profiling Logic</div>
          <p style={pStyle}>
            Allocation is driven by two conviction questions and one risk question:
          </p>

          <p style={pStyle}>
            <strong style={{ color: "#f59e0b" }}>BTC conviction</strong> sets the Bitcoin allocation ceiling. "True Conviction" (40–50%) is for investors who understand the monetary thesis deeply and can stomach 60%+ drawdowns without selling. "Moderate" (15–25%) wants exposure with diversification. "Some Exposure" (5–10%) treats BTC as an asymmetric bet, not a core holding.
          </p>

          <p style={pStyle}>
            <strong style={{ color: "#fbbf24" }}>Gold thesis</strong> distinguishes between hard money believers and portfolio optimizers. "Hard Asset / Austrian" (15–25%) views gold as a permanent portfolio anchor — monetary debasement hedge, central bank failure insurance. "Defensive Hedge" (5–10%) treats gold as uncorrelated tail risk protection, not a thesis.
          </p>

          <p style={pStyle}>
            <strong style={{ color: "#60a5fa" }}>Risk tolerance</strong> controls cash minimums and the equity/defensive balance. Aggressive holds 5% cash with heavy equity tilt. Preservation holds 30%+ cash with heavy gold tilt. SPX absorbs whatever allocation remains after BTC, Gold, and Cash are assigned.
          </p>

          <div style={{ ...labelStyle, marginTop: "20px" }}>Drift Monitor</div>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            Input your current dollar holdings per asset. The tool calculates actual percentages, compares them to targets, and flags any asset drifting beyond your threshold (default 5%). When rebalancing is needed, it shows exact buy/sell amounts to return to target. The threshold is configurable — tighter thresholds mean more frequent rebalancing (higher friction, tighter tracking), wider thresholds mean less action (lower friction, more drift tolerance).
          </p>
        </div>

        {/* ── Euphoria Gauge ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "22px" }}>🌡️</span>
            <h3 style={{ ...h3Style, margin: 0 }}>Euphoria Gauge</h3>
          </div>

          <p style={pStyle}>
            The inverse of Buy Fear. Instead of detecting fear to buy into, it detects euphoria to avoid buying into — or to consider trimming. These are awareness checks, not sell signals.
          </p>

          <div style={labelStyle}>Signal Tiers</div>
          <p style={pStyle}>
            Each indicator evaluates to one of three states: 🔴 Danger (historically marks tops or extreme overvaluation), 🟡 Warning (elevated conditions, caution warranted), or 🟢 Clear (normal range). Multiple danger signals firing simultaneously is the highest-conviction warning.
          </p>

          <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700, marginBottom: "8px" }}>Bitcoin — Cycle Top Detection</div>
          <p style={pStyle}>
            On-chain metrics (MVRV Z-Score, NUPL) are the strongest signals here. They measure actual investor profitability relative to cost basis — not sentiment or momentum. Historically, MVRV Z &gt; 7 and NUPL &gt; 0.75 have identified cycle tops within two weeks. Weekly RSI and the 200-day MA extension add momentum confirmation.
          </p>

          <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: 700, marginBottom: "8px", marginTop: "16px" }}>S&P 500 — Caution Flags</div>
          <p style={pStyle}>
            SPX indicators are explicitly not top signals. Markets can remain overbought and expensive for years. Low VIX, high monthly RSI, and elevated CAPE indicate the market is priced for perfection — meaning forward returns are likely compressed, not that a crash is imminent. These flags say "don't FOMO buy here" rather than "sell everything."
          </p>

          <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 700, marginBottom: "8px", marginTop: "16px" }}>Gold — Limited Utility</div>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            Gold tops are inherently harder to call. Monetary demand (central bank buying, debasement hedging) can sustain moves well beyond what technical indicators suggest is overbought. The gold/silver ratio and monthly RSI provide some signal but with lower confidence than BTC's on-chain data.
          </p>
        </div>

        {/* ── Data Sources ── */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>Data Sources</h3>
          <p style={pStyle}>Buy Fear auto-populates market data from the following APIs:</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { source: "EODHD", data: "SPX price, Gold price, Silver price, VIX", type: "API key" },
              { source: "Alpha Vantage", data: "SPX monthly RSI, Gold monthly RSI", type: "API key" },
              { source: "CoinGecko", data: "BTC price, BTC weekly RSI, BTC vs 200D MA %", type: "Free" },
              { source: "Bitcoin Lab", data: "MVRV Z-Score, NUPL", type: "API key" },
              { source: "multpl.com", data: "Shiller CAPE Ratio (scraped)", type: "Free" },
              { source: "alternative.me", data: "Crypto Fear & Greed Index", type: "Free" },
            ].map(function (s) {
              return (
                <div key={s.source} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <span style={{ fontSize: "13px", color: "#ccc", fontWeight: 600 }}>{s.source}</span>
                    <span style={{ fontSize: "12px", color: "#555", marginLeft: "10px" }}>{s.data}</span>
                  </div>
                  <span style={{
                    fontSize: "9px", fontWeight: 700, letterSpacing: "1px", padding: "2px 8px", borderRadius: "3px",
                    background: s.type === "Free" ? "rgba(74,222,128,0.1)" : "rgba(96,165,250,0.1)",
                    color: s.type === "Free" ? "#4ade80" : "#60a5fa",
                    border: "1px solid " + (s.type === "Free" ? "rgba(74,222,128,0.2)" : "rgba(96,165,250,0.2)"),
                  }}>{s.type}</span>
                </div>
              );
            })}
          </div>

          <p style={{ ...pStyle, marginTop: "12px", marginBottom: 0 }}>
            All auto-populated fields remain manually editable as overrides. Data refreshes on page load with a 5-minute server-side cache. Cash balance and cash floor are always manual inputs.
          </p>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ ...sectionStyle, background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.1)" }}>
          <h3 style={{ ...h3Style, color: "#f87171" }}>Disclaimer</h3>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            These tools are for informational and educational purposes only. Nothing here constitutes financial advice, investment recommendations, or solicitation to buy or sell any asset. All investment decisions carry risk including the potential loss of principal. Past performance of any asset or strategy does not guarantee future results. Consult a qualified financial advisor before making investment decisions.
          </p>
        </div>

      </div>

      <div style={{ marginTop: "40px", fontSize: "10px", color: "#333", textAlign: "center" }}>
        Not financial advice · Tools for personal use
      </div>
    </div>
  );
}
