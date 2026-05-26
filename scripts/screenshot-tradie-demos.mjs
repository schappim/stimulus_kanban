// Visual snapshot of the 8 tradie demos + the updated index.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../docs/images/tradie");
mkdirSync(OUT, { recursive: true });

const BASE  = process.env.BASE_URL || "http://localhost:5173";
const LABEL = process.env.LABEL    || "local";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const cases = [
  { url: "/demo/", file: "index" },
  { url: "/demo/28-plumbing-job-pipeline.html", file: "28" },
  { url: "/demo/29-weekly-roster.html",          file: "29" },
  { url: "/demo/30-building-handover-veto.html", file: "30" },
  { url: "/demo/31-snag-list-photos.html",       file: "31" },
  { url: "/demo/32-sparky-quote-pipeline.html",  file: "32" },
  { url: "/demo/33-fleet-maintenance.html",      file: "33" },
  { url: "/demo/34-tool-tracking.html",          file: "34" },
  { url: "/demo/35-apprentice-training.html",    file: "35" },
];

for (const c of cases) {
  await page.goto(`${BASE}${c.url}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(200);
  const path = resolve(OUT, `${LABEL}-${c.file}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log("wrote", path);
}

await browser.close();
