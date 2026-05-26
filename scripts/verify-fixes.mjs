// Playwright verification harness for the three user-reported regressions.
// Boots the vite dev server externally, then drives the relevant demos.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5173";

function ok(name, cond, detail) {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// 1) Demo 01 — card text + column title must render
await page.goto(`${BASE}/demo/01-basic.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-card-id="1"]');
const card1 = page.locator('[data-card-id="1"]');
const card1Text = (await card1.textContent())?.trim();
ok("01: card 1 has 'Buy milk' text", card1Text === "Buy milk", `got: ${JSON.stringify(card1Text)}`);
const stray = await page.locator('[data-card-id="1"][text], .sk-column-title[text]').count();
ok("01: no literal text= attribute leaks", stray === 0, `count=${stray}`);
const todoHeader = await page.locator('[data-board-column-id-value="todo"] .sk-column-title').textContent();
ok("01: 'To do' column header visible", todoHeader === "To do", `got: ${JSON.stringify(todoHeader)}`);

// 2) Demo 09 — card wrapper left border must be 1px solid (not transparent)
await page.goto(`${BASE}/demo/09-keyboard-nav.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-card-id="1"]');
const borderInfo = await page.evaluate(() => {
  const el = document.querySelector('[data-card-id="1"]');
  const s = getComputedStyle(el);
  return {
    left:   s.borderLeftWidth + " " + s.borderLeftStyle + " " + s.borderLeftColor,
    right:  s.borderRightWidth + " " + s.borderRightStyle + " " + s.borderRightColor,
    top:    s.borderTopWidth + " " + s.borderTopStyle + " " + s.borderTopColor,
    bottom: s.borderBottomWidth + " " + s.borderBottomStyle + " " + s.borderBottomColor,
  };
});
ok("09: card left border matches right border", borderInfo.left === borderInfo.right,
   `left=${borderInfo.left}, right=${borderInfo.right}`);
ok("09: card left border is 1px solid (not 3px transparent)",
   borderInfo.left.startsWith("1px solid"), borderInfo.left);

// 3) Demos 13 + 14 — clicking a card and pressing Enter opens the detail panel
for (const [demo, layoutClass] of [
  ["13-card-detail-popover.html", "sk-card-detail-popover"],
  ["14-card-detail-rail.html",    "sk-card-detail-rail"],
]) {
  await page.goto(`${BASE}/${"demo/" + demo}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-card-id="1"]');
  await page.locator('[data-card-id="1"]').click();
  await page.keyboard.press("Enter");
  // Detail is appended either to body (popover) or inside the board (rail).
  await page.waitForSelector(`.${layoutClass}`, { timeout: 2000 }).catch(() => {});
  const visible = await page.locator(`.${layoutClass}`).count();
  ok(`${demo}: detail panel mounted (.${layoutClass})`, visible > 0, `count=${visible}`);
  if (visible > 0) {
    const title = await page.locator(`.${layoutClass} h3`).textContent();
    ok(`${demo}: detail panel shows card title`, title && title.length > 0, `title=${JSON.stringify(title)}`);
  }
}

// 4) Demo 13 — dblclick on a card should also open the popover now (was opening the editor)
await page.goto(`${BASE}/demo/13-card-detail-popover.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-card-id="1"]');
await page.locator('[data-card-id="1"]').dblclick();
const popoverFromDblclick = await page.locator(".sk-card-detail-popover").count();
ok("13: dblclick opens the popover (no editor template)", popoverFromDblclick > 0, `count=${popoverFromDblclick}`);

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
