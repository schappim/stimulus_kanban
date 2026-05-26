// Playwright check for demo 49 (photo carousel on card face).
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

await page.goto(`${BASE}/demo/49-photo-carousel-card-face.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(200);

// card 1 has 4 photos → 4 tiles, no +N
const c1Tiles = await page.locator('[data-card-id="1"] [data-ph-photos] .p').count();
ok("49: card 1 (4 photos) renders 4 tiles", c1Tiles === 4);

const c1Plus = await page.locator('[data-card-id="1"] [data-ph-photos] .count').count();
ok("49: card 1 has no +N badge (exactly 4)", c1Plus === 0);

// card 4 has 7 photos → 4 tiles, last shows +3
const c4Tiles = await page.locator('[data-card-id="4"] [data-ph-photos] .p').count();
ok("49: card 4 (7 photos) renders 4 tiles capped", c4Tiles === 4);
const c4PlusText = await page.locator('[data-card-id="4"] [data-ph-photos] .count').textContent();
ok("49: card 4 shows +3 overflow badge", (c4PlusText || "").trim() === "+3", `text=${c4PlusText}`);

// card 3 has no photos → strip is .empty (display:none)
const c3StripEmpty = await page.locator('[data-card-id="3"] [data-ph-photos]').getAttribute("class");
ok("49: card 3 (no photos) has .empty class", /\bempty\b/.test(c3StripEmpty || ""), `class=${c3StripEmpty}`);

// Strip visually display:none
const c3Display = await page.locator('[data-card-id="3"] [data-ph-photos]').evaluate((el) => getComputedStyle(el).display);
ok("49: empty strip is display:none", c3Display === "none");

// Card 2 has 1 photo → 1 tile
const c2Tiles = await page.locator('[data-card-id="2"] [data-ph-photos] .p').count();
ok("49: card 2 (1 photo) renders 1 tile", c2Tiles === 1);

ok("49: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
