// Playwright check for demo 37 (rich job-detail panel).
//   - cards render with job number, title, customer, type pill
//   - clicking a card opens the rail and populates contact, photos, materials, timeline
//   - "Mark complete" action moves the card to the Completed column
//   - "Convert to invoice" moves the card to the Invoiced column
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5173";

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

await page.goto(`${BASE}/demo/37-rich-job-detail.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");

const cardCount = await page.locator("[data-card-id]").count();
ok("37: cards render", cardCount >= 4, `cardCount=${cardCount}`);

const jobNoText = await page.locator('[data-card-id="1"] .jobno').textContent();
ok("37: card shows job number", (jobNoText || "").trim() === "JOB-1042", `text=${JSON.stringify(jobNoText)}`);

const customerText = await page.locator('[data-card-id="1"] .cust').textContent();
ok("37: card shows customer name", (customerText || "").includes("Patel"), `text=${JSON.stringify(customerText)}`);

await page.locator('[data-card-id="1"]').click();
await page.waitForSelector(".jd-detail");
const ridName = await page.locator(".jd-detail .name").first().textContent();
ok("37: detail opens with customer name", (ridName || "").includes("Patel"), `name=${JSON.stringify(ridName)}`);

const callHref = await page.locator('.jd-contact a').first().getAttribute("href");
ok("37: tap-to-call href is tel:", /^tel:/.test(callHref || ""), `href=${callHref}`);

const photoCount = await page.locator('.jd-photos .photo').count();
ok("37: photo carousel has 4 slots", photoCount === 4, `count=${photoCount}`);

const matRowCount = await page.locator('.jd-mats tbody tr').count();
ok("37: materials table has rows", matRowCount >= 2, `rows=${matRowCount}`);

const totalText = await page.locator('[data-jd-mat-total]').textContent();
ok("37: materials total renders AUD", /[$AUD]/.test(totalText || ""), `total=${totalText}`);

const tlCount = await page.locator('.jd-timeline li').count();
ok("37: timeline has events", tlCount >= 2, `events=${tlCount}`);

// Click "Mark complete" → card should move to completed column
await page.locator('[data-jd-action="mark-complete"]').click();
await page.waitForTimeout(120);
const completedCol = await page.locator('[data-board-column-id-value="completed"] [data-card-id="1"]').count();
ok("37: Mark complete moves card to Completed", completedCol === 1);

// Open card 2 then convert-to-invoice
await page.locator('[data-card-id="2"]').click();
await page.waitForSelector(".jd-detail");
await page.locator('[data-jd-action="convert-invoice"]').click();
await page.waitForTimeout(120);
const invoicedCol = await page.locator('[data-board-column-id-value="invoiced"] [data-card-id="2"]').count();
ok("37: Convert to invoice moves card to Invoiced", invoicedCol === 1);

ok("37: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
