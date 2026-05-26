// Playwright check for demo 43 (multi-tradie assignment).
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

await page.goto(`${BASE}/demo/43-multi-tradie-assignment.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

// Card 1 should have 2 avatars (D lead + S)
const c1Avatars = await page.locator('[data-card-id="1"] .avatar').count();
ok("43: card 1 has 2 crew avatars", c1Avatars === 2, `count=${c1Avatars}`);

// Card 2 has 3 (M lead + N + R)
const c2Avatars = await page.locator('[data-card-id="2"] .avatar').count();
ok("43: card 2 has 3 crew avatars", c2Avatars === 3, `count=${c2Avatars}`);

// The lead has the .lead class
const c1Lead = await page.locator('[data-card-id="1"] .avatar.lead').count();
ok("43: card 1 has exactly one lead avatar", c1Lead === 1);

// Tooltip text from title attribute
const c1Title = await page.locator('[data-card-id="1"] .avatar.lead').getAttribute("title");
ok("43: lead avatar title includes name + role + 'lead'", /Dave.*gas plumber.*lead/.test(c1Title || ""), `title=${c1Title}`);

// Total crew across all cards
const totalAvatars = await page.locator(".avatar").count();
// Includes legend (5) + crew on 6 cards (2+3+3+2+1+2=13) → 18
ok("43: total avatars in DOM 18 (5 legend + 13 crew)", totalAvatars === 18, `count=${totalAvatars}`);

// After moving a card the crew re-paints (board:rendered hook)
await page.evaluate(() => document.getElementById('board').boardApi.moveCard("1", { toColumnId: "completed", toIndex: 0 }));
await page.waitForTimeout(100);
const c1AfterMove = await page.locator('[data-card-id="1"] .avatar').count();
ok("43: crew survives a move (re-painted via board:rendered)", c1AfterMove === 2, `count=${c1AfterMove}`);

ok("43: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
