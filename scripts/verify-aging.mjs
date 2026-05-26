// Playwright check for demo 41 (time-in-column aging).
//   - cards 2, 4, 6 should be marked stuck given the fixed NOW
//   - card 7 (won, no threshold) is never stuck
//   - moving a stuck card to a column resets its age (no longer stuck)
//   - board:cardStuck fires for the initial stuck set
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

await page.goto(`${BASE}/demo/41-time-in-column-aging.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

// Cards 2, 4, 6 should be stuck; 1, 3, 5, 7 should not
const stuckIds = await page.$$eval('[data-card-id][data-card-stuck="true"]', (els) =>
  els.map((el) => el.getAttribute("data-card-id")).sort());
ok("41: stuck cards are exactly 2, 4, 6", JSON.stringify(stuckIds) === JSON.stringify(["2","4","6"]),
   `stuck=${JSON.stringify(stuckIds)}`);

// Age days attribute set on stuck cards
const age2 = await page.locator('[data-card-id="2"]').getAttribute("data-card-age-days");
ok("41: card 2 has age=5", age2 === "5", `age=${age2}`);
const age6 = await page.locator('[data-card-id="6"]').getAttribute("data-card-age-days");
ok("41: card 6 has age=11", age6 === "11", `age=${age6}`);

// boardApi.getStuckCardIds returns same set
const apiStuck = await page.evaluate(() => document.getElementById('board').boardApi.getStuckCardIds().sort());
ok("41: boardApi.getStuckCardIds matches DOM", JSON.stringify(apiStuck) === JSON.stringify(["2","4","6"]),
   `api=${JSON.stringify(apiStuck)}`);

// Move stuck card 2 → won (no threshold). Should no longer be marked stuck.
await page.evaluate(() => document.getElementById('board').boardApi.moveCard("2", { toColumnId: "won", toIndex: 0 }));
await page.waitForTimeout(80);
const stuck2After = await page.locator('[data-card-id="2"]').getAttribute("data-card-stuck");
ok("41: card 2 is no longer stuck after move", stuck2After === "false", `stuck=${stuck2After}`);

// Move stuck card 6 → enquiry → still stuck? enquiry threshold=2 but the card just entered, so age=0 → not stuck
await page.evaluate(() => document.getElementById('board').boardApi.moveCard("6", { toColumnId: "enquiry", toIndex: 0 }));
await page.waitForTimeout(80);
const stuck6After = await page.locator('[data-card-id="6"]').getAttribute("data-card-stuck");
ok("41: card 6 not stuck after fresh entry to a threshold column", stuck6After === "false", `stuck=${stuck6After}`);

// Aging API: getCardAgeInColumn at fixed NOW returns 0 for the just-moved card
const age6Fresh = await page.evaluate(() =>
  document.getElementById('board').boardApi.getCardAgeInColumn("6"));
ok("41: getCardAgeInColumn returns 0 for fresh entry", age6Fresh === 0, `age=${age6Fresh}`);

ok("41: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
