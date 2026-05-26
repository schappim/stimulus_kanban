// Playwright check for demo 44 (recurring-job badge).
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

await page.goto(`${BASE}/demo/44-recurring-job-badge.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-card-id]");
await page.waitForTimeout(150);

const badges = await page.locator(".rc-card .badge").count();
ok("44: 6 recurring badges render (3 one-offs unbadged)", badges === 6, `badges=${badges}`);

const oneOffNoBadge = await page.locator('[data-card-id="4"] .badge').count();
ok("44: one-off card (id=4) has no badge", oneOffNoBadge === 0);

const annualBadges = await page.locator(".rc-card .badge.annual").count();
ok("44: 3 annual badges", annualBadges === 3, `annual=${annualBadges}`);

const weekly = await page.locator(".rc-card .badge.weekly").count();
ok("44: 1 weekly badge", weekly === 1);

const nextText = await page.locator('[data-card-id="1"] .next').textContent();
ok("44: badge shows next-due date", /2026-06-04/.test(nextText || ""), `next=${nextText}`);

const lastDoneText = await page.locator('[data-card-id="8"] .next').textContent();
ok("44: completed recurring shows last-done + next", /last done.*next 2027-05-26/.test(lastDoneText || ""),
   `next=${lastDoneText}`);

ok("44: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
