import { useState, useCallback } from "react";

/* ── Allocation Matrix ── */
var RISK_PROFILES = {
  aggressive:      { label: "Aggressive",      cashMin: 5,  eqLean: "heavy" },
  semiAggressive:  { label: "Semi-Aggressive",  cashMin: 10, eqLean: "heavy" },
  balanced:        { label: "Balanced",          cashMin: 15, eqLean: "med" },
  conservative:    { label: "Conservative",      cashMin: 20, eqLean: "light" },
  preservation:    { label: "Preservation",      cashMin: 30, eqLean: "min" },
};

var BTC_CONVICTION = {
  true:     { label: "True Conviction", range: [40, 50] },
  moderate: { label: "Moderate",        range: [15, 25] },
  some:     { label: "Some Exposure",   range: [5, 10] },
};

var GOLD_CONVICTION = {
  austrian:  { label: "Hard Asset / Austrian", range: [15, 25] },
  hedge:     { label: "Defensive Hedge",       range: [5, 10] },
};

function generateTargets(assets, btcConviction, goldConviction, riskProfile) {
  var profile = RISK_PROFILES[riskProfile];
  var hasBTC = assets.includes("BTC");
  var hasSPX = assets.includes("SPX");
  var hasGold = assets.includes("GOLD");
  var hasCash = assets.includes("CASH");

  var targets = {};
  var remaining = 100;

  // Cash allocation
  if (hasCash) {
    targets.CASH = profile.cashMin;
    remaining -= targets.CASH;
  }

  // BTC allocation
  if (hasBTC) {
    var conv = BTC_CONVICTION[btcConviction];
    var btcRange = conv.range;
    var btcPct;
    if (riskProfile === "aggressive") btcPct = btcRange[1];
    else if (riskProfile === "semiAggressive") btcPct = Math.round((btcRange[0] + btcRange[1]) / 2);
    else if (riskProfile === "balanced") btcPct = btcRange[0];
    else if (riskProfile === "conservative") btcPct = Math.round(btcRange[0] * 0.8);
    else btcPct = Math.round(btcRange[0] * 0.5);
    targets.BTC = Math.min(btcPct, remaining);
    remaining -= targets.BTC;
  }

  // Gold allocation (conviction-driven if selected)
  if (hasGold && goldConviction) {
    var gConv = GOLD_CONVICTION[goldConviction];
    var goldRange = gConv.range;
    var goldPct;
    if (riskProfile === "aggressive") goldPct = goldRange[0];
    else if (riskProfile === "semiAggressive") goldPct = goldRange[0];
    else if (riskProfile === "balanced") goldPct = Math.round((goldRange[0] + goldRange[1]) / 2);
    else if (riskProfile === "conservative") goldPct = goldRange[1];
    else goldPct = goldRange[1] + 5; // preservation gets extra gold
    targets.GOLD = Math.min(goldPct, remaining);
    remaining -= targets.GOLD;
  }

  // SPX gets whatever is left
  if (hasSPX) {
    targets.SPX = remaining;
    remaining = 0;
  } else if (hasGold && !goldConviction) {
    // Gold selected but somehow no conviction — fallback split
    targets.GOLD = remaining;
    remaining = 0;
  }

  // Edge case: gold selected, no SPX, gold already allocated above
  if (!hasSPX && hasGold && goldConviction && remaining > 0) {
    targets.GOLD += remaining;
    remaining = 0;
  }

  // Safety net: ensure allocations always sum to 100%.
  if (remaining > 0) {
    if (hasSPX) targets.SPX = (targets.SPX || 0) + remaining;
    else if (hasGold) targets.GOLD = (targets.GOLD || 0) + remaining;
    else if (hasBTC) targets.BTC = (targets.BTC || 0) + remaining;
    else if (hasCash) targets.CASH = (targets.CASH || 0) + remaining;
  }

  return targets;
}

/* ── Step order logic ── */
// Step 0: Assets
// Step 1: BTC conviction (skip if no BTC)
// Step 2: Gold conviction (skip if no GOLD)
// Step 3: Risk tolerance
// Step 4: Results

function getNextStep(current, assets) {
  if (current === 0) {
    if (assets.includes("BTC")) return 1;
    if (assets.includes("GOLD")) return 2;
    return 3;
  }
  if (current === 1) {
    if (assets.includes("GOLD")) return 2;
    return 3;
  }
  if (current === 2) return 3;
  if (current === 3) return 4;
  return current + 1;
}

function getPrevStep(current, assets) {
  if (current === 4) return 3;
  if (current === 3) {
    if (assets.includes("GOLD")) return 2;
    if (assets.includes("BTC")) return 1;
    return 0;
  }
  if (current === 2) {
    if (assets.includes("BTC")) return 1;
    return 0;
  }
  if (current === 1) return 0;
  return 0;
}

function countSteps(assets) {
  var n = 3; // assets + risk + results
  if (assets.includes("BTC")) n++;
  if (assets.includes("GOLD")) n++;
  return n;
}

function getStepIndex(current, assets) {
  var order = [0];
  if (assets.includes("BTC")) order.push(1);
  if (assets.includes("GOLD")) order.push(2);
  order.push(3, 4);
  return order.indexOf(current);
}

/* ── Components ── */

var ASSET_META = {
  SPX:  { icon: "📈", color: "#60a5fa", label: "S&P 500" },
  BTC:  { icon: "₿",  color: "#f59e0b", label: "Bitcoin" },
  GOLD: { icon: "🥇", color: "#fbbf24", label: "Gold" },
  CASH: { icon: "💵", color: "#4ade80", label: "Cash" },
};

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
      {Array.from({ length: total }, function (_, i) {
        return (
          <div key={i} style={{
            flex: 1, height: "3px", borderRadius: "2px",
            background: i <= current ? "#60a5fa" : "rgba(255,255,255,0.08)",
            transition: "background 0.3s",
          }} />
        );
      })}
    </div>
  );
}

function OptionButton({ selected, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "14px 20px", borderRadius: "6px", cursor: "pointer",
      border: selected ? "1px solid rgba(96,165,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
      background: selected ? "rgba(96,165,250,0.1)" : "rgba(255,255,255,0.02)",
      color: selected ? "#e0e0e0" : "#888",
      fontSize: "13px", fontWeight: 600, transition: "all 0.2s",
      textAlign: "left", width: "100%",
    }}>{children}</button>
  );
}

function NavButtons({ onBack, onNext, nextLabel, nextDisabled }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
      {onBack && (
        <button onClick={onBack} style={{
          flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)",
          background: "none", color: "#888", fontSize: "13px", fontWeight: 600, cursor: "pointer",
        }}>← Back</button>
      )}
      <button onClick={onNext} disabled={nextDisabled} style={{
        flex: 2, padding: "12px", borderRadius: "6px", border: "none",
        background: !nextDisabled ? "#60a5fa" : "rgba(255,255,255,0.05)",
        color: !nextDisabled ? "#000" : "#444",
        fontSize: "13px", fontWeight: 700, cursor: !nextDisabled ? "pointer" : "not-allowed",
        letterSpacing: "0.5px",
      }}>{nextLabel || "Continue →"}</button>
    </div>
  );
}

/* ── Main Component ── */

export default function Rebalancer() {
  var [step, setStep] = useState(0);
  var [assets, setAssets] = useState([]);
  var [btcConviction, setBtcConviction] = useState(null);
  var [goldConviction, setGoldConviction] = useState(null);
  var [riskProfile, setRiskProfile] = useState(null);
  var [targets, setTargets] = useState(null);
  var [holdings, setHoldings] = useState({});
  var [driftThreshold, setDriftThreshold] = useState(5);

  var toggleAsset = useCallback(function (a) {
    setAssets(function (prev) {
      return prev.includes(a) ? prev.filter(function (x) { return x !== a; }) : prev.concat(a);
    });
  }, []);

  var totalHoldings = Object.values(holdings).reduce(function (s, v) { return s + (parseFloat(v) || 0); }, 0);
  var totalSteps = countSteps(assets);
  var stepIndex = getStepIndex(step, assets);

  function goNext() {
    if (step === 0 && assets.length < 2) return;
    if (step === 1 && !btcConviction) return;
    if (step === 2 && !goldConviction) return;
    if (step === 3 && !riskProfile) return;

    var next = getNextStep(step, assets);
    if (next === 4) {
      var t = generateTargets(assets, btcConviction || "some", goldConviction || "hedge", riskProfile);
      setTargets(t);
      var h = {};
      Object.keys(t).forEach(function (k) { h[k] = ""; });
      setHoldings(h);
    }
    setStep(next);
  }

  function goBack() {
    setStep(getPrevStep(step, assets));
  }

  function reset() {
    setStep(0);
    setAssets([]);
    setBtcConviction(null);
    setGoldConviction(null);
    setRiskProfile(null);
    setTargets(null);
    setHoldings({});
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 50px)", background: "#0a0a0b", color: "#e0e0e0",
      fontFamily: "'Inter',-apple-system,sans-serif",
      padding: "clamp(16px, 4vw, 40px)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "600px" }}>

        {/* ── Step 0: Asset Selection ── */}
        {step === 0 && (
          <div>
            <StepIndicator current={0} total={totalSteps} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>Select Your Asset Classes</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px 0" }}>Choose at least 2. These will form your portfolio allocation.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {["SPX", "BTC", "GOLD", "CASH"].map(function (a) {
                var m = ASSET_META[a];
                var selected = assets.includes(a);
                return (
                  <OptionButton key={a} selected={selected} onClick={function () { toggleAsset(a); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: selected ? m.color : "#888" }}>{a}</div>
                        <div style={{ fontSize: "11px", color: "#555", fontWeight: 400 }}>{m.label}</div>
                      </div>
                    </div>
                  </OptionButton>
                );
              })}
            </div>
            <NavButtons onNext={goNext} nextDisabled={assets.length < 2} />
          </div>
        )}

        {/* ── Step 1: BTC Conviction ── */}
        {step === 1 && (
          <div>
            <StepIndicator current={stepIndex} total={totalSteps} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>Bitcoin Conviction Level</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px 0" }}>This determines your BTC allocation ceiling.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { id: "true", label: "True Conviction", desc: "You understand the thesis deeply and can stomach 60%+ drawdowns.", range: "40–50%" },
                { id: "moderate", label: "Moderate", desc: "Bullish long-term but want meaningful diversification.", range: "15–25%" },
                { id: "some", label: "Some Exposure", desc: "Asymmetric upside bet without portfolio-level risk.", range: "5–10%" },
              ].map(function (opt) {
                var sel = btcConviction === opt.id;
                return (
                  <OptionButton key={opt.id} selected={sel} onClick={function () { setBtcConviction(opt.id); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: sel ? "#f59e0b" : "#888" }}>{opt.label}</div>
                        <div style={{ fontSize: "11px", color: "#555", fontWeight: 400, marginTop: "4px", lineHeight: 1.4 }}>{opt.desc}</div>
                      </div>
                      <span style={{
                        fontSize: "12px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                        color: sel ? "#f59e0b" : "#444", whiteSpace: "nowrap", marginLeft: "16px",
                      }}>{opt.range}</span>
                    </div>
                  </OptionButton>
                );
              })}
            </div>
            <NavButtons onBack={goBack} onNext={goNext} nextDisabled={!btcConviction} />
          </div>
        )}

        {/* ── Step 2: Gold Conviction ── */}
        {step === 2 && (
          <div>
            <StepIndicator current={stepIndex} total={totalSteps} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>Gold Thesis</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px 0" }}>Why are you holding gold? This determines allocation weight.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                {
                  id: "austrian",
                  label: "Hard Asset / Austrian",
                  desc: "Sound money conviction. Gold is a core holding — monetary debasement hedge, central bank failure insurance, permanent portfolio anchor.",
                  range: "15–25%",
                },
                {
                  id: "hedge",
                  label: "Defensive Hedge",
                  desc: "Tail risk protection. Gold is a diversifier — uncorrelated to equities, crisis insurance, not a core thesis.",
                  range: "5–10%",
                },
              ].map(function (opt) {
                var sel = goldConviction === opt.id;
                return (
                  <OptionButton key={opt.id} selected={sel} onClick={function () { setGoldConviction(opt.id); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: sel ? "#fbbf24" : "#888" }}>{opt.label}</div>
                        <div style={{ fontSize: "11px", color: "#555", fontWeight: 400, marginTop: "4px", lineHeight: 1.4 }}>{opt.desc}</div>
                      </div>
                      <span style={{
                        fontSize: "12px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                        color: sel ? "#fbbf24" : "#444", whiteSpace: "nowrap", marginLeft: "16px",
                      }}>{opt.range}</span>
                    </div>
                  </OptionButton>
                );
              })}
            </div>
            <NavButtons onBack={goBack} onNext={goNext} nextDisabled={!goldConviction} />
          </div>
        )}

        {/* ── Step 3: Risk Tolerance ── */}
        {step === 3 && (
          <div>
            <StepIndicator current={stepIndex} total={totalSteps} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>Risk Tolerance</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px 0" }}>Controls how aggressively capital tilts toward equities vs. defensive assets.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { id: "aggressive", label: "Aggressive", desc: "Heavy equities, minimal cash buffer. Max growth, max volatility." },
                { id: "semiAggressive", label: "Semi-Aggressive", desc: "Growth-oriented with a small safety net." },
                { id: "balanced", label: "Balanced", desc: "Even split between growth and defensive. Classic 50/50 mindset." },
                { id: "conservative", label: "Conservative", desc: "Defensive tilt. Prioritizes capital preservation with some upside." },
                { id: "preservation", label: "Preservation", desc: "Heavy cash and gold. Minimal drawdown tolerance." },
              ].map(function (opt) {
                var sel = riskProfile === opt.id;
                return (
                  <OptionButton key={opt.id} selected={sel} onClick={function () { setRiskProfile(opt.id); }}>
                    <div>
                      <div style={{ fontWeight: 700, color: sel ? "#60a5fa" : "#888" }}>{opt.label}</div>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: 400, marginTop: "4px" }}>{opt.desc}</div>
                    </div>
                  </OptionButton>
                );
              })}
            </div>
            <NavButtons onBack={goBack} onNext={goNext} nextLabel="Generate Allocation →" nextDisabled={!riskProfile} />
          </div>
        )}

        {/* ── Step 4: Results + Drift ── */}
        {step === 4 && targets && (
          <div>
            <StepIndicator current={stepIndex} total={totalSteps} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: 0 }}>Your Target Allocation</h2>
              <button onClick={reset} style={{
                background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px",
                color: "#888", fontSize: "11px", fontWeight: 600, padding: "5px 10px",
                cursor: "pointer", letterSpacing: "0.5px",
              }}>Reset</button>
            </div>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px 0" }}>
              {RISK_PROFILES[riskProfile].label}
              {btcConviction ? " · " + BTC_CONVICTION[btcConviction].label + " BTC" : ""}
              {goldConviction ? " · " + GOLD_CONVICTION[goldConviction].label + " Gold" : ""}
            </p>

            {/* Target bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
              {Object.keys(targets).map(function (a) {
                var m = ASSET_META[a];
                var pct = targets[a];
                return (
                  <div key={a}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: m.color }}>
                        {m.icon} {a}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#e0e0e0" }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", background: m.color, borderRadius: "4px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drift tracker */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px", padding: "20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700 }}>
                  Drift Monitor
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", color: "#555" }}>Threshold</span>
                  <input type="number" value={driftThreshold} min="0" step="0.1" onChange={function (e) {
                    var parsed = parseFloat(e.target.value);
                    if (isNaN(parsed)) { setDriftThreshold(0); return; }
                    setDriftThreshold(Math.max(0, parsed));
                  }}
                    style={{
                      width: "50px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "4px", color: "#e0e0e0", padding: "4px 8px", fontSize: "12px",
                      fontFamily: "'JetBrains Mono',monospace", textAlign: "center", outline: "none",
                    }} />
                  <span style={{ fontSize: "10px", color: "#555" }}>%</span>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>
                Enter current values ($) for each asset to track drift from targets.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.keys(targets).map(function (a) {
                  var m = ASSET_META[a];
                  var holdingVal = parseFloat(holdings[a]) || 0;
                  var currentPct = totalHoldings > 0 ? (holdingVal / totalHoldings) * 100 : 0;
                  var drift = currentPct - targets[a];
                  var absDrift = Math.abs(drift);
                  var overThreshold = absDrift >= driftThreshold;

                  return (
                    <div key={a} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: m.color, width: "50px" }}>{m.icon} {a}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ color: "#555", fontSize: "13px" }}>$</span>
                        <input type="number" value={holdings[a]} placeholder="0"
                          onChange={function (e) {
                            var val = e.target.value;
                            setHoldings(function (prev) { return Object.assign({}, prev, { [a]: val }); });
                          }}
                          style={{
                            width: "120px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "4px", color: "#e0e0e0", padding: "8px 10px", fontSize: "14px",
                            fontFamily: "'JetBrains Mono',monospace", outline: "none",
                          }}
                          onFocus={function (e) { e.target.style.borderColor = "rgba(96,165,250,0.5)"; }}
                          onBlur={function (e) { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                        <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono',monospace", color: "#888" }}>
                          {totalHoldings > 0 ? currentPct.toFixed(1) + "%" : "—"}
                        </span>
                        <span style={{ fontSize: "10px", color: "#555" }}>→</span>
                        <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono',monospace", color: "#888" }}>
                          {targets[a]}%
                        </span>
                        {totalHoldings > 0 && (
                          <span style={{
                            fontSize: "11px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                            padding: "2px 8px", borderRadius: "3px",
                            background: overThreshold ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.1)",
                            color: overThreshold ? "#f87171" : "#4ade80",
                            border: "1px solid " + (overThreshold ? "rgba(239,68,68,0.3)" : "rgba(74,222,128,0.2)"),
                          }}>
                            {drift > 0 ? "+" : ""}{drift.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalHoldings > 0 && (
                <div style={{
                  marginTop: "16px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "6px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                      Total Portfolio
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#e0e0e0" }}>
                      ${totalHoldings.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {Object.keys(targets).some(function (a) {
                      var hv = parseFloat(holdings[a]) || 0;
                      var cp = totalHoldings > 0 ? (hv / totalHoldings) * 100 : 0;
                      return Math.abs(cp - targets[a]) >= driftThreshold;
                    }) ? (
                      <div style={{
                        fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "4px",
                        background: "rgba(239,68,68,0.15)", color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}>⚠ REBALANCE NEEDED</div>
                    ) : (
                      <div style={{
                        fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "4px",
                        background: "rgba(74,222,128,0.1)", color: "#4ade80",
                        border: "1px solid rgba(74,222,128,0.2)",
                      }}>✓ BALANCED</div>
                    )}
                  </div>
                </div>
              )}

              {/* Rebalance actions */}
              {totalHoldings > 0 && Object.keys(targets).some(function (a) {
                var hv = parseFloat(holdings[a]) || 0;
                var cp = totalHoldings > 0 ? (hv / totalHoldings) * 100 : 0;
                return Math.abs(cp - targets[a]) >= driftThreshold;
              }) && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: "10px" }}>
                    To Rebalance
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {Object.keys(targets).map(function (a) {
                      var m = ASSET_META[a];
                      var hv = parseFloat(holdings[a]) || 0;
                      var targetVal = totalHoldings * (targets[a] / 100);
                      var diff = targetVal - hv;
                      if (Math.abs(diff) < 1) return null;
                      return (
                        <div key={a} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                          <span style={{ color: m.color, fontWeight: 700, width: "50px" }}>{m.icon} {a}</span>
                          <span style={{
                            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                            color: diff > 0 ? "#4ade80" : "#f87171",
                          }}>
                            {diff > 0 ? "Buy" : "Sell"} ${Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={goBack} style={{
                flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)",
                background: "none", color: "#888", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>← Reconfigure</button>
            </div>
          </div>
        )}

      </div>

      <div style={{ marginTop: "40px", fontSize: "10px", color: "#333", textAlign: "center" }}>
        Not financial advice · Tools for personal use
      </div>
    </div>
  );
}
