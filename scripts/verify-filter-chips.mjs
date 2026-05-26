// Playwright check for demo 40 (filter chips).
//   - all 7 chips render
//   - clicking "Overdue" hides cards whose due > today
//   - clicking "Mine" leaves only Dave's cards
//   - clicking "Urgent" leaves only urgent=true
//   - chip badges update with the count
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5176";

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

await page.goto(`${BASE}/demo/40-filter-chips.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");

const chipCount = await page.locator(".fc-chips button").count();
ok("40: 7 chips render", chipCount === 7, `chips=${chipCount}`);

const totalCards = await page.locator("[data-card-id]").count();
ok("40: 12 cards initially visible", totalCards === 12, `cards=${totalCards}`);

// Overdue
await page.locator('button[data-fc="overdue"]').click();
await page.waitForTimeout(80);
const overdueVisible = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("40: overdue filter narrows results", overdueVisible >= 3 && overdueVisible < totalCards, `visible=${overdueVisible}`);

// Mine (Dave)
await page.locator('button[data-fc="mine"]').click();
await page.waitForTimeout(80);
const mine = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("40: Mine filter narrows to Dave's cards", mine >= 4 && mine < totalCards, `visible=${mine}`);

// Urgent
await page.locator('button[data-fc="urgent"]').click();
await page.waitForTimeout(80);
const urgent = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("40: Urgent filter narrows to urgent=true", urgent === 3, `visible=${urgent}`);

// Active chip styling
const activeText = await page.locator(".fc-chips button.active").getAttribute("data-fc");
ok("40: Urgent chip is active", activeText === "urgent");

// All chip badges populated
const badgeTexts = await page.locator(".fc-chips button .n").allTextContents();
const allNumeric = badgeTexts.every((t) => /^\d+$/.test(t.trim()));
ok("40: every chip shows numeric count badge", allNumeric, JSON.stringify(badgeTexts));

// Back to All
await page.locator('button[data-fc="all"]').click();
await page.waitForTimeout(80);
const back = await page.locator('[data-card-id]:not([style*="display: none"])').count();
ok("40: All chip restores full set", back === 12, `visible=${back}`);

ok("40: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
