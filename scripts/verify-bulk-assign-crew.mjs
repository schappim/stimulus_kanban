// Playwright check for demo 52 (bulk-assign crew across multiple cards).
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

await page.goto(`${BASE}/demo/52-bulk-assign-crew.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

// Panel starts hidden
const initial = await page.locator("#bk-panel").evaluate((el) => el.classList.contains("open"));
ok("52: bulk panel starts hidden", initial === false);

// Picker has 7 rows
const pickerRows = await page.locator("#bk-picker [data-key]").count();
ok("52: picker shows 7 people", pickerRows === 7, `count=${pickerRows}`);

// Select cards 1 and 3 (both empty crew) and card 5 (Dave lead + Sam)
await page.locator('[data-card-id="1"]').click();
await page.locator('[data-card-id="3"]').click({ modifiers: ["Meta"] });
await page.locator('[data-card-id="5"]').click({ modifiers: ["Meta"] });
await page.waitForTimeout(80);

const panelOpen = await page.locator("#bk-panel").evaluate((el) => el.classList.contains("open"));
ok("52: panel opens after multi-select", panelOpen === true);

const countText = await page.locator("#bk-count").textContent();
ok("52: count badge shows '3 selected'", (countText || "").trim() === "3 selected", `text=${countText}`);

// Dave is on card 5 only → row should say 'on 1/3' and data-on-none=false data-on-all=false
const daveHint = await page.locator('#bk-picker [data-key="D"] .who-on').textContent();
ok("52: Dave shows 'on 1/3'", (daveHint || "").trim() === "on 1/3", `hint=${daveHint}`);

// Pick Dave
await page.locator('#bk-picker [data-key="D"] input').click();
await page.waitForTimeout(50);
const addEnabled = await page.locator("#bk-add").evaluate((el) => !el.disabled);
ok("52: Add button enabled when pick + selection both present", addEnabled === true);

// Apply add → all 3 cards should now have Dave
await page.locator("#bk-add").click();
await page.waitForTimeout(120);

const daveAfter = await page.locator('#bk-picker [data-key="D"] .who-on').textContent();
ok("52: after add, Dave shows 'on 3/3'", (daveAfter || "").trim() === "on 3/3", `hint=${daveAfter}`);

// Card 1 (previously empty) — Dave should be lead
const c1 = await page.evaluate(() => document.getElementById('board').boardApi.getCardData()
  .find((c) => String(c.id) === '1')?.crew);
ok("52: card 1 (previously empty) got Dave as lead", c1?.length === 1 && c1[0].initial === 'D' && c1[0].lead === true,
   `crew=${JSON.stringify(c1)}`);

// Card 5 already had Dave (lead) + Sam → still 2 members, Dave still lead
const c5 = await page.evaluate(() => document.getElementById('board').boardApi.getCardData()
  .find((c) => String(c.id) === '5')?.crew);
ok("52: card 5 idempotent — not duplicated", c5?.length === 2, `crew=${JSON.stringify(c5)}`);
ok("52: card 5 Dave still lead", c5?.find((m) => m.initial === 'D')?.lead === true);

// Card face avatar repainted via board:rendered
const c1FaceAvatars = await page.locator('[data-card-id="1"] [data-bk-crew] .avatar').count();
ok("52: card 1 face shows the new avatar", c1FaceAvatars === 1);

// Now also pick Mia, then remove Dave + Mia from all selected
await page.locator('#bk-picker [data-key="M"] input').click();
await page.waitForTimeout(50);
await page.locator("#bk-remove").click();
await page.waitForTimeout(120);

const c1After = await page.evaluate(() => document.getElementById('board').boardApi.getCardData()
  .find((c) => String(c.id) === '1')?.crew);
ok("52: after remove, card 1 empty", (c1After?.length || 0) === 0, `crew=${JSON.stringify(c1After)}`);

const c5After = await page.evaluate(() => document.getElementById('board').boardApi.getCardData()
  .find((c) => String(c.id) === '5')?.crew);
ok("52: after remove, card 5 keeps Sam (Dave gone, Sam promoted to lead)",
   c5After?.length === 1 && c5After[0].initial === 'S' && c5After[0].lead === true,
   `crew=${JSON.stringify(c5After)}`);

// Clear selection button hides the panel
await page.locator("#bk-clear").click();
await page.waitForTimeout(80);
const closedAgain = await page.locator("#bk-panel").evaluate((el) => el.classList.contains("open"));
ok("52: Clear-selection hides the bulk panel", closedAgain === false);

ok("52: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
