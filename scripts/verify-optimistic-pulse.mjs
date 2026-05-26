// Playwright check for demo 50 (optimistic in-flight pulse).
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

await page.goto(`${BASE}/demo/50-optimistic-pulse.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

// Click Save on card 1 → data-card-pending=true
await page.locator('[data-card-id="1"] button[data-act="save"]').click();
await page.waitForTimeout(60);
const pending = await page.locator('[data-card-id="1"]').getAttribute('data-card-pending');
ok("50: Save sets data-card-pending=true", pending === 'true');

// API reflects pending state
const isPending = await page.evaluate(() => document.getElementById('board').boardApi.isCardPending('1'));
ok("50: isCardPending API returns true", isPending === true);

// After 1500ms it auto-clears
await page.waitForTimeout(1600);
const afterClear = await page.locator('[data-card-id="1"]').getAttribute('data-card-pending');
ok("50: pending clears after save completes", afterClear === null);

// Save-fail flow: pending then error
await page.locator('[data-card-id="2"] button[data-act="save-fail"]').click();
await page.waitForTimeout(60);
const failPending = await page.locator('[data-card-id="2"]').getAttribute('data-card-pending');
ok("50: Save-fail starts as pending", failPending === 'true');
await page.waitForTimeout(900);
const failErr = await page.locator('[data-card-id="2"]').getAttribute('data-card-error');
ok("50: after timeout, data-card-error=true", failErr === 'true');
const errMsg = await page.locator('[data-card-id="2"]').getAttribute('data-card-error-msg');
ok("50: error message persisted as data-card-error-msg", /422/.test(errMsg || ""), `msg=${errMsg}`);

// Clear button removes both
await page.locator('[data-card-id="2"] button[data-act="clear"]').click();
await page.waitForTimeout(60);
const cleared = await page.locator('[data-card-id="2"]').getAttribute('data-card-error');
ok("50: Clear button removes error marker", cleared === null);

ok("50: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
