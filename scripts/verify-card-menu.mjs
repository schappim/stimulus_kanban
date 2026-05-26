// Playwright check for demo 48 (card ⋯ menu).
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

await page.goto(`${BASE}/demo/48-card-menu.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

const triggerCount = await page.locator("[data-cm-trigger]").count();
ok("48: every card has a ⋯ trigger", triggerCount === 6, `count=${triggerCount}`);

// Hover card 2, click trigger → menu opens
await page.locator('[data-card-id="2"]').hover();
await page.locator('[data-card-id="2"] [data-cm-trigger]').click();
await page.waitForSelector(".cm-menu");
const menuVisible = await page.locator(".cm-menu").isVisible();
ok("48: menu opens on trigger click", menuVisible === true);

const menuItemCount = await page.locator(".cm-menu button").count();
ok("48: menu has 6 actions", menuItemCount === 6, `count=${menuItemCount}`);

// Duplicate
await page.locator('.cm-menu button[data-act="duplicate"]').click();
await page.waitForTimeout(120);
const copies = await page.locator('[data-card-id] .sk-card-title').allTextContents();
ok("48: duplicate adds a (copy)", copies.some((t) => /\(copy\)$/.test(t)));

// Open menu again, then move-to-top
await page.locator('[data-card-id="6"]').hover();
await page.locator('[data-card-id="6"] [data-cm-trigger]').click();
await page.locator('.cm-menu button[data-act="top"]').click();
await page.waitForTimeout(80);
const doneFirstId = await page.locator('[data-board-column-id-value="done"] [data-card-id]').first().getAttribute('data-card-id');
ok("48: move-to-top puts card at index 0 of its column", doneFirstId === '6', `first=${doneFirstId}`);

// Archive
await page.locator('[data-card-id="6"]').hover();
await page.locator('[data-card-id="6"] [data-cm-trigger]').click();
await page.locator('.cm-menu button[data-act="archive"]').click();
await page.waitForTimeout(80);
const archived = await page.locator('[data-board-column-id-value="archived"] [data-card-id="6"]').count();
ok("48: archive moves the card to Archived", archived === 1);

// Esc closes
await page.locator('[data-card-id="1"]').hover();
await page.locator('[data-card-id="1"] [data-cm-trigger]').click();
await page.waitForSelector(".cm-menu");
await page.keyboard.press("Escape");
await page.waitForTimeout(60);
const afterEsc = await page.locator(".cm-menu").count();
ok("48: Esc closes the menu", afterEsc === 0);

ok("48: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
