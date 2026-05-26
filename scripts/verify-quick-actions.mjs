// Playwright check for demo 46 (card hover quick actions).
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

await page.goto(`${BASE}/demo/46-card-hover-quick-actions.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

// Every card has 3 quick action links
const actionLinkCount = await page.locator(".qa-actions a").count();
ok("46: 3 quick-action links per card (6 cards = 18 total)", actionLinkCount === 18, `count=${actionLinkCount}`);

// Actions hidden by default
const initialOpacity = await page.locator('[data-card-id="1"] .qa-actions').evaluate((el) => getComputedStyle(el).opacity);
ok("46: actions hidden by default (opacity 0)", initialOpacity === "0", `opacity=${initialOpacity}`);

// Hover reveals the actions
await page.locator('[data-card-id="1"]').hover();
await page.waitForTimeout(150);
const hoverOpacity = await page.locator('[data-card-id="1"] .qa-actions').evaluate((el) => getComputedStyle(el).opacity);
ok("46: actions revealed on hover (opacity 1)", hoverOpacity === "1", `opacity=${hoverOpacity}`);

// tel: link is correctly built
const telHref = await page.locator('[data-card-id="1"] .qa-actions a[aria-label="Call"]').getAttribute("href");
ok("46: Call link is a tel: href", /^tel:0412555901$/.test(telHref || ""), `href=${telHref}`);

// sms: link
const smsHref = await page.locator('[data-card-id="1"] .qa-actions a[aria-label="SMS"]').getAttribute("href");
ok("46: SMS link is a sms: href", /^sms:0412555901$/.test(smsHref || ""), `href=${smsHref}`);

// Map link is Google Maps
const mapHref = await page.locator('[data-card-id="1"] .qa-actions a[aria-label="Navigate"]').getAttribute("href");
ok("46: Navigate link is a maps URL", /google\.com\/maps/.test(mapHref || ""), `href=${mapHref}`);

// Map opens in a new tab
const mapTarget = await page.locator('[data-card-id="1"] .qa-actions a[aria-label="Navigate"]').getAttribute("target");
ok("46: Navigate link has target=_blank", mapTarget === "_blank");

ok("46: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
