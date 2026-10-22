// Generates the template preview pictures in public/templates/: <key>.png (desktop home, 640×400) and
// <key>-phone.png (phone home, 260×520), each kept under 150 KB.
//
// Needs a running API + web app on a seeded THROWAWAY database (never the dev or live one), e.g.
//   backend:  NODE_ENV=test MONGODB_URI=mongodb://127.0.0.1:27017/colony_templates_preview_test node scripts/seed.js
//             NODE_ENV=test MONGODB_URI=...same... PORT=5398 ENABLE_JOBS=false node src/server.js
//   frontend: VITE_API_URL=http://localhost:5398/api/v1 npx vite --port 5397 --strictPort
//   then:     node scripts/gen-template-previews.mjs
// Env: APP_URL (default http://localhost:5397), API_URL (default http://localhost:5398/api/v1),
//      PLAYWRIGHT (module URL of a playwright install), CHROME (browser executable), ONLY (comma-separated keys).
// It switches the demo society through every template as admin@demo.test, photographs resident@demo.test's
// home screen, and puts Classic Blue back at the end.
import fs from 'node:fs';
import zlib from 'node:zlib';

const APP = process.env.APP_URL || 'http://localhost:5397';
const API = process.env.API_URL || 'http://localhost:5398/api/v1';
const PLAYWRIGHT = process.env.PLAYWRIGHT || 'file:///C:/free/gymManagementsystem/client/node_modules/playwright/index.mjs';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = new URL('../public/templates/', import.meta.url);
const MAX_BYTES = 150 * 1024;
const PASSWORD = 'Password@123';

const { chromium } = await import(PLAYWRIGHT);

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(json.error)}`);
  return json.data;
}
const login = (identifier) => call('POST', '/auth/login', null, { identifier, password: PASSWORD });

// ---------- small PNG re-encoder: 256-colour palette + zlib level 9 (no image library needed) ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function decodePng(buf) {
  let pos = 8;
  let width;
  let height;
  let colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit, non-interlaced screenshots are supported');
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!bpp) throw new Error(`Unsupported PNG colour type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = Buffer.alloc(width * height * 3);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    for (let x = 0; x < width; x += 1) line.copy(px, (y * width + x) * 3, x * bpp, x * bpp + 3);
    prev = line;
  }
  return { width, height, px };
}

// Popularity quantiser on a 5-5-5 grid: UI screenshots are mostly flat colours, so 256 entries are plenty.
function quantise({ width, height, px }) {
  const key = (i) => ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
  const counts = new Map();
  for (let i = 0; i < px.length; i += 3) counts.set(key(i), (counts.get(key(i)) || 0) + 1);
  const palette = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  const lookup = new Map();
  const nearest = (k, r, g, b) => {
    if (lookup.has(k)) return lookup.get(k);
    let best = 0;
    let bestD = Infinity;
    palette.forEach(([pr, pg, pb], idx) => {
      const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
      if (d < bestD) [best, bestD] = [idx, d];
    });
    lookup.set(k, best);
    return best;
  };
  const rows = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    rows[y * (width + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      rows[y * (width + 1) + 1 + x] = nearest(key(i), px[i], px[i + 1], px[i + 2]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3; // indexed colour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', Buffer.from(palette.flat())),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- capture ----------
const VIEWS = [
  { suffix: '', viewport: { width: 1280, height: 800 }, scale: 0.5 },
  { suffix: '-phone', viewport: { width: 390, height: 780 }, scale: 2 / 3, isMobile: true },
];

const admin = await login('admin@demo.test');
const resident = await login('resident@demo.test');
const options = await call('GET', '/appearance/options', admin.accessToken);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const keys = options.templates.map((t) => t.key).filter((k) => !only || only.includes(k));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const pages = [];
for (const view of VIEWS) {
  const context = await browser.newContext({ viewport: view.viewport, deviceScaleFactor: view.scale, isMobile: Boolean(view.isMobile), hasTouch: Boolean(view.isMobile), colorScheme: 'light' });
  const page = await context.newPage();
  // No ad pop-ups or banners in the pictures.
  await page.route('**/api/v1/ads/active**', (route) => route.fulfill({ json: { success: true, data: { banners: [], popup: null } } }));
  await page.goto(`${APP}/login`);
  // Each browser gets its own resident session (refresh tokens rotate, so they must not be shared).
  const session = view.suffix ? resident : await login('resident@demo.test');
  await page.evaluate((token) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cms.refreshToken', token);
    localStorage.setItem('cms.language', 'en');
  }, session.refreshToken);
  pages.push({ view, page });
}

fs.mkdirSync(OUT, { recursive: true });
try {
  for (const key of keys) {
    await call('PUT', '/appearance/template', admin.accessToken, { template: key });
    for (const { view, page } of pages) {
      await page.goto(`${APP}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { timeout: 20000 });
      await page.waitForFunction((k) => document.documentElement.dataset.template === k, key, { timeout: 20000 });
      await page.waitForTimeout(700);
      const shot = await page.screenshot({ type: 'png' });
      let png = quantise(decodePng(shot));
      if (png.length > MAX_BYTES) console.warn(`  ${key}${view.suffix}.png is ${Math.round(png.length / 1024)} KB (over 150 KB)`);
      if (png.length > shot.length) png = shot;
      fs.writeFileSync(new URL(`${key}${view.suffix}.png`, OUT), png);
      console.log(`${key}${view.suffix}.png  ${Math.round(png.length / 1024)} KB`);
    }
  }
} finally {
  await call('PUT', '/appearance/template', admin.accessToken, { template: 'classic-blue' }).catch(() => {});
  await browser.close();
}
