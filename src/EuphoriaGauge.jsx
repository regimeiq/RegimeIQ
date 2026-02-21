import { useState, useCallback, useEffect } from "react";

/* ── Indicator definitions ── */

var BTC_INDICATORS = [
  { key: "mvrv", label: "MVRV Z-Score", thresholds: [{ val: 7, color: "#f87171", tag: "Cycle Top Zone" }, { val: 4, color: "#f59e0b", tag: "Overheated" }], above: true, desc: "On-chain: market value vs realized value. Historically picks cycle tops within 2 weeks when entering red zone." },
  { key: "nupl", label: "NUPL", thresholds: [{ val: 0.75, color: "#f87171", tag: "Euphoria" }, { val: 0.5, color: "#f59e0b", tag: "Elevated Profit" }], above: true, desc: "On-chain: net unrealized profit/loss. Above 0.75 = nearly all holders in extreme profit. Historically unsustainable." },
  { key: "cryptoFG", label: "Crypto Fear & Greed", thresholds: [{ val: 90, color: "#f87171", tag: "Extreme Greed" }, { val: 75, color: "#f59e0b", tag: "Greed" }], above: true, desc: "Sentiment composite. Extreme greed historically precedes corrections, though can persist for weeks." },
  { key: "btcRsi", label: "Weekly RSI", thresholds: [{ val: 90, color: "#f87171", tag: "Blow-off Top" }, { val: 70, color: "#f59e0b", tag: "Overbought" }], above: true, desc: "Momentum oscillator. Weekly timeframe filters noise. Above 90 is rare and historically marks local or cycle tops." },
  { key: "btcVs200d", label: "Price vs 200D MA", thresholds: [{ val: 100, color: "#f87171", tag: "Extreme Extension" }, { val: 50, color: "#f59e0b", tag: "Overextended" }], above: true, suffix: "% above", desc: "Mean reversion signal. Bitcoin rarely sustains 2x+ its 200-day moving average. Measures how stretched price is from trend." },
];

var SPX_INDICATORS = [
  { key: "vix", label: "VIX", thresholds: [{ val: 12, color: "#f59e0b", tag: "Complacency" }], above: false, desc: "Implied volatility. VIX below 12 = market pricing near-zero risk. Not a sell signal — markets can stay complacent for years." },
  { key: "spxRsi", label: "Monthly RSI", thresholds: [{ val: 80, color: "#f87171", tag: "Extreme Overbought" }, { val: 70, color: "#f59e0b", tag: "Overbought" }], above: true, desc: "Long-term momentum. Monthly RSI above 70 suggests stretched conditions, but SPX can ride overbought for extended periods." },
  { key: "cape", label: "Shiller CAPE", thresholds: [{ val: 40, color: "#f87171", tag: "Historically Expensive" }, { val: 35, color: "#f59e0b", tag: "Elevated" }], above: true, desc: "Cyclically-adjusted P/E ratio. Measures valuations over 10-year earnings. High CAPE = lower expected forward returns, not an imminent crash signal." },
];

var GOLD_INDICATORS = [
  { key: "gsRatio", label: "Gold/Silver Ratio", thresholds: [{ val: 60, color: "#f59e0b", tag: "Gold Relatively Rich" }], above: false, desc: "Below 60 = gold expensive relative to silver historically. Can indicate precious metals euphoria but also monetary demand." },
  { key: "goldRsi", label: "Monthly RSI", thresholds: [{ val: 90, color: "#f87171", tag: "Extreme Overbought" }, { val: 80, color: "#f59e0b", tag: "Overbought" }], above: true, desc: "Gold monthly momentum. Above 80 is rare and historically precedes multi-month consolidation or correction. Monetary demand can sustain elevated readings longer than other assets." },
];

function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

function evaluateIndicator(ind, value) {
  var v = num(value);
  if (v === null) return { status: "neutral", color: "#333", tag: "No data" };

  // Sort thresholds: for "above" indicators, check highest first; for "below", check lowest first
  var sorted = ind.thresholds.slice().sort(function (a, b) {
    return ind.above ? b.val - a.val : a.val - b.val;
  });

  for (var i = 0; i < sorted.length; i++) {
    var th = sorted[i];
    if (ind.above ? v >= th.val : v <= th.val) {
      return { status: th.color === "#f87171" ? "danger" : "warning", color: th.color, tag: th.tag };
    }
  }

  return { status: "ok", color: "#4ade80", tag: "Normal" };
}

function countSignals(indicators, values) {
  var danger = 0, warning = 0, total = 0;
  for (var i = 0; i < indicators.length; i++) {
    var v = num(values[indicators[i].key]);
    if (v === null) continue;
    total++;
    var result = evaluateIndicator(indicators[i], values[indicators[i].key]);
    if (result.status === "danger") danger++;
    else if (result.status === "warning") warning++;
  }
  return { danger: danger, warning: warning, total: total };
}

function getVerdict(signals) {
  if (signals.total === 0) return { label: "NO DATA", color: "#555", bg: "rgba(255,255,255,0.03)" };
  if (signals.danger >= 2) return { label: "HIGH RISK", color: "#f87171", bg: "rgba(239,68,68,0.08)" };
  if (signals.danger >= 1) return { label: "ELEVATED", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" };
  if (signals.warning >= 2) return { label: "CAUTION", color: "#f59e0b", bg: "rgba(245,158,11,0.05)" };
  if (signals.warning >= 1) return { label: "WARM", color: "#fbbf24", bg: "rgba(251,191,36,0.05)" };
  return { label: "CLEAR", color: "#4ade80", bg: "rgba(74,222,128,0.05)" };
}

/* ── Components ── */

function IndicatorRow({ ind, value, onChange }) {
  var result = evaluateIndicator(ind, value);
  var v = num(value);
  var hasValue = v !== null;

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "200px" }}>
          <div style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: hasValue ? result.color : "#333",
            boxShadow: hasValue && result.status !== "ok" ? ("0 0 8px " + result.color + "66") : "none",
            transition: "all 0.3s",
          }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#ccc" }}>{ind.label}</div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "2px", lineHeight: 1.4 }}>{ind.desc}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input type="number" value={value} onChange={function (e) { onChange(e.target.value); }}
            placeholder="—" step="any"
            style={{
              width: "90px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px", color: "#e0e0e0", padding: "6px 10px", fontSize: "14px",
              fontFamily: "'JetBrains Mono',monospace", outline: "none", textAlign: "right",
            }}
            onFocus={function (e) { e.target.style.borderColor = "rgba(96,165,250,0.5)"; }}
            onBlur={function (e) { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          {ind.suffix && <span style={{ fontSize: "10px", color: "#555" }}>{ind.suffix}</span>}
          {hasValue && (
            <span style={{
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", padding: "3px 8px", borderRadius: "3px",
              background: result.color + "22", color: result.color,
              border: "1px solid " + result.color + "44",
              minWidth: "70px", textAlign: "center",
            }}>{result.tag}</span>
          )}
        </div>
      </div>
      {hasValue && result.status !== "ok" && (
        <div style={{ marginTop: "6px", marginLeft: "20px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {ind.thresholds.map(function (th, i) {
            var triggered = ind.above ? v >= th.val : v <= th.val;
            return (
              <span key={i} style={{
                fontSize: "10px", fontFamily: "'JetBrains Mono',monospace",
                color: triggered ? th.color : "#333",
              }}>
                {ind.above ? "≥" : "≤"}{th.val} {triggered ? "✓" : ""}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssetSection({ title, icon, color, indicators, values, onChange, caveat }) {
  var signals = countSignals(indicators, values);
  var verdict = getVerdict(signals);

  return (
    <div style={{
      background: verdict.bg, border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px", padding: "20px", marginBottom: "16px",
      transition: "background 0.3s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>{icon}</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: color, letterSpacing: "0.5px" }}>{title}</span>
        </div>
        <span style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "1px", padding: "4px 12px", borderRadius: "4px",
          background: verdict.color + "22", color: verdict.color,
          border: "1px solid " + verdict.color + "33",
        }}>{verdict.label}</span>
      </div>
      {caveat && (
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "12px", lineHeight: 1.4, fontStyle: "italic" }}>
          {caveat}
        </div>
      )}
      <div>
        {indicators.map(function (ind) {
          return (
            <IndicatorRow key={ind.key} ind={ind} value={values[ind.key] || ""}
              onChange={function (v) { onChange(ind.key, v); }} />
          );
        })}
      </div>
      {signals.total > 0 && (
        <div style={{ marginTop: "12px", display: "flex", gap: "16px", fontSize: "11px", color: "#555" }}>
          <span>🔴 {signals.danger} danger</span>
          <span>🟡 {signals.warning} warning</span>
          <span>🟢 {signals.total - signals.danger - signals.warning} clear</span>
        </div>
      )}
    </div>
  );
}

/* ── Main ── */

export default function EuphoriaGauge() {
  var [values, setValues] = useState({
    mvrv: "", nupl: "", cryptoFG: "", btcRsi: "", btcVs200d: "",
    vix: "", spxRsi: "", cape: "",
    gsRatio: "", goldRsi: "",
  });
  var [loading, setLoading] = useState(false);
  var [lastUpdated, setLastUpdated] = useState(null);
  var [fetchError, setFetchError] = useState(null);
  var [warnings, setWarnings] = useState([]);

  var update = useCallback(function (key, val) {
    setValues(function (prev) { return Object.assign({}, prev, { [key]: val }); });
  }, []);

  var fetchLiveData = useCallback(async function () {
    setLoading(true);
    setFetchError(null);
    setWarnings([]);
    try {
      var res = await fetch("/api/market-data");
      if (!res.ok) throw new Error("API " + res.status);
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      setValues(function (prev) {
        var next = Object.assign({}, prev);
        // Map from market-data keys
        if (data.mvrv != null) next.mvrv = data.mvrv;
        if (data.nupl != null) next.nupl = data.nupl;
        if (data.cryptoFG != null) next.cryptoFG = data.cryptoFG;
        if (data.btcRsi != null) next.btcRsi = data.btcRsi;
        if (data.vix != null) next.vix = data.vix;
        if (data.spxRsi != null) next.spxRsi = data.spxRsi;
        if (data.gsRatio != null) next.gsRatio = data.gsRatio;
        if (data.btcVs200d != null) next.btcVs200d = data.btcVs200d;
        if (data.cape != null) next.cape = data.cape;
        if (data.goldRsi != null) next.goldRsi = data.goldRsi;
        return next;
      });
      setLastUpdated(data.timestamp);
      if (data.warnings) setWarnings(data.warnings);
    } catch (err) {
      setFetchError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(function () { fetchLiveData(); }, [fetchLiveData]);

  var fmtTime = function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Overall signal count
  var allIndicators = BTC_INDICATORS.concat(SPX_INDICATORS).concat(GOLD_INDICATORS);
  var allSignals = countSignals(allIndicators, values);
  var overallVerdict = getVerdict(allSignals);

  return (
    <div style={{
      minHeight: "calc(100vh - 50px)", background: "#0a0a0b", color: "#e0e0e0",
      fontFamily: "'Inter',-apple-system,sans-serif",
      padding: "clamp(16px, 4vw, 40px)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "700px" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>EUPHORIA GAUGE</h1>
            <span style={{
              fontSize: "9px", padding: "3px 8px", borderRadius: "3px",
              background: overallVerdict.color + "1a", color: overallVerdict.color,
              border: "1px solid " + overallVerdict.color + "33",
              fontWeight: 700, letterSpacing: "1.5px",
            }}>{overallVerdict.label}</span>
            <button onClick={fetchLiveData} disabled={loading} style={{
              marginLeft: "auto", padding: "6px 14px", borderRadius: "4px",
              border: "1px solid rgba(96,165,250,0.3)", background: loading ? "rgba(96,165,250,0.1)" : "rgba(96,165,250,0.15)",
              color: "#60a5fa", fontSize: "11px", fontWeight: 700, letterSpacing: "1px",
              cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase",
              opacity: loading ? 0.5 : 1,
            }}>{loading ? "FETCHING…" : "↻ REFRESH"}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
              Euphoria detection across assets · Not sell signals — awareness checks
            </p>
            {lastUpdated && <span style={{ fontSize: "10px", color: "#444", fontFamily: "'JetBrains Mono',monospace" }}>Updated {fmtTime(lastUpdated)}</span>}
          </div>
          {fetchError && <div style={{ marginTop: "8px", fontSize: "11px", color: "#f87171" }}>⚠ Fetch failed: {fetchError}</div>}
          {warnings.length > 0 && <div style={{ marginTop: "8px", fontSize: "11px", color: "#f59e0b" }}>⚠ Partial data — failed: {warnings.join(", ")}</div>}
        </div>

        {/* Explainer */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "8px", padding: "16px", marginBottom: "20px",
        }}>
          <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.6 }}>
            <div><span style={{ color: "#f87171" }}>🔴 Danger</span> = historically marks tops or extreme overvaluation.</div>
            <div><span style={{ color: "#f59e0b" }}>🟡 Warning</span> = elevated conditions, proceed with caution.</div>
            <div><span style={{ color: "#4ade80" }}>🟢 Clear</span> = within normal range.</div>
          </div>
        </div>

        {/* Asset sections */}
        <AssetSection
          title="Bitcoin" icon="₿" color="#f59e0b"
          indicators={BTC_INDICATORS} values={values} onChange={update}
          caveat="On-chain metrics (MVRV, NUPL) have historically identified cycle tops within 2 weeks. High confidence at extremes."
        />

        <AssetSection
          title="S&P 500" icon="📈" color="#60a5fa"
          indicators={SPX_INDICATORS} values={values} onChange={update}
          caveat="These are caution flags, not top signals. Markets can stay irrational — overbought and expensive — far longer than expected. High valuations compress forward returns but don't predict imminent crashes."
        />

        <AssetSection
          title="Gold" icon="🥇" color="#fbbf24"
          indicators={GOLD_INDICATORS} values={values} onChange={update}
          caveat="Gold tops are harder to identify. Monetary demand can sustain moves well beyond technical overbought levels."
        />

      </div>

      <div style={{ marginTop: "40px", fontSize: "10px", color: "#333", textAlign: "center" }}>
        Not financial advice · Tools for personal use
      </div>
    </div>
  );
}
