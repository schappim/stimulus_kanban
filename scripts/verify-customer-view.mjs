// Playwright check for demo 45 (customer-view swimlanes).
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

await page.goto(`${BASE}/demo/45-customer-view-swimlanes.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".sk-swimlane");
await page.waitForTimeout(150);

// One lane per unique customer (5 customers in the data)
const lanes = await page.locator(".sk-swimlane").count();
ok("45: 5 customer lanes render", lanes === 5, `lanes=${lanes}`);

const headerTexts = await page.locator(".sk-swimlane-header .sk-swimlane-label").allTextContents();
const sortedHeaders = [...headerTexts].map((s) => s.trim()).sort();
const expected = ["Bondi Pavilion","Cottesloe Strata","Newtown IGA","Patel residence","Williams residence"];
ok("45: lane labels match unique customers", JSON.stringify(sortedHeaders) === JSON.stringify(expected),
   `got=${JSON.stringify(sortedHeaders)}`);

// Patel lane has 4 cards
const patelCards = await page.locator('.sk-swimlane:has-text("Patel residence") [data-card-id]').count();
ok("45: Patel lane has 4 cards", patelCards === 4, `count=${patelCards}`);

// Switch to suburb grouping
await page.locator("#swim").selectOption("suburb");
await page.waitForTimeout(150);
const suburbLanes = await page.locator(".sk-swimlane").count();
ok("45: switching to suburb gives 5 lanes", suburbLanes === 5, `lanes=${suburbLanes}`);

// Switch to none → no swimlanes
await page.locator("#swim").selectOption("");
await page.waitForTimeout(150);
const noLanes = await page.locator(".sk-swimlane").count();
ok("45: switching to 'none' removes swimlanes", noLanes === 0, `lanes=${noLanes}`);

ok("45: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
