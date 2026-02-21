import { useEffect, useState } from "react";
import BuyFear from "./BuyFear";
import Rebalancer from "./Rebalancer";
import Methodology from "./Methodology";
import EuphoriaGauge from "./EuphoriaGauge";

var TOOLS = [
  {
    id: "fear",
    label: "Buy Fear",
    desc: "Rules-based capital deployment on pullbacks. Calculates how much to buy based on drawdown tiers and confirmation indicators.",
    icon: "⚡",
    tags: ["SPX", "BTC", "GOLD"],
    component: BuyFear,
  },
  {
    id: "euphoria",
    label: "Euphoria Gauge",
    desc: "Is this a top? Traffic light dashboard for euphoria detection. On-chain, sentiment, and valuation signals across assets.",
    icon: "🌡️",
    tags: ["BTC", "SPX", "GOLD"],
    component: EuphoriaGauge,
  },
  {
    id: "rebalance",
    label: "Portfolio Rebalancer",
    desc: "Profile your risk tolerance and conviction levels. Generates target allocations and tracks drift from targets.",
    icon: "⚖️",
    tags: ["ALLOCATION", "DRIFT"],
    component: Rebalancer,
  },
  {
    id: "methodology",
    label: "Methodology",
    desc: "How the tools work, the logic behind every output, data sources, and the framework's assumptions.",
    icon: "📖",
    tags: ["INFO", "LOGIC"],
    component: Methodology,
  },
];

function ToolCard({ tool, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px", padding: "28px", cursor: "pointer", textAlign: "left",
      transition: "all 0.25s ease", width: "100%", display: "flex", flexDirection: "column", gap: "14px",
    }}
      onMouseEnter={function (e) { e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)"; e.currentTarget.style.background = "rgba(96,165,250,0.04)"; }}
      onMouseLeave={function (e) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "28px" }}>{tool.icon}</span>
        <span style={{ fontSize: "18px", fontWeight: 700, color: "#e0e0e0", letterSpacing: "-0.3px" }}>{tool.label}</span>
      </div>
      <p style={{ fontSize: "13px", color: "#777", lineHeight: "1.5", margin: 0 }}>{tool.desc}</p>
      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        {tool.tags.map(function (t) {
          return (
            <span key={t} style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px",
              borderRadius: "3px", background: "rgba(255,255,255,0.04)", color: "#555",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>{t}</span>
          );
        })}
      </div>
      <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: 600, marginTop: "auto" }}>
        Open →
      </div>
    </button>
  );
}

export default function App() {
  var [activeTool, setActiveTool] = useState(null);
  var tool = activeTool ? TOOLS.find(function (t) { return t.id === activeTool; }) : null;

  useEffect(function () {
    if (activeTool && !tool) setActiveTool(null);
  }, [activeTool, tool]);

  if (activeTool && tool) {
    var Component = tool.component;
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0b" }}>
        <div style={{
          padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: "16px",
        }}>
          <button onClick={function () { setActiveTool(null); }} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px",
            color: "#888", fontSize: "12px", fontWeight: 600, padding: "5px 12px",
            cursor: "pointer", letterSpacing: "0.5px",
          }}
            onMouseEnter={function (e) { e.currentTarget.style.color = "#e0e0e0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >← Back</button>
          <span style={{ fontSize: "11px", color: "#555", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
            {tool.label}
          </span>
        </div>
        <Component />
      </div>
    );
  }

  if (activeTool && !tool) return null;

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0b", color: "#e0e0e0",
      fontFamily: "'Inter',-apple-system,sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "clamp(24px, 8vw, 80px) clamp(16px, 4vw, 24px)",
    }}>
      <style>{`
        @media (max-width: 600px) {
          .tool-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: "48px", maxWidth: "500px" }}>
        <div style={{ fontSize: "10px", color: "#60a5fa", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>
          RegimeIQ
        </div>
        <h1 style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800, color: "#fff", margin: "0 0 12px 0", letterSpacing: "-1px", lineHeight: 1.2 }}>
          Investment Tools
        </h1>
        <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.6 }}>
          No predictions. No emotions. Just systematic execution.
        </p>
      </div>

      <div className="tool-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
        gap: "16px", width: "100%", maxWidth: "740px",
      }}>
        {TOOLS.map(function (t) { return <ToolCard key={t.id} tool={t} onClick={function () { setActiveTool(t.id); }} />; })}
      </div>

      <div style={{ marginTop: "60px", fontSize: "10px", color: "#333", textAlign: "center" }}>
        Not financial advice · Tools for personal use
      </div>
    </div>
  );
}
