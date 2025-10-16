import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read SITE_URL from env or site.config fallback
let SITE_URL = process.env.SITE_URL || 'https://madorayoub.github.io/DSN';
try {
  const cfg = await import(path.join(__dirname, '../site.config.ts')).catch(() => null);
  if (cfg && cfg.SITE_URL) SITE_URL = cfg.SITE_URL;
} catch (_) {}

const DOCS_DIR = path.join(__dirname, '..', 'docs');

const IGNORE = new Set([
  '404.html',
  'sitemap.xml',
  'sitemap-index.xml',
  'robots.txt',
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    const rel = path.relative(DOCS_DIR, p);
    if (entry.isDirectory()) {
      out.push(...walk(p));
    } else if (
      entry.isFile() &&
      path.extname(entry.name) === '.html' &&
      !IGNORE.has(entry.name)
    ) {
      out.push(rel);
    }
  }
  return out;
}

function toUrl(relHtmlPath) {
  // docs/index.html -> /
  if (relHtmlPath === 'index.html') return SITE_URL + '/';

  // foo/index.html -> /foo/
  if (relHtmlPath.endsWith('/index.html')) {
    const clean = relHtmlPath.slice(0, -('/index.html'.length));
    return `${SITE_URL}/${clean}/`;
  }

  // foo.html -> /foo.html (flat file)
  return `${SITE_URL}/${relHtmlPath}`.replace(/\\/g, '/');
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
}

const pages = walk(DOCS_DIR)
  .map(p => ({
    loc: toUrl(p),
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: p === 'index.html' ? 1.0 : 0.7,
  }))
  // Stable sort: keep index first, then alphabetically for diff readability
  .sort((a, b) => a.loc.localeCompare(b.loc));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${xmlEscape(p.loc)}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), sitemap, 'utf8');

// robots.txt with canonical Sitemap reference
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(DOCS_DIR, 'robots.txt'), robots, 'utf8');

console.log(`Generated docs/sitemap.xml with ${pages.length} URLs`);
