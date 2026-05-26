// Playwright check for demo 39 (bulk action toolbar).
//   - toolbar hidden until at least one card selected
//   - shows "N selected" + every configured action button
//   - "Move to Quoting" actually moves selected cards
//   - "Archive" sends to the Archived column
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

await page.goto(`${BASE}/demo/39-bulk-action-toolbar.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");

const toolbarHidden = await page.locator(".sk-bulk-toolbar").evaluate((el) => el.style.display === 'none');
ok("39: toolbar starts hidden", toolbarHidden === true);

// Click a card to select
await page.locator('[data-card-id="1"]').click();
await page.waitForTimeout(60);
const labelText = await page.locator(".sk-bulk-toolbar .sk-bulk-label").textContent();
ok("39: label shows '1 selected'", (labelText || "").trim() === "1 selected", `label=${labelText}`);

// Add a second
await page.locator('[data-card-id="2"]').click({ modifiers: ["Meta"] });
await page.waitForTimeout(60);
const label2 = await page.locator(".sk-bulk-toolbar .sk-bulk-label").textContent();
ok("39: label updates to '2 selected'", (label2 || "").trim() === "2 selected", `label=${label2}`);

const btnCount = await page.locator(".sk-bulk-toolbar .sk-bulk-btn").count();
ok("39: 5 action buttons render", btnCount === 5, `count=${btnCount}`);

const primary = await page.locator(".sk-bulk-toolbar .sk-bulk-btn-primary").count();
ok("39: at least one button styled as primary", primary === 1);

const danger = await page.locator(".sk-bulk-toolbar .sk-bulk-btn-danger").count();
ok("39: at least one button styled as danger", danger === 1);

// Move-to-quoting
await page.locator('[data-bulk-action="move-to-quoting"]').click();
await page.waitForTimeout(120);
const quotingNow = await page.locator('[data-board-column-id-value="quoting"] [data-card-id]').count();
ok("39: Move-to-quoting moves 2 cards", quotingNow >= 4, `quotingCol=${quotingNow}`);

// Toolbar should now be hidden (clearSelection)
await page.waitForTimeout(60);
const stillHidden = await page.locator(".sk-bulk-toolbar").evaluate((el) => el.style.display === 'none');
ok("39: toolbar hides again after clearSelection", stillHidden === true);

// Now archive flow
await page.locator('[data-card-id="7"]').click();
await page.waitForTimeout(60);
await page.locator('[data-bulk-action="archive"]').click();
await page.waitForTimeout(80);
const archivedCount = await page.locator('[data-board-column-id-value="archived"] [data-card-id]').count();
ok("39: Archive moves selected to Archived", archivedCount === 1);

ok("39: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
