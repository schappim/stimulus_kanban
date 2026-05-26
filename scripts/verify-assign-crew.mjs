// Playwright check for demo 51 (assign crew to a card).
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

await page.goto(`${BASE}/demo/51-assign-crew-to-card.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

// Card 4 starts unassigned → face shows 'unassigned'
const initialFace = await page.locator('[data-card-id="4"] [data-ac-crew]').textContent();
ok("51: card 4 face shows 'unassigned' initially", /unassigned/.test(initialFace || ""), `face=${initialFace}`);

// Click card 4 → rail opens with the assignment panel
await page.locator('[data-card-id="4"]').click();
await page.waitForSelector(".ac-detail");
const countBefore = await page.locator('[data-ac-count]').textContent();
ok("51: assigned count starts at 0", (countBefore || "").trim() === "0", `count=${countBefore}`);

// Pool has 7 people, all available
const poolCount = await page.locator('[data-ac-pool] [data-add]').count();
ok("51: pool shows 7 addable people", poolCount === 7, `count=${poolCount}`);

// Add Dave
await page.locator('[data-ac-pool] [data-add="D"]').click();
await page.waitForTimeout(80);
const after1 = await page.locator('[data-ac-count]').textContent();
ok("51: count after adding Dave = 1", (after1 || "").trim() === "1");

// Dave should be the lead (first added becomes lead automatically)
const leadAfter1 = await page.locator('[data-ac-assigned-list] .avatar.lead').count();
ok("51: first added is auto-lead", leadAfter1 === 1);

// Add Sam
await page.locator('[data-ac-pool] [data-add="S"]').click();
await page.waitForTimeout(80);
const after2 = await page.locator('[data-ac-count]').textContent();
ok("51: count after adding Sam = 2", (after2 || "").trim() === "2");

// Pool now shows 5 addable
const poolAfter = await page.locator('[data-ac-pool] [data-add]').count();
ok("51: pool shrinks to 5 addable after 2 assignments", poolAfter === 5);

// Promote Sam (idx 1) to lead → button toggles
await page.locator('[data-set-lead="1"]').click();
await page.waitForTimeout(80);
const leadButtonsOn = await page.locator('[data-ac-assigned-list] button.lead-on').count();
ok("51: exactly one button.lead-on after promote", leadButtonsOn === 1);

// Remove Sam (now idx 1 because order preserved)
await page.locator('[data-remove="1"]').click();
await page.waitForTimeout(80);
const after3 = await page.locator('[data-ac-count]').textContent();
ok("51: count after removing Sam = 1", (after3 || "").trim() === "1");

// Removing the lead promoted Dave (the remaining) to lead
const remainingLead = await page.locator('[data-ac-assigned-list] .avatar.lead').count();
ok("51: removing the lead auto-promotes the next remaining", remainingLead === 1);

// Underlying boardApi data is updated
const apiCrew = await page.evaluate(() => document.getElementById('board').boardApi.getCardData()
  .find((c) => String(c.id) === '4')?.crew);
ok("51: boardApi reflects the new crew", apiCrew?.length === 1 && apiCrew[0].initial === 'D' && apiCrew[0].lead === true,
   `crew=${JSON.stringify(apiCrew)}`);

// Card face now shows the avatar (not 'unassigned' anymore)
const faceAfter = await page.locator('[data-card-id="4"] [data-ac-crew] .avatar').count();
ok("51: card face avatar repainted via board:rendered", faceAfter === 1, `count=${faceAfter}`);

ok("51: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
