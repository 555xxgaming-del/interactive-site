import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const cfgPath = path.join(ROOT, 'crawler-keywords.json');
const outPath = path.join(ROOT, 'dynamic-headlines.json');

const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
const keywords = cfg.keywords || [];
const maxItems = Number(cfg.maxItems || 24);

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

function parseItems(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  return blocks.map((b) => {
    const title = extract('title', b).replace(/\s*-\s*[^-]+$/, '');
    const link = extract('link', b);
    const pubDate = extract('pubDate', b);
    const source = extract('source', b);
    return { title, link, pubDate, source };
  });
}

const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
const xml = await res.text();

const seen = new Set();
const ranked = parseItems(xml)
  .filter((x) => x.title && x.link)
  .filter((x) => {
    const key = x.link.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, maxItems)
  .map((x, i) => ({
    id: i + 1,
    ...x,
    fetchedAt: new Date().toISOString()
  }));

const payload = {
  generatedAt: new Date().toISOString(),
  keywords,
  count: ranked.length,
  items: ranked
};

await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`Wrote ${ranked.length} items to ${outPath}`);
