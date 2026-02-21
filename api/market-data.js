var EODHD = process.env.EODHD_KEY;
var AV_KEY = process.env.ALPHA_VANTAGE_KEY;
var BTCLAB = process.env.BTCLAB_KEY;
var CQ_KEY = process.env.CRYPTOQUANT_KEY;
var UPSTREAM_TIMEOUT_MS = 8000;
function round2(n) { return Math.round(n * 100) / 100; }

async function fetchWithTimeout(url, options, timeoutMs) {
  var controller = new AbortController();
  var ms = timeoutMs || UPSTREAM_TIMEOUT_MS;
  var timer = setTimeout(function () { controller.abort(); }, ms);
  try {
    var mergedOptions = Object.assign({}, options || {}, { signal: controller.signal });
    return await fetch(url, mergedOptions);
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error("Timeout after " + ms + "ms");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    var parsed = new URL(origin);
    var host = parsed.hostname;
    if (parsed.protocol === "https:" && (host === "regimeiq.com" || host === "www.regimeiq.com")) return true;
    if (parsed.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}

function calcRSI(closes, period) {
  period = period || 14;
  if (!closes || closes.length < period + 1) return null;
  var changes = [];
  for (var i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);
  var avgGain = 0, avgLoss = 0;
  for (var j = 0; j < period; j++) {
    if (changes[j] > 0) avgGain += changes[j];
    else avgLoss += Math.abs(changes[j]);
  }
  avgGain /= period;
  avgLoss /= period;
  for (var k = period; k < changes.length; k++) {
    var g = changes[k] > 0 ? changes[k] : 0;
    var l = changes[k] < 0 ? Math.abs(changes[k]) : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function toWeeklyCloses(closes) {
  var weekly = [];
  for (var i = 4; i < closes.length; i += 5) weekly.push(closes[i]);
  if (closes.length % 5 !== 0) weekly.push(closes[closes.length - 1]);
  return weekly;
}

// ── EODHD ──

async function eodHistory(symbol, days) {
  var from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  var url = "https://eodhd.com/api/eod/" + symbol + "?api_token=" + EODHD + "&fmt=json&from=" + from + "&order=a";
  var res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("EODHD " + symbol + " " + res.status);
  var json = await res.json();
  if (!Array.isArray(json) || json.length === 0) throw new Error("No data " + symbol);
  return json;
}

async function eodRealtime(symbol) {
  var url = "https://eodhd.com/api/real-time/" + symbol + "?api_token=" + EODHD + "&fmt=json";
  var res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("EODHD RT " + symbol + " " + res.status);
  var json = await res.json();
  if (!json.close && json.close !== 0) throw new Error("No price " + symbol);
  return parseFloat(json.close);
}

async function fetchSPX() {
  var data = await eodHistory("SPY.US", 90);
  var closes = data.map(function (d) { return parseFloat(d.close); });
  var last60 = closes.slice(-60);
  return {
    currentSPX: round2(closes[closes.length - 1]),
    recentHighSPX: round2(Math.max.apply(null, last60)),
  };
}

async function fetchGold() {
  var data = await eodHistory("XAUUSD.FOREX", 90);
  var closes = data.map(function (d) { return parseFloat(d.close); });
  var last60 = closes.slice(-60);
  return {
    currentGOLD: round2(closes[closes.length - 1]),
    recentHighGOLD: round2(Math.max.apply(null, last60)),
  };
}

async function fetchVIX() {
  return round2(await eodRealtime("VIX.INDX"));
}

// ── EODHD: Silver for Au/Ag ratio ──

async function fetchSilver() {
  var data = await eodHistory("XAGUSD.FOREX", 10);
  var closes = data.map(function (d) { return parseFloat(d.close); });
  if (closes.length === 0) throw new Error("No silver data");
  return closes[closes.length - 1];
}

// ── Alpha Vantage: SPX Monthly RSI (1 call) ──

async function fetchSPXRsi() {
  var url = "https://www.alphavantage.co/query?function=RSI&symbol=SPY&interval=monthly&time_period=14&series_type=close&apikey=" + AV_KEY;
  var res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("AV RSI " + res.status);
  var json = await res.json();
  if (json["Note"] || json["Information"]) throw new Error("AV rate limit");
  var meta = json["Technical Analysis: RSI"];
  if (!meta) throw new Error("AV no RSI data");
  var dates = Object.keys(meta).sort().reverse();
  if (dates.length === 0) throw new Error("AV RSI empty");
  return round2(parseFloat(meta[dates[0]].RSI));
}

// ── Alpha Vantage: Gold Monthly RSI ──

async function fetchGoldRsi() {
  var url = "https://www.alphavantage.co/query?function=RSI&symbol=GLD&interval=monthly&time_period=14&series_type=close&apikey=" + AV_KEY;
  var res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("AV Gold RSI " + res.status);
  var json = await res.json();
  if (json["Note"] || json["Information"]) throw new Error("AV Gold RSI rate limit");
  var meta = json["Technical Analysis: RSI"];
  if (!meta) throw new Error("AV no Gold RSI data");
  var dates = Object.keys(meta).sort().reverse();
  if (dates.length === 0) throw new Error("AV Gold RSI empty");
  return round2(parseFloat(meta[dates[0]].RSI));
}

async function btcLabFetch(category, field) {
  var url = "https://api.researchbitcoin.net/v2/" + category + "/" + field + "?resolution=d1&output_format=json";
  var res = await fetchWithTimeout(url, {
    headers: { "X-API-Token": BTCLAB },
  });
  if (!res.ok) throw new Error("BtcLab " + field + " " + res.status);
  var json = await res.json();
  // Handle various response shapes
  var data = Array.isArray(json) ? json
    : json.data && Array.isArray(json.data) ? json.data
    : json.result && Array.isArray(json.result) ? json.result
    : null;
  if (data && data.length > 0) {
    var last = data[data.length - 1];
    var val = null;
    if (Array.isArray(last)) val = parseFloat(last[last.length - 1]);
    else if (typeof last === "object") val = parseFloat(last.value || last[field] || last[Object.keys(last).pop()]);
    else val = parseFloat(last);
    if (!isNaN(val)) return round2(val);
  }
  // Maybe it's a single object with the value directly
  if (json && typeof json === "object" && !Array.isArray(json)) {
    var v = json.value || json[field] || json.latest;
    if (v != null) return round2(parseFloat(v));
  }
  throw new Error("BtcLab " + field + " no parseable data");
}

async function fetchMVRV() {
  return await btcLabFetch("market_value_to_realized_value", "mvrv_z");
}

async function fetchNUPL() {
  return await btcLabFetch("net_unrealized_profit_loss", "net_unrealized_profit_loss");
}

// ── CryptoQuant: NUPL (primary) ──

async function fetchNUPLFromCQ() {
  var url = "https://api.cryptoquant.com/v1/btc/network-indicator/nupl?window=day&limit=1";
  var res = await fetchWithTimeout(url, {
    headers: { "Authorization": "Bearer " + CQ_KEY },
  });
  if (!res.ok) throw new Error("CQ NUPL " + res.status);
  var json = await res.json();
  var data = json.result && json.result.data;
  if (!data || !Array.isArray(data) || data.length === 0) throw new Error("CQ NUPL no data");
  var last = data[data.length - 1];
  var keys = Object.keys(last);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] === "date" || keys[i] === "datetime" || keys[i] === "timestamp") continue;
    var n = parseFloat(last[keys[i]]);
    if (!isNaN(n)) return round2(n);
  }
  throw new Error("CQ NUPL parse failed");
}

// ── CoinGecko: BTC (free) ──

async function fetchBTC() {
  var res = await fetchWithTimeout(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=250&interval=daily",
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("CoinGecko " + res.status);
  var json = await res.json();
  var prices = json.prices.map(function (p) { return p[1]; });
  var current = prices[prices.length - 1];
  var last60 = prices.slice(-60);
  var weeklyCloses = toWeeklyCloses(prices);
  var wRsi = calcRSI(weeklyCloses, 14);

  // 200-day SMA and % above
  var btcVs200d = null;
  if (prices.length >= 200) {
    var last200 = prices.slice(-200);
    var sma200 = last200.reduce(function (s, p) { return s + p; }, 0) / 200;
    if (sma200 > 0) btcVs200d = round2(((current - sma200) / sma200) * 100);
  }

  return {
    currentBTC: round2(current),
    recentHighBTC: round2(Math.max.apply(null, last60)),
    btcRsi: wRsi != null ? round2(wRsi) : null,
    btcVs200d: btcVs200d,
  };
}

// ── alternative.me: Crypto F&G (free) ──

async function fetchFG() {
  var res = await fetchWithTimeout("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) throw new Error("F&G " + res.status);
  var json = await res.json();
  var val = json.data && json.data[0] && json.data[0].value;
  return val != null ? parseInt(val, 10) : null;
}

// ── Shiller CAPE: scrape multpl.com ──

async function fetchCAPE() {
  var url = "https://www.multpl.com/shiller-pe/table/by-month";
  var res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error("CAPE HTTP " + res.status);
  var html = await res.text();
  if (!html || html.length < 100) throw new Error("CAPE empty response");

  // Try multiple patterns for the first numeric value in the table
  var patterns = [
    // Pattern 1: td with date then td with number
    /<td[^>]*>[^<]*\d{4}[^<]*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>/,
    // Pattern 2: just find first standalone decimal number after "table" or "by-month"
    /by-month[\s\S]*?<td[^>]*>\s*([\d]{2,3}\.[\d]{1,2})\s*<\/td>/,
    // Pattern 3: any td containing a number like 40.38
    /<td[^>]*>\s*(\d{2,3}\.\d{1,2})\s*<\/td>/,
    // Pattern 4: number after "Current" or "estimate"
    /(?:current|estimate)[^<]*?(\d{2,3}\.\d{1,2})/i,
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = html.match(patterns[i]);
    if (match) {
      var val = parseFloat(match[1]);
      if (!isNaN(val) && val > 5 && val < 200) return round2(val);
    }
  }
  throw new Error("CAPE parse failed (len=" + html.length + ")");
}

// ── Handler ──

export default async function handler(req, res) {
  var origin = req.headers.origin || "";
  var allowed = isAllowedOrigin(origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "https://regimeiq.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  var output = {};
  var warnings = [];

  // SPX via SPY (EODHD)
  try {
    Object.assign(output, await fetchSPX());
  } catch (e) { warnings.push("SPX: " + e.message); }

  // SPX Monthly RSI (Alpha Vantage)
  try {
    output.spxRsi = await fetchSPXRsi();
  } catch (e) { warnings.push("SPX RSI: " + e.message); }

  // Gold (EODHD)
  try {
    Object.assign(output, await fetchGold());
  } catch (e) { warnings.push("Gold: " + e.message); }

  // Gold Monthly RSI (Alpha Vantage — GLD ETF)
  try {
    output.goldRsi = await fetchGoldRsi();
  } catch (e) { warnings.push("Gold RSI: " + e.message); }

  // VIX (EODHD)
  try {
    output.vix = await fetchVIX();
  } catch (e) { warnings.push("VIX: " + e.message); }

  // Au/Ag ratio (EODHD silver + gold already fetched)
  try {
    var silverPrice = await fetchSilver();
    if (output.currentGOLD && silverPrice > 0) {
      output.gsRatio = round2(output.currentGOLD / silverPrice);
    }
  } catch (e) { warnings.push("Au/Ag: " + e.message); }

  // BTC (CoinGecko)
  try {
    Object.assign(output, await fetchBTC());
  } catch (e) { warnings.push("BTC: " + e.message); }

  // Crypto F&G (alternative.me)
  try {
    var fg = await fetchFG();
    if (fg != null) output.cryptoFG = fg;
  } catch (e) { warnings.push("F&G: " + e.message); }

  // MVRV Z-Score (Bitcoin Lab)
  try {
    output.mvrv = await fetchMVRV();
  } catch (e) { warnings.push("MVRV: " + e.message); }

  // NUPL (CryptoQuant primary → Bitcoin Lab fallback)
  try {
    output.nupl = await fetchNUPLFromCQ();
  } catch (e1) {
    try { output.nupl = await fetchNUPL(); }
    catch (e2) { warnings.push("NUPL: CQ=" + e1.message + " | BtcLab=" + e2.message); }
  }

  // Shiller CAPE (NASDAQ Data Link)
  try {
    output.cape = await fetchCAPE();
  } catch (e) { warnings.push("CAPE: " + e.message); }

  output.timestamp = new Date().toISOString();
  if (warnings.length > 0) output.warnings = warnings;

  res.status(200).json(output);
}
