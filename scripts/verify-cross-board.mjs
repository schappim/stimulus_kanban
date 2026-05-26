// Playwright check for demo 47 (cross-board automation).
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

await page.goto(`${BASE}/demo/47-cross-board-automation.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#quotes [data-card-id]");
await page.waitForSelector("#jobs [data-card-id]");
await page.waitForTimeout(150);

const initialJobs = await page.locator("#jobs [data-card-id]").count();
ok("47: jobs board starts with 2 jobs", initialJobs === 2, `count=${initialJobs}`);

// Move quote Q-2403 to Won → spawns J-1101 on jobs scheduled
await page.evaluate(() => document.getElementById('quotes').boardApi.moveCard('Q-2403', { toColumnId: 'won', toIndex: 0 }));
await page.waitForTimeout(150);

const afterJobs = await page.locator("#jobs [data-card-id]").count();
ok("47: jobs board grew by one after won move", afterJobs === 3, `count=${afterJobs}`);

const spawned = await page.locator('#jobs [data-board-column-id-value="scheduled"] [data-card-id="J-1101"]').count();
ok("47: spawned job lands in Scheduled with id J-1101", spawned === 1);

// Check the spawned card's title matches the source quote
const spawnedTitle = await page.locator('[data-card-id="J-1101"] .sk-card-title').textContent();
ok("47: spawned job inherits the quote title", /Whole-house rewire/.test(spawnedTitle || ""), `title=${spawnedTitle}`);

// Source quote retains the back-reference (via applyTransaction add)
const spawnedRecord = await page.evaluate(() => document.getElementById('jobs').boardApi.getCardData().find((c) => c.id === 'J-1101'));
ok("47: spawned job carries source_quote_id back-reference", spawnedRecord?.source_quote_id === 'Q-2403',
   `record=${JSON.stringify(spawnedRecord)}`);

// Moving the same quote to Lost should NOT spawn another job
await page.evaluate(() => document.getElementById('quotes').boardApi.moveCard('Q-2404', { toColumnId: 'lost', toIndex: 0 }));
await page.waitForTimeout(80);
const stillThree = await page.locator("#jobs [data-card-id]").count();
ok("47: moving a quote to Lost does not spawn a job", stillThree === 3, `count=${stillThree}`);

// Moving a second quote to Won DOES spawn a second
await page.evaluate(() => document.getElementById('quotes').boardApi.moveCard('Q-2405', { toColumnId: 'won', toIndex: 0 }));
await page.waitForTimeout(80);
const four = await page.locator("#jobs [data-card-id]").count();
ok("47: a second Won move spawns another job", four === 4, `count=${four}`);

ok("47: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
