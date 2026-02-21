var EODHD = process.env.EODHD_KEY;
var AV_KEY = process.env.ALPHA_VANTAGE_KEY;
var BTCLAB = process.env.BTCLAB_KEY;
var CQ_KEY = process.env.CRYPTOQUANT_KEY;
function readPositiveInt(name, fallback) {
  var raw = process.env[name];
  var n = parseInt(raw || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
var UPSTREAM_TIMEOUT_MS = readPositiveInt("UPSTREAM_TIMEOUT_MS", 8000);
var RATE_LIMIT_WINDOW_MS = readPositiveInt("RATE_LIMIT_WINDOW_MS", 60000);
var RATE_LIMIT_MAX_REQUESTS = readPositiveInt("RATE_LIMIT_MAX_REQUESTS", 30);
var MEMORY_CACHE_TTL_MS = readPositiveInt("MEMORY_CACHE_TTL_MS", 60000);
var DEFAULT_ALLOWED_ORIGIN = "https://regimeiq.com";
var state = globalThis.__REGIMEIQ_API_STATE__;
if (!state) {
  state = { hits: new Map(), cache: null, inflight: null };
  globalThis.__REGIMEIQ_API_STATE__ = state;
}
function round2(n) { return Math.round(n * 100) / 100; }
function errorMessage(err) { return err && err.message ? err.message : String(err || "Unknown error"); }
function firstDefined() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
  }
  return null;
}

function getClientIp(req) {
  var xff = req.headers["x-forwarded-for"];
  if (Array.isArray(xff) && xff.length > 0) xff = xff[0];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  var realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return "unknown";
}

function pruneRateLimitState(now) {
  var cutoff = now - RATE_LIMIT_WINDOW_MS * 2;
  state.hits.forEach(function (entry, key) {
    if (!entry || entry.windowStart < cutoff) state.hits.delete(key);
  });
}

function checkRateLimit(ip, now) {
  var rec = state.hits.get(ip);
  if (!rec || now - rec.windowStart >= RATE_LIMIT_WINDOW_MS) rec = { windowStart: now, count: 0 };
  rec.count += 1;
  state.hits.set(ip, rec);
  if (rec.count <= RATE_LIMIT_MAX_REQUESTS) return null;
  var retryAfterMs = Math.max(1000, RATE_LIMIT_WINDOW_MS - (now - rec.windowStart));
  return {
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  };
}

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
    else if (typeof last === "object") {
      var objVal = firstDefined(last.value, last[field], last[Object.keys(last).pop()]);
      val = parseFloat(objVal);
    }
    else val = parseFloat(last);
    if (!isNaN(val)) return round2(val);
  }
  // Maybe it's a single object with the value directly
  if (json && typeof json === "object" && !Array.isArray(json)) {
    var v = firstDefined(json.value, json[field], json.latest);
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

async function fetchNUPLWithFallback() {
  try {
    return await fetchNUPLFromCQ();
  } catch (e1) {
    try {
      return await fetchNUPL();
    } catch (e2) {
      throw new Error("CQ=" + errorMessage(e1) + " | BtcLab=" + errorMessage(e2));
    }
  }
}

function applySettled(result, label, warnings, onSuccess) {
  if (result.status === "fulfilled") {
    onSuccess(result.value);
    return;
  }
  warnings.push(label + ": " + errorMessage(result.reason));
}

async function buildMarketPayload() {
  var output = {};
  var warnings = [];

  var spxP = fetchSPX();
  var spxRsiP = fetchSPXRsi();
  var goldP = fetchGold();
  var goldRsiP = fetchGoldRsi();
  var vixP = fetchVIX();
  var silverP = fetchSilver();
  var btcP = fetchBTC();
  var fgP = fetchFG();
  var mvrvP = fetchMVRV();
  var nuplP = fetchNUPLWithFallback();
  var capeP = fetchCAPE();

  var results = await Promise.allSettled([
    spxP, spxRsiP, goldP, goldRsiP, vixP, silverP, btcP, fgP, mvrvP, nuplP, capeP,
  ]);

  var spxRes = results[0];
  var spxRsiRes = results[1];
  var goldRes = results[2];
  var goldRsiRes = results[3];
  var vixRes = results[4];
  var silverRes = results[5];
  var btcRes = results[6];
  var fgRes = results[7];
  var mvrvRes = results[8];
  var nuplRes = results[9];
  var capeRes = results[10];

  applySettled(spxRes, "SPX", warnings, function (v) { Object.assign(output, v); });
  applySettled(spxRsiRes, "SPX RSI", warnings, function (v) { output.spxRsi = v; });
  applySettled(goldRes, "Gold", warnings, function (v) { Object.assign(output, v); });
  applySettled(goldRsiRes, "Gold RSI", warnings, function (v) { output.goldRsi = v; });
  applySettled(vixRes, "VIX", warnings, function (v) { output.vix = v; });
  applySettled(btcRes, "BTC", warnings, function (v) { Object.assign(output, v); });
  applySettled(fgRes, "F&G", warnings, function (v) { if (v != null) output.cryptoFG = v; });
  applySettled(mvrvRes, "MVRV", warnings, function (v) { output.mvrv = v; });
  applySettled(nuplRes, "NUPL", warnings, function (v) { output.nupl = v; });
  applySettled(capeRes, "CAPE", warnings, function (v) { output.cape = v; });

  if (goldRes.status === "fulfilled" && silverRes.status === "fulfilled") {
    var gold = goldRes.value && goldRes.value.currentGOLD;
    var silver = silverRes.value;
    if (gold && silver > 0) output.gsRatio = round2(gold / silver);
  } else if (silverRes.status === "rejected") {
    warnings.push("Au/Ag: " + errorMessage(silverRes.reason));
  }

  output.timestamp = new Date().toISOString();
  if (warnings.length > 0) output.warnings = warnings;
  return output;
}

export default async function handler(req, res) {
  var origin = req.headers.origin || "";
  var allowed = isAllowedOrigin(origin);

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : DEFAULT_ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (origin && !allowed) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  var now = Date.now();
  pruneRateLimitState(now);
  var ip = getClientIp(req);
  var limited = checkRateLimit(ip, now);
  if (limited) {
    res.setHeader("Retry-After", String(limited.retryAfterSec));
    res.status(429).json({
      error: "Rate limit exceeded",
      limit: limited.limit,
      windowMs: limited.windowMs,
    });
    return;
  }

  if (state.cache && now - state.cache.ts < MEMORY_CACHE_TTL_MS) {
    res.setHeader("X-Cache", "HIT");
    res.status(200).json(state.cache.payload);
    return;
  }

  try {
    if (!state.inflight) state.inflight = buildMarketPayload();
    var payload = await state.inflight;
    state.cache = { ts: Date.now(), payload: payload };
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(payload);
  } catch (err) {
    res.status(502).json({ error: "Upstream fetch failed", detail: errorMessage(err) });
  } finally {
    state.inflight = null;
  }
}
