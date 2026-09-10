/**
 * Static-site audit for the built output in dist/.
 *
 * Checks (no external dependencies):
 *  - expected pages exist; titles unique; meta description/canonical/OG/Twitter present
 *  - exactly one H1 per page; html lang="en"; no accidental noindex
 *  - JSON-LD blocks parse; images have alt + dimensions; iframes have titles
 *  - internal links + in-page fragments resolve; no localhost links
 *  - robots.txt + sitemap.xml present and consistent
 *  - word-count report per page
 *
 * Exit code 1 on errors, 0 when only warnings (or clean).
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const BASE = '/strip-tokens/';
const SITE = 'https://mojekinokros.github.io/strip-tokens/';

const errors = [];
const warnings = [];
const info = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function allHtml(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) allHtml(p, acc);
    else if (entry.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return p.slice(dist.length + 1);
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

if (!existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const pages = allHtml(dist);
info.push(`HTML pages found: ${pages.length}`);

const expected = [
  'index.html',
  'legal-ways-to-get-stripchat-tokens/index.html',
  'stripchat-token-scams-and-safety/index.html',
  'stripchat-tokens-payment-faq/index.html',
  'privacy-policy/index.html',
  'terms/index.html',
  'disclaimer/index.html',
  '404.html',
];
for (const e of expected) {
  if (!existsSync(join(dist, e))) err(`Missing expected page: ${e}`);
}

const titles = new Map();
const fileCache = new Map();
const read = (p) => {
  if (!fileCache.has(p)) fileCache.set(p, readFileSync(p, 'utf8'));
  return fileCache.get(p);
};

for (const file of pages) {
  const name = rel(file);
  const html = read(file);
  const is404 = name === '404.html';

  // lang
  if (!/<html[^>]*\blang="en"/i.test(html)) err(`${name}: <html lang="en"> missing`);

  // title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : '';
  if (!pageTitle) err(`${name}: <title> missing or empty`);
  else {
    if (titles.has(pageTitle)) err(`${name}: duplicate title "${pageTitle}" (also in ${titles.get(pageTitle)})`);
    else titles.set(pageTitle, name);
    if (pageTitle.length > 75) warn(`${name}: title is ${pageTitle.length} chars (over ~60-70 ideal)`);
  }

  // meta description
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);
  const desc = descMatch ? descMatch[1] : '';
  if (!desc) err(`${name}: meta description missing`);
  else if (desc.length < 50 || desc.length > 200) warn(`${name}: meta description is ${desc.length} chars (ideal 50-200)`);

  // canonical
  const canonMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i);
  const canon = canonMatch ? canonMatch[1] : '';
  if (!canon) err(`${name}: canonical link missing`);
  else if (!canon.startsWith(SITE)) err(`${name}: canonical does not use production URL: ${canon}`);

  // robots
  const robotsMatch = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/i);
  const robots = robotsMatch ? robotsMatch[1] : '';
  if (!robotsMatch) err(`${name}: robots meta missing`);
  else if (/noindex/i.test(robots) && !is404) err(`${name}: accidental noindex detected`);
  else if (!/noindex/i.test(robots) && is404) warn(`${name}: 404 page is indexable (deliberate? noindex recommended)`);

  // Open Graph + Twitter
  for (const prop of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) {
    if (!new RegExp(`<meta[^>]*property="${prop}"`, 'i').test(html)) err(`${name}: ${prop} meta missing`);
  }
  const ogImg = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
  if (ogImg && !ogImg[1].startsWith('https://')) err(`${name}: og:image is not absolute HTTPS: ${ogImg[1]}`);
  if (!/<meta[^>]*name="twitter:card"[^>]*content="summary_large_image"/i.test(html)) {
    err(`${name}: twitter summary_large_image card missing`);
  }

  // H1 count
  const h1s = html.match(/<h1[\s>]/gi) || [];
  if (h1s.length !== 1) err(`${name}: expected exactly 1 <h1>, found ${h1s.length}`);

  // heading order: first heading should be h1
  const firstHeading = html.match(/<h[1-6][\s>]/i);
  if (firstHeading && !/^<h1/i.test(firstHeading[0])) warn(`${name}: first heading is not h1`);

  // JSON-LD parses
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const [i, b] of ldBlocks.entries()) {
    try {
      JSON.parse(b[1]);
    } catch {
      err(`${name}: JSON-LD block ${i} does not parse as JSON`);
    }
  }

  // images: alt + dimensions
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (const img of imgs) {
    const tag = img[0];
    const alt = tag.match(/\balt="([^"]*)"/i);
    if (!alt || !alt[1].trim()) err(`${name}: <img> without meaningful alt text: ${tag.slice(0, 90)}…`);
    else if (/stripchat tokens/i.test(alt[1]) && alt[1].split(/\s+/).length < 4) {
      warn(`${name}: thin/keywordish alt text: "${alt[1]}"`);
    }
    if (!/\bwidth="\d+"/i.test(tag) || !/\bheight="\d+"/i.test(tag)) {
      warn(`${name}: <img> missing width/height attributes: ${tag.slice(0, 90)}…`);
    }
  }

  // iframes: title + no autoplay
  const iframes = [...html.matchAll(/<iframe\b[^>]*>/gi)];
  for (const f of iframes) {
    const tag = f[0];
    if (!/\btitle="[^"]+"/i.test(tag)) err(`${name}: <iframe> without accessible title`);
    if (/autoplay=1/i.test(tag)) err(`${name}: <iframe> autoplays with sound`);
  }

  // links
  const hrefs = [...html.matchAll(/(?:href|src)="([^"]*)"/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!href || href.startsWith('data:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/localhost|127\.0\.0\.1/i.test(href)) {
      err(`${name}: localhost link must never ship: ${href}`);
      continue;
    }
    if (/^(https?:)?\/\//i.test(href)) {
      if (href.startsWith('http://')) warn(`${name}: insecure http link: ${href}`);
      continue; // external: not validated for reachability in this offline audit
    }
    const [pathPart, fragment] = href.split('#');
    let targetFile = null;
    if (pathPart === '' || pathPart === undefined) {
      targetFile = file; // same-page fragment
    } else if (pathPart.startsWith(BASE)) {
      const sub = pathPart.slice(BASE.length);
      if (sub === '' || sub.endsWith('/')) targetFile = join(dist, sub, 'index.html');
      else {
        const direct = join(dist, sub);
        targetFile = existsSync(direct) && statSync(direct).isFile() ? direct : join(dist, sub, 'index.html');
      }
    } else if (pathPart.startsWith('/')) {
      err(`${name}: link ignores site base path: ${href}`);
      continue;
    } else {
      targetFile = join(dirname(file), pathPart);
    }
    if (!existsSync(targetFile)) {
      err(`${name}: broken internal link → ${href}`);
      continue;
    }
    if (fragment) {
      const targetHtml = read(targetFile);
      if (!new RegExp(`\\bid="${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(targetHtml)) {
        err(`${name}: fragment #${fragment} not found in ${rel(targetFile)}`);
      }
    }
  }

  // word count of main content
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  const words = mainMatch ? stripTags(mainMatch[0]).split(/\s+/).filter(Boolean).length : 0;
  info.push(`${name}: ~${words} words in <main>`);
  if (!is404 && !/privacy-policy|terms|disclaimer/.test(name)) {
    if (name === 'index.html' && words < 1800) warn(`${name}: homepage below ~2000-word target (${words})`);
    if (name !== 'index.html' && words < 2500) warn(`${name}: article below ~3000-word target (${words})`);
  }

  // banned placeholders
  if (/lorem ipsum|TODO|FIXME|CHANGEME/i.test(stripTags(html))) {
    err(`${name}: placeholder text (lorem/TODO) found`);
  }
  if (/free unlimited tokens|guaranteed earnings|100% safe profits|guaranteed top 3/i.test(html)) {
    err(`${name}: banned guarantee phrase found`);
  }
}

// robots.txt
const robotsPath = join(dist, 'robots.txt');
if (!existsSync(robotsPath)) err('robots.txt missing from dist/');
else {
  const robotsTxt = readFileSync(robotsPath, 'utf8');
  if (!robotsTxt.includes(`Sitemap: ${SITE}sitemap.xml`)) err('robots.txt does not reference the sitemap URL');
  if (/^Disallow:\s*\/\s*$/im.test(robotsTxt)) err('robots.txt blocks all crawling');
  info.push('robots.txt: present, allows crawling, references sitemap');
}

// sitemap.xml
const sitemapPath = join(dist, 'sitemap.xml');
if (!existsSync(sitemapPath)) err('sitemap.xml missing from dist/');
else {
  const sm = readFileSync(sitemapPath, 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  info.push(`sitemap.xml: ${locs.length} URLs`);
  for (const u of ['legal-ways-to-get-stripchat-tokens/', 'stripchat-token-scams-and-safety/', 'stripchat-tokens-payment-faq/']) {
    if (!locs.includes(SITE + u)) err(`sitemap.xml missing ${SITE + u}`);
  }
  for (const u of locs) {
    if (u.includes('?') || /draft|admin|test/i.test(u)) err(`sitemap.xml contains non-public URL: ${u}`);
  }
}

// key assets
for (const a of ['favicon.svg', 'images/og-cover.png', 'images/hero-secure-tokens.svg', '.nojekyll']) {
  if (!existsSync(join(dist, a))) err(`Missing asset in dist/: ${a}`);
}
const ogPng = join(dist, 'images/og-cover.png');
if (existsSync(ogPng)) {
  const kb = Math.round(statSync(ogPng).size / 1024);
  info.push(`og-cover.png: ${kb} KB`);
  if (kb > 1000) warn(`og-cover.png is large (${kb} KB)`);
}

console.log('\n── Audit info ─────────────────────────────');
for (const m of info) console.log(`  • ${m}`);
if (warnings.length) {
  console.log('\n── Warnings ─────────────────────────────────');
  for (const m of warnings) console.log(`  ⚠ ${m}`);
}
if (errors.length) {
  console.log('\n── Errors ───────────────────────────────────');
  for (const m of errors) console.log(`  ✖ ${m}`);
  console.log(`\nAudit FAILED: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`\nAudit PASSED with ${warnings.length} warning(s).`);
