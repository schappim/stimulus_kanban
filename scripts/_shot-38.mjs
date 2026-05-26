import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:5180";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/demo/38-dispatcher-board.html`);
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/demo-38.png", fullPage: false });
// Also report overflow width for sanity
const widths = await page.evaluate(() => ['board-dave','board-sam','board-mia'].map((id) => {
  const s = document.getElementById(id)?.querySelector('.sk-columns');
  return s ? { id, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth, overflow: s.scrollWidth - s.clientWidth } : null;
}));
console.log(JSON.stringify(widths, null, 2));
await browser.close();
