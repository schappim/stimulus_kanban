// Targeted Playwright checks for the two latest changes:
//   - the .sk-swimlane-header is the click target (whole-header button)
//   - demo 36 (week view) auto-sorts by start_time per column
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5173";

function ok(name, cond, detail) {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// ---- 1) Swimlane header is the click target ---------------------------------
// Demo 06 (swimlanes by assignee) is the canonical swimlane demo.
await page.goto(`${BASE}/demo/06-swimlanes-assignee.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".sk-swimlane-header");

const headerInfo = await page.evaluate(() => {
  const h = document.querySelector(".sk-swimlane-header");
  return {
    role: h?.getAttribute("role"),
    tabindex: h?.getAttribute("tabindex"),
    ariaExpanded: h?.getAttribute("aria-expanded"),
    action: h?.getAttribute("data-action"),
    innerToggleTag: h?.querySelector(".sk-swimlane-toggle")?.tagName,
    innerToggleAriaHidden: h?.querySelector(".sk-swimlane-toggle")?.getAttribute("aria-hidden"),
  };
});
ok("swimlane: header has role=button",         headerInfo.role === "button");
ok("swimlane: header has tabindex=0",          headerInfo.tabindex === "0");
ok("swimlane: header has aria-expanded set",   headerInfo.ariaExpanded === "true" || headerInfo.ariaExpanded === "false");
ok("swimlane: data-action covers click+keydown", /click->swimlane-header#toggle/.test(headerInfo.action || "") && /keydown->swimlane-header#keydown/.test(headerInfo.action || ""));
ok("swimlane: inner toggle is a SPAN (not BUTTON)", headerInfo.innerToggleTag === "SPAN");
ok("swimlane: inner toggle is aria-hidden",         headerInfo.innerToggleAriaHidden === "true");

// Click the label inside the header (not the chevron) — should still collapse.
const beforeCollapsed = await page.locator(".sk-swimlane.sk-swimlane-collapsed").count();
await page.locator(".sk-swimlane-header .sk-swimlane-label").first().click();
await page.waitForTimeout(80);
const afterCollapsed = await page.locator(".sk-swimlane.sk-swimlane-collapsed").count();
ok("swimlane: clicking the LABEL toggles collapse", afterCollapsed !== beforeCollapsed,
   `before=${beforeCollapsed}, after=${afterCollapsed}`);

// Tab to the header and press Enter — should toggle.
const beforeKB = await page.locator(".sk-swimlane.sk-swimlane-collapsed").count();
await page.locator(".sk-swimlane-header").first().focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(80);
const afterKB = await page.locator(".sk-swimlane.sk-swimlane-collapsed").count();
ok("swimlane: Enter on focused header toggles collapse", afterKB !== beforeKB,
   `before=${beforeKB}, after=${afterKB}`);

// Space should too.
const beforeSpace = await page.locator(".sk-swimlane.sk-swimlane-collapsed").count();
await page.locator(".sk-swimlane-header").first().focus();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const afterSpace = await page.locator(".sk-swimlane.sk-swimlane-collapsed").count();
ok("swimlane: Space on focused header toggles collapse", afterSpace !== beforeSpace);

// ---- 2) Week view per-column time sort -------------------------------------
await page.goto(`${BASE}/demo/36-week-view.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-board-column-id-value="fri"] [data-card-id]');

const fridayTimes = await page.evaluate(() => {
  const col = document.querySelector('[data-board-column-id-value="fri"]');
  return Array.from(col.querySelectorAll('[data-card-id] .time')).map((el) => el.textContent.trim());
});
const sorted = [...fridayTimes].sort();
ok("36: Friday cards rendered in start_time order", JSON.stringify(fridayTimes) === JSON.stringify(sorted),
   `got: ${JSON.stringify(fridayTimes)}`);

// Move a card into a different day; per-column sort should resort the target.
await page.evaluate(() => {
  const board = document.getElementById("board");
  // Move the 11:00 Friday callout (id=3) into Wednesday — expect it between 09:00 and 13:00.
  board.boardApi.moveCard("3", { toColumnId: "wed", toIndex: 99 });
});
await page.waitForTimeout(120);
const wedTimes = await page.evaluate(() => {
  const col = document.querySelector('[data-board-column-id-value="wed"]');
  return Array.from(col.querySelectorAll('[data-card-id] .time')).map((el) => el.textContent.trim());
});
ok("36: moved card reseats into time-sorted slot",
   JSON.stringify(wedTimes) === JSON.stringify([...wedTimes].sort()),
   `wed times: ${JSON.stringify(wedTimes)}`);

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
