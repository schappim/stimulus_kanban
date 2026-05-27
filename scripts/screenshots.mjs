import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const BASE = process.env.SK_BASE || 'http://localhost:5180';
const OUT = resolve(process.cwd(), 'docs/screenshots');
mkdirSync(OUT, { recursive: true });

const shots = [
  { file: '01-basic.html',                   name: 'basic',          w: 1280, h: 640 },
  { file: '05-wip-limits.html',              name: 'wip-limits',     w: 1280, h: 640 },
  { file: '06-swimlanes-assignee.html',      name: 'swimlanes',      w: 1280, h: 760 },
  { file: '20-incident-board-renderer.html', name: 'incident',       w: 1280, h: 680 },
  { file: '21-pr-review-board.html',         name: 'pr-review',      w: 1280, h: 680 },
  { file: '22-support-inbox-board.html',     name: 'support-inbox',  w: 1280, h: 680 },
  { file: '23-leads-pipeline-currency.html', name: 'leads-pipeline', w: 1280, h: 680 },
  { file: '24-image-cards-clickToZoom.html', name: 'image-cards',    w: 1280, h: 680 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const url = `${BASE}/demo/${s.file}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-controller~="board"] [data-board-target="column"]', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const board = page.locator('[data-controller~="board"]').first();
  const out = resolve(OUT, `${s.name}.png`);
  if (await board.count()) {
    const box = await board.boundingBox();
    const contentBottom = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll(
        '[data-controller~="card"], [data-board-target="column"] .add-card, [data-board-target="column"] header, [data-board-target="column"] .column-header'
      ));
      let max = 0;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom > max) max = r.bottom;
      }
      return max;
    });
    const pad = 16;
    const height = Math.min(box.height, Math.max(160, Math.ceil(contentBottom - box.y) + pad));
    await page.screenshot({
      path: out,
      clip: { x: box.x, y: box.y, width: box.width, height },
    });
  } else {
    await page.screenshot({ path: out, fullPage: false });
  }
  console.log('wrote', out);
  await ctx.close();
}
await browser.close();
