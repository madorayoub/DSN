// Local harness for eyeballing the commercial funnel's booking overlay.
// Serves docs/ statically and wires /.netlify/functions/booking to the real
// handler, so the date strip is driven by live GHL availability rather than a
// stub. Read-only in practice: only the GET (slots) path gets exercised by
// loading the page — booking still requires submitting the form.
//
//   GHL_PRIVATE_TOKEN=... node scripts/dev-funnel-server.js [port]
//
// Not used in production. Netlify serves docs/ and the function itself.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2]) || 8788;
const ROOT = path.join(__dirname, '..', 'docs');
const { handler } = require('../netlify/functions/booking.js');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/.netlify/functions/booking') {
    const out = await handler({
      httpMethod: req.method,
      headers: { origin: 'https://directsales.network' },
      queryStringParameters: Object.fromEntries(url.searchParams),
      body: null,
    });
    res.writeHead(out.statusCode, { 'Content-Type': 'application/json' });
    return res.end(out.body);
  }

  // Mirror netlify.toml's clean-URL rule: /foo -> /foo.html
  let file = path.join(ROOT, url.pathname);
  if (!path.extname(file)) file += '.html';
  if (url.pathname.endsWith('/')) file = path.join(ROOT, url.pathname, 'index.html');

  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`funnel dev server on http://localhost:${PORT}`));
