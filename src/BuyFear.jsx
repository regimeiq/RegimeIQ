import { useState, useCallback, useEffect } from "react";

const TIERS = {
  SPX: [
    { drop: 2, pct: 5, label: "Nibble" },
    { drop: 5, pct: 15, label: "Buy" },
    { drop: 10, pct: 25, label: "Aggressive" },
    { drop: 15, pct: 25, label: "Heavy" },
    { drop: 20, pct: 30, label: "Unload Bag" },
  ],
  BTC: [
    { drop: 20, pct: 5, label: "Nibble" },
    { drop: 30, pct: 15, label: "Buy" },
    { drop: 40, pct: 20, label: "Aggressive" },
    { drop: 50, pct: 25, label: "Heavy" },
    { drop: 60, pct: 35, label: "Unload Bag" },
  ],
  GOLD: [
    { drop: 5, pct: 10, label: "Nibble" },
    { drop: 10, pct: 25, label: "Buy" },
    { drop: 15, pct: 35, label: "Aggressive" },
    { drop: 20, pct: 30, label: "Back Up Truck" },
  ],
};

const CONFIRMATIONS = {
  SPX: [
    { key: "vix", label: "VIX", thresholds: [{ val: 30, bonus: 5, tag: "Fear" }, { val: 40, bonus: 10, tag: "Panic" }] },
    { key: "spxRsi", label: "Monthly RSI", thresholds: [{ val: 30, bonus: 5, tag: "Oversold", below: true }] },
  ],
  BTC: [
    { key: "cryptoFG", label: "Crypto F&G", thresholds: [{ val: 25, bonus: 5, tag: "Fear", below: true }, { val: 10, bonus: 10, tag: "Extreme Fear", below: true }] },
    { key: "mvrv", label: "MVRV Z-Score", thresholds: [{ val: 0, bonus: 15, tag: "Cycle Bottom", below: true }] },
    { key: "nupl", label: "NUPL", thresholds: [{ val: 0, bonus: 10, tag: "Capitulation", below: true }] },
    { key: "btcRsi", label: "Weekly RSI", thresholds: [{ val: 30, bonus: 5, tag: "Oversold", below: true }] },
  ],
  GOLD: [
    { key: "gsRatio", label: "Gold/Silver Ratio", thresholds: [{ val: 90, bonus: 5, tag: "Dislocation" }] },
  ],
};

const ASSET_META = {
  SPX: { icon: "📈", color: "#60a5fa", bg: "rgba(96,165,250,0.06)", bd: "rgba(96,165,250,0.15)" },
  BTC: { icon: "₿", color: "#f59e0b", bg: "rgba(245,158,11,0.06)", bd: "rgba(245,158,11,0.15)" },
  GOLD: { icon: "🥇", color: "#fbbf24", bg: "rgba(251,191,36,0.06)", bd: "rgba(251,191,36,0.15)" },
};

const DEFAULT_INPUTS = {
  recentHighSPX: "", currentSPX: "",
  recentHighBTC: "", currentBTC: "",
  recentHighGOLD: "", currentGOLD: "",
  mmFloor: "", mmBalance: "",
  vix: "", spxRsi: "", cryptoFG: "",
  mvrv: "", nupl: "", btcRsi: "", gsRatio: "",
};

const MANUAL_KEYS = new Set(["mmFloor", "mmBalance"]);

function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function numOrNull(v) {
  if (v == null || v === "") return null;
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function calcDrawdown(high, current) {
  var h = num(high), c = num(current);
  if (h === 0) return 0;
  return Math.max(0, ((h - c) / h) * 100);
}
function getActiveTiers(dd, tiers) { return tiers.filter(function (t) { return dd >= t.drop; }); }
function getCumulativePct(active) { return active.reduce(function (s, t) { return s + t.pct; }, 0); }
function getConfirmationBonus(asset, inputs) {
  var confs = CONFIRMATIONS[asset] || [];
  var totalBonus = 0, activeConfs = [];
  for (var i = 0; i < confs.length; i++) {
    var c = confs[i];
    var val = numOrNull(inputs[c.key]);
    if (val === null) continue;
    for (var j = 0; j < c.thresholds.length; j++) {
      var th = c.thresholds[j];
      if (th.below ? val < th.val : val > th.val) {
        totalBonus += th.bonus;
        activeConfs.push({ label: c.label, tag: th.tag, bonus: th.bonus, val: val });
      }
    }
  }
  return { totalBonus: totalBonus, activeConfs: activeConfs };
}

function StatusPill({ active, label }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "3px", fontSize: "11px",
      fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
      background: active ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
      color: active ? "#f87171" : "#555",
      border: `1px solid ${active ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
    }}>{label}</span>
  );
}

function InputField({ label, value, onChange, prefix, suffix, small, manual }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
        {label}
        {manual && <span style={{ fontSize: "8px", color: "#f59e0b", fontWeight: 700, letterSpacing: "1px" }}>MANUAL</span>}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {prefix && <span style={{ color: "#555", fontSize: "13px" }}>{prefix}</span>}
        <input type="number" value={value} onChange={e => onChange(e.target.value)} step="any"
          placeholder="—"
          style={{
            background: manual ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${manual ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "4px", color: "#e0e0e0", padding: "8px 10px", fontSize: "14px",
            fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace",
            width: small ? "90px" : "130px", outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(96,165,250,0.5)")}
          onBlur={e => (e.target.style.borderColor = manual ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.1)")}
        />
        {suffix && <span style={{ color: "#555", fontSize: "12px" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function AssetToggle({ asset, enabled, onToggle }) {
  var m = ASSET_META[asset];
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px",
      borderRadius: "4px", border: `1px solid ${enabled ? m.bd : "rgba(255,255,255,0.08)"}`,
      background: enabled ? m.bg : "rgba(255,255,255,0.02)",
      cursor: "pointer", transition: "all 0.2s",
    }}>
      <span style={{ fontSize: "14px", opacity: enabled ? 1 : 0.3 }}>{m.icon}</span>
      <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: enabled ? m.color : "#444" }}>{asset}</span>
      <span style={{
        fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "3px", letterSpacing: "0.5px",
        background: enabled ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
        color: enabled ? "#4ade80" : "#555",
      }}>{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}

function AssetPanel({ asset, inputs, drawdown, tiers, buyFund, enabled }) {
  var activeTiers = getActiveTiers(drawdown, tiers);
  var cumPct = getCumulativePct(activeTiers);
  var { totalBonus, activeConfs } = getConfirmationBonus(asset, inputs);
  var totalPct = Math.min(cumPct + totalBonus, 100);
  var deployAmount = buyFund * (totalPct / 100);
  var isTriggered = activeTiers.length > 0;
  var highestTier = activeTiers[activeTiers.length - 1] || null;
  var C = ASSET_META[asset];

  return (
    <div style={{
      background: !enabled ? "rgba(255,255,255,0.01)" : isTriggered ? C.bg : "rgba(255,255,255,0.02)",
      border: `1px solid ${!enabled ? "rgba(255,255,255,0.04)" : isTriggered ? C.bd : "rgba(255,255,255,0.06)"}`,
      borderRadius: "8px", padding: "20px", transition: "all 0.3s ease",
      opacity: enabled ? 1 : 0.35, pointerEvents: enabled ? "auto" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>{C.icon}</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: C.color, letterSpacing: "1px" }}>{asset}</span>
          {!enabled && <span style={{ fontSize: "9px", color: "#555", fontWeight: 600, letterSpacing: "1px" }}>DISABLED</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: drawdown >= (asset === "BTC" ? 20 : asset === "GOLD" ? 5 : 2) ? "#f87171" : "#4ade80" }}>
            -{drawdown.toFixed(1)}%
          </div>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>from 60d high</div>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "3px", marginBottom: "8px" }}>
          {tiers.map((t, i) => <div key={i} style={{ flex: t.pct, height: "6px", borderRadius: "3px", background: drawdown >= t.drop ? C.color : "rgba(255,255,255,0.06)", opacity: drawdown >= t.drop ? 0.9 : 0.3, transition: "all 0.3s" }} />)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {tiers.map((t, i) => { var a = drawdown >= t.drop; return (
            <div key={i} style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "3px", fontFamily: "'JetBrains Mono',monospace", background: a ? `${C.color}22` : "rgba(255,255,255,0.03)", color: a ? C.color : "#444", border: `1px solid ${a ? `${C.color}33` : "rgba(255,255,255,0.05)"}` }}>
              -{t.drop}% → {t.pct}% {a ? "✓" : ""}
            </div>
          ); })}
        </div>
      </div>

      {(CONFIRMATIONS[asset]?.length > 0) && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", fontWeight: 600 }}>Confirmations</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {activeConfs.length > 0 ? activeConfs.map((c, i) => <StatusPill key={i} active label={`${c.tag} +${c.bonus}%`} />) : <span style={{ fontSize: "11px", color: "#444" }}>None active</span>}
          </div>
        </div>
      )}

      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Deploy</div>
          <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: isTriggered ? "#4ade80" : "#333" }}>
            ${deployAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
            {cumPct}% tiers{totalBonus > 0 ? ` + ${totalBonus}% conf` : ""}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: isTriggered ? C.color : "#333" }}>{totalPct}%</div>
        </div>
      </div>

      {highestTier && <div style={{ marginTop: "10px", fontSize: "12px", color: C.color, fontWeight: 600 }}>▸ {highestTier.label} tier active</div>}
    </div>
  );
}

export default function DCADashboard() {
  var [inputs, setInputs] = useState(DEFAULT_INPUTS);
  var [enabled, setEnabled] = useState({ SPX: true, BTC: true, GOLD: true });
  var [loading, setLoading] = useState(false);
  var [lastUpdated, setLastUpdated] = useState(null);
  var [fetchError, setFetchError] = useState(null);
  var [warnings, setWarnings] = useState([]);

  var update = useCallback(function (key, val) {
    setInputs(function (prev) { return Object.assign({}, prev, { [key]: val }); });
  }, []);

  var toggleAsset = useCallback(function (asset) {
    setEnabled(function (prev) { return Object.assign({}, prev, { [asset]: !prev[asset] }); });
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
      setInputs(function (prev) {
        var next = Object.assign({}, prev);
        for (var k in data) {
          if (k === "timestamp" || k === "warnings") continue;
          if (MANUAL_KEYS.has(k)) continue;
          if (data[k] != null && typeof data[k] === "number") next[k] = data[k];
        }
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

  var buyFund = Math.max(0, num(inputs.mmBalance) - num(inputs.mmFloor));
  var dd = {
    SPX: calcDrawdown(inputs.recentHighSPX, inputs.currentSPX),
    BTC: calcDrawdown(inputs.recentHighBTC, inputs.currentBTC),
    GOLD: calcDrawdown(inputs.recentHighGOLD, inputs.currentGOLD),
  };

  var totalPct = 0;
  ["SPX", "BTC", "GOLD"].forEach(function (a) {
    if (!enabled[a]) return;
    var cum = getCumulativePct(getActiveTiers(dd[a], TIERS[a]));
    var bonus = getConfirmationBonus(a, inputs).totalBonus;
    totalPct += Math.min(cum + bonus, 100);
  });

  var fmtTime = function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0b", color: "#e0e0e0", fontFamily: "'Inter',-apple-system,sans-serif", padding: "clamp(12px, 3vw, 24px)" }}>
      <style>{`
        @media (max-width: 600px) {
          .asset-grid { grid-template-columns: 1fr !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .conf-wrap { gap: 10px !important; }
          .conf-wrap > div { flex: 1 1 calc(50% - 10px); min-width: 80px; }
          .capital-row { flex-direction: column; gap: 12px !important; }
          .toggle-row { flex-wrap: wrap; }
          .header-row { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
          .header-row button { margin-left: 0 !important; }
        }
      `}</style>

      {/* header */}
      <div style={{ marginBottom: "28px" }}>
        <div className="header-row" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>BUY FEAR</h1>
          <span style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "3px", background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", fontWeight: 700, letterSpacing: "1.5px" }}>ACCUMULATE ONLY</span>
          <button onClick={fetchLiveData} disabled={loading} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: "4px", border: "1px solid rgba(96,165,250,0.3)", background: loading ? "rgba(96,165,250,0.1)" : "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase", opacity: loading ? 0.5 : 1 }}>
            {loading ? "FETCHING…" : "↻ REFRESH"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>Rules-based deployment on pullbacks · Buy fear, stack conviction</p>
          {lastUpdated && <span style={{ fontSize: "10px", color: "#444", fontFamily: "'JetBrains Mono',monospace" }}>Updated {fmtTime(lastUpdated)}</span>}
        </div>
        {fetchError && <div style={{ marginTop: "8px", fontSize: "11px", color: "#f87171" }}>⚠ Fetch failed: {fetchError} — using manual values</div>}
        {warnings.length > 0 && <div style={{ marginTop: "8px", fontSize: "11px", color: "#f59e0b" }}>⚠ Partial data — failed: {warnings.join(", ")}</div>}
      </div>

      {/* capital + toggles */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700 }}>Capital</div>
          <div className="toggle-row" style={{ display: "flex", gap: "8px" }}>
            {["SPX", "BTC", "GOLD"].map(function (a) {
              return <AssetToggle key={a} asset={a} enabled={enabled[a]} onToggle={function () { toggleAsset(a); }} />;
            })}
          </div>
        </div>
        <div className="capital-row" style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>
          <InputField label="Cash Balance" value={inputs.mmBalance} onChange={function (v) { update("mmBalance", v); }} prefix="$" />
          <InputField label="Cash Floor" value={inputs.mmFloor} onChange={function (v) { update("mmFloor", v); }} prefix="$" />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Available Buy Fund</label>
            <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: buyFund > 0 ? "#4ade80" : "#f87171" }}>${buyFund.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#555", lineHeight: 1.5 }}>
          Tier percentages are calculated against your <span style={{ color: "#888" }}>original buy fund</span>, not remaining balance. Tiers are cumulative — a deeper drawdown activates all previous tiers. Total across all tiers sums to 100%, so your buy fund is only fully exhausted at maximum historical drawdown. Confirmation bonuses stack on top.
        </div>
        {totalPct > 100 && (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", fontSize: "12px", color: "#f87171", fontWeight: 600 }}>
            ⚠ OVERCOMMITTED: {totalPct}% total across enabled assets exceeds 100% of buy fund. Prioritize by conviction.
          </div>
        )}
      </div>

      {/* prices */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: "14px" }}>Prices & Drawdowns</div>
        <div className="price-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          {[
            { label: "S&P 500", color: "#60a5fa", highKey: "recentHighSPX", curKey: "currentSPX" },
            { label: "Bitcoin", color: "#f59e0b", highKey: "recentHighBTC", curKey: "currentBTC" },
            { label: "Gold", color: "#fbbf24", highKey: "recentHighGOLD", curKey: "currentGOLD" },
          ].map(function (item) {
            return (
              <div key={item.curKey}>
                <div style={{ fontSize: "12px", color: item.color, fontWeight: 700, marginBottom: "10px" }}>{item.label}</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <InputField label="60D High" value={inputs[item.highKey]} onChange={function (v) { update(item.highKey, v); }} small />
                  <InputField label="Current" value={inputs[item.curKey]} onChange={function (v) { update(item.curKey, v); }} small />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* confirmations */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: "14px" }}>Confirmation Indicators</div>
        <div className="conf-wrap" style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <InputField label="VIX" value={inputs.vix} onChange={function (v) { update("vix", v); }} small />
          <InputField label="SPX Mo. RSI" value={inputs.spxRsi} onChange={function (v) { update("spxRsi", v); }} small />
          <InputField label="Crypto F&G" value={inputs.cryptoFG} onChange={function (v) { update("cryptoFG", v); }} small />
          <InputField label="MVRV Z" value={inputs.mvrv} onChange={function (v) { update("mvrv", v); }} small />
          <InputField label="NUPL" value={inputs.nupl} onChange={function (v) { update("nupl", v); }} small />
          <InputField label="BTC Wk RSI" value={inputs.btcRsi} onChange={function (v) { update("btcRsi", v); }} small />
          <InputField label="Au/Ag Ratio" value={inputs.gsRatio} onChange={function (v) { update("gsRatio", v); }} small />
        </div>
      </div>

      {/* asset panels */}
      <div className="asset-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: "16px", marginBottom: "24px" }}>
        {["SPX", "BTC", "GOLD"].map(function (a) {
          return <AssetPanel key={a} asset={a} inputs={inputs} drawdown={dd[a]} tiers={TIERS[a]} buyFund={buyFund} enabled={enabled[a]} />;
        })}
      </div>

      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "10px", color: "#333" }}>
        Auto-fetch via EODHD + Alpha Vantage + CoinGecko + Bitcoin Lab + alternative.me · Not financial advice
      </div>
    </div>
  );
}
