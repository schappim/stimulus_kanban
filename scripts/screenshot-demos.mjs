// Quick visual snapshot of the three demos the user reported issues on.
// Saves PNGs next to this script. Works against any BASE_URL (local or
// the deployed kanban.schappi.cloud).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../docs/images");
mkdirSync(OUT, { recursive: true });

const BASE  = process.env.BASE_URL || "http://localhost:5173";
const LABEL = process.env.LABEL    || "local";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const cases = [
  { demo: "01-basic.html", action: null },
  { demo: "09-keyboard-nav.html", action: null },
  {
    demo: "13-card-detail-popover.html",
    action: async (p) => {
      await p.waitForSelector('[data-card-id="1"]');
      await p.locator('[data-card-id="1"]').click();
      await p.keyboard.press("Enter");
      await p.waitForSelector(".sk-card-detail-popover", { timeout: 2000 }).catch(() => {});
    },
  },
  {
    demo: "14-card-detail-rail.html",
    action: async (p) => {
      await p.waitForSelector('[data-card-id="1"]');
      await p.locator('[data-card-id="1"]').click();
      await p.keyboard.press("Enter");
      await p.waitForSelector(".sk-card-detail-rail", { timeout: 2000 }).catch(() => {});
    },
  },
];

for (const c of cases) {
  await page.goto(`${BASE}/demo/${c.demo}`, { waitUntil: "domcontentloaded" });
  if (c.action) await c.action(page);
  await page.waitForTimeout(150);
  const path = resolve(OUT, `${LABEL}-${c.demo.replace(/\.html$/, "")}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log("wrote", path);
}

await browser.close();
