// Playwright check for demo 42 (tag pills + click-to-filter).
import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:5180";
function ok(name, cond, detail) {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) process.exitCode = 1;
}
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

await page.goto(`${BASE}/demo/42-tag-pills-filter.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

const tagCount = await page.locator("[data-tag]").count();
ok("42: tag pills render on cards", tagCount >= 10, `tags=${tagCount}`);

const initialBar = await page.locator("#filter-bar").textContent();
ok("42: filter bar starts with 'Showing all cards.'", /Showing all/.test(initialBar || ""));

// Click an "urgent" tag → filter to urgent cards (1, 4, 9)
await page.locator('[data-tag="urgent"]').first().click();
await page.waitForTimeout(80);
const visible = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("42: filtering by 'urgent' narrows to 3 cards", visible === 3, `visible=${visible}`);

const barNow = await page.locator("#filter-bar").textContent();
ok("42: filter bar shows active tag", /urgent/.test(barNow || ""));

// Click clear
await page.locator("#tg-clear").click();
await page.waitForTimeout(80);
const cleared = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("42: clear restores full set", cleared === 10, `visible=${cleared}`);

// Click 'commercial' → 4 cards
await page.locator('[data-tag="commercial"]').first().click();
await page.waitForTimeout(80);
const commVisible = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("42: filtering by 'commercial' narrows to 4 cards", commVisible === 4, `visible=${commVisible}`);

// Click same tag again to toggle off
await page.locator('[data-tag="commercial"]').first().click();
await page.waitForTimeout(80);
const off = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("42: clicking the same tag again clears the filter", off === 10, `visible=${off}`);

ok("42: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
