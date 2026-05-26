// Playwright check for the 8 tradie-themed demos.
//   - every demo boots without a console error
//   - every demo renders at least one card with non-empty text
//   - the index links each demo
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
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });

const demos = [
  "28-plumbing-job-pipeline.html",
  "29-weekly-roster.html",
  "30-building-handover-veto.html",
  "31-snag-list-photos.html",
  "32-sparky-quote-pipeline.html",
  "33-fleet-maintenance.html",
  "34-tool-tracking.html",
  "35-apprentice-training.html",
];

for (const d of demos) {
  errors.length = 0;
  await page.goto(`${BASE}/demo/${d}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-card-id]", { timeout: 3000 }).catch(() => {});
  const cardCount = await page.locator("[data-card-id]").count();
  const firstCardText = (await page.locator("[data-card-id]").first().textContent() || "").trim();
  ok(`${d}: at least one card rendered`, cardCount > 0, `cardCount=${cardCount}`);
  ok(`${d}: first card has visible text`, firstCardText.length > 0, `text=${JSON.stringify(firstCardText.slice(0, 50))}`);
  ok(`${d}: no JS errors`, errors.length === 0, errors.join(" | "));
}

// Index page must link every tradie demo
await page.goto(`${BASE}/demo/`, { waitUntil: "domcontentloaded" });
for (const d of demos) {
  const link = await page.locator(`a[href="${d}"]`).count();
  ok(`index links ${d}`, link > 0);
}

// Demo 28 — workflow guard: cannot move from 'enquiry' straight to 'invoiced'
await page.goto(`${BASE}/demo/28-plumbing-job-pipeline.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-card-id="2"]');
const movedIllegally = await page.evaluate(() => {
  const board = document.getElementById("board");
  return board.boardApi.moveCard("2", { toColumnId: "invoiced", toIndex: 0 });
});
ok("28: accept_from refuses enquiry → invoiced", movedIllegally === false);

// Demo 32 — column totals should be visible
await page.goto(`${BASE}/demo/32-sparky-quote-pipeline.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
const totalsText = await page.locator("#totals").textContent();
ok("32: totals block renders AUD lines", /AUD|\$|won/i.test(totalsText || ""), `totals=${JSON.stringify((totalsText || "").slice(0, 80))}`);

// Demo 34 — retired cards must be locked
await page.goto(`${BASE}/demo/34-tool-tracking.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-card-id="8"]');
const lockedAttr = await page.locator('[data-card-id="8"]').getAttribute("data-card-locked");
ok("34: retired tools have data-card-locked=true", lockedAttr === "true", `attr=${lockedAttr}`);

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
