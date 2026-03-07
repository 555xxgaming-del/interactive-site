import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(process.cwd());
const cfgPath = path.join(ROOT, 'crawler-keywords.json');
const outPath = path.join(ROOT, 'dynamic-headlines.json');
const statePath = path.join(ROOT, 'crawler-state.json');
const metricsPath = path.join(ROOT, 'crawler-metrics.json');

const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
const keywords = cfg.keywords || [];
const maxItems = Number(cfg.maxItems || 24);
const keywordWeights = cfg.keywordWeights || {};
const sourceWeights = cfg.sourceWeights || {
  reuters: 1.35,
  associatedpress: 1.3,
  ap: 1.3,
  bloomberg: 1.25,
  ft: 1.2,
  cnbc: 1.1,
  bbc: 1.1
};

const query = encodeURIComponent(keywords.join(' OR '));
const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

function decodeXml(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[|\]\]>/g, '');
}

function extract(tag, s) {
  const m = s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? decodeXml(m[1].trim()) : '';
}

function extractSource(s) {
  const m = s.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
  return m ? decodeXml(m[1].trim()) : '';
}

function normalizeUrl(raw = '') {
  try {
    const u = new URL(raw);
    // Remove common tracker params.
    ['oc', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach((k) => {
      u.searchParams.delete(k);
    });
    return u.toString();
  } catch {
    return raw;
  }
}

function parseItems(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  return blocks.map((b) => {
    const title = extract('title', b).replace(/\s*-\s*[^-]+$/, '').trim();
    const link = normalizeUrl(extract('link', b));
    const pubDate = extract('pubDate', b);
    const source = extractSource(b);
    return { title, link, pubDate, source };
  });
}

function escapeRegex(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreRecency(pubDate) {
  const t = new Date(pubDate).getTime();
  if (!Number.isFinite(t)) return 0;
  const ageHours = (Date.now() - t) / (1000 * 60 * 60);
  if (ageHours <= 6) return 1;
  if (ageHours <= 24) return 0.7;
  if (ageHours <= 72) return 0.35;
  return 0.15;
}

function sourceBoost(source = '') {
  const s = source.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(sourceWeights)) {
    if (s.includes(k.toLowerCase().replace(/[^a-z]/g, ''))) return Number(v) || 1;
  }
  return 1;
}

function hashItem(x) {
  return crypto.createHash('sha1').update(`${x.title}|${x.link}`).digest('hex');
}

async function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const startedAt = Date.now();
const previousState = await readJsonSafe(statePath, { seenHashes: [], lastTraction: {} });
const seenSet = new Set(previousState.seenHashes || []);

const res = await fetch(rssUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8'
  }
});
if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
const xml = await res.text();

let totalParsed = 0;
let dedupDropped = 0;
let staleDropped = 0;

const linkSeen = new Set();
const parsed = parseItems(xml);
totalParsed = parsed.length;

const processed = parsed
  .filter((x) => x.title && x.link)
  .filter((x) => {
    const key = x.link.toLowerCase();
    if (linkSeen.has(key)) {
      dedupDropped += 1;
      return false;
    }
    linkSeen.add(key);
    return true;
  })
  .map((x) => {
    const titleLower = x.title.toLowerCase();
    let keywordScore = 0;
    for (const kw of keywords) {
      const r = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`, 'i');
      if (r.test(titleLower)) keywordScore += Number(keywordWeights[kw] || 1);
    }
    const recency = scoreRecency(x.pubDate);
    const srcBoost = sourceBoost(x.source);
    const score = Number(((keywordScore * 0.5 + recency * 0.5) * srcBoost).toFixed(4));
    const hash = hashItem(x);
    return { ...x, score, recency, srcBoost, hash };
  })
  .filter((x) => {
    if (seenSet.has(x.hash)) {
      staleDropped += 1;
      return false;
    }
    return true;
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, maxItems)
  .map((x, i) => ({
    id: i + 1,
    title: x.title,
    link: x.link,
    pubDate: x.pubDate,
    source: x.source,
    score: x.score,
    fetchedAt: new Date().toISOString(),
    hash: x.hash
  }));

const scores = new Map();
for (const kw of keywords) {
  scores.set(kw, { keyword: kw, mentions: 0, recency: 0, sources: new Set() });
}

for (const item of processed) {
  const hay = `${item.title} ${item.source}`.toLowerCase();
  for (const kw of keywords) {
    const pattern = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`, 'i');
    if (!pattern.test(hay)) continue;
    const row = scores.get(kw);
    row.mentions += 1;
    row.recency += scoreRecency(item.pubDate);
    if (item.source) row.sources.add(item.source);
  }
}

const prevTraction = previousState.lastTraction || {};
const trendingSubjects = Array.from(scores.values())
  .map((x) => {
    const sourceDiversity = x.sources.size;
    const tractionScore = Number((x.mentions * 0.5 + sourceDiversity * 0.3 + x.recency * 0.2).toFixed(3));
    const prev = Number(prevTraction[x.keyword] || 0);
    const delta = Number((tractionScore - prev).toFixed(3));
    return {
      keyword: x.keyword,
      mentions: x.mentions,
      sourceDiversity,
      tractionScore,
      delta,
      trend: delta > 0.15 ? 'up' : delta < -0.15 ? 'down' : 'flat'
    };
  })
  .filter((x) => x.mentions > 0)
  .sort((a, b) => b.tractionScore - a.tractionScore)
  .slice(0, 8);

const payload = {
  generatedAt: new Date().toISOString(),
  keywords,
  count: processed.length,
  items: processed,
  trendingSubjects
};

const newHashes = processed.map((x) => x.hash);
const nextSeen = Array.from(new Set([...(previousState.seenHashes || []), ...newHashes])).slice(-3000);
const nextTraction = Object.fromEntries(trendingSubjects.map((x) => [x.keyword, x.tractionScore]));

await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
await fs.writeFile(statePath, JSON.stringify({ seenHashes: nextSeen, lastTraction: nextTraction, updatedAt: new Date().toISOString() }, null, 2), 'utf8');

const durationMs = Date.now() - startedAt;
const metrics = {
  generatedAt: new Date().toISOString(),
  durationMs,
  totalParsed,
  emitted: processed.length,
  dedupDropped,
  staleDropped,
  freshnessRatio: totalParsed ? Number((processed.length / totalParsed).toFixed(3)) : 0,
  suggestedNextCrawlMinutes: processed.length >= Math.ceil(maxItems * 0.75) ? 20 : processed.length >= Math.ceil(maxItems * 0.4) ? 30 : 60
};
await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');

console.log(`Wrote ${processed.length} items to ${outPath}`);
console.log(`Metrics: ${JSON.stringify(metrics)}`);
