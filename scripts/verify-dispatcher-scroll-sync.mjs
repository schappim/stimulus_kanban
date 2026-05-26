// Playwright check for demo 38's horizontal scroll sync.
//   - rows actually overflow (preconditions for sync to matter)
//   - scrolling Dave's row syncs Sam and Mia in lock-step
//   - scrolling Mia's row syncs Dave and Sam (sync is bidirectional)
//   - exactly one scrollbar is visible (Mia's row)
//   - exactly one day-strip is visible (Dave's row)
//   - re-render via card move keeps sync working (controller reuses
//     the .sk-columns element so handlers stay bound)
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5180";

function ok(name, cond, detail) {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

await page.goto(`${BASE}/demo/38-dispatcher-board.html`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#board-dave [data-card-id]");
await page.waitForTimeout(150);

// ---- Preconditions: each tradie row must actually overflow ----------------
const widths = await page.evaluate(() => ['board-dave','board-sam','board-mia'].map((id) => {
  const s = document.getElementById(id).querySelector('.sk-columns');
  return { id, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth };
}));
for (const w of widths) {
  ok(`38: ${w.id} actually overflows horizontally`, w.scrollWidth > w.clientWidth + 100,
    `scrollWidth=${w.scrollWidth}, clientWidth=${w.clientWidth}`);
}

// ---- Scroll Dave → Sam + Mia follow ---------------------------------------
await page.evaluate(() => {
  const s = document.querySelector('#board-dave .sk-columns');
  s.scrollLeft = 600;
  s.dispatchEvent(new Event('scroll'));
});
await page.waitForTimeout(120);
const after1 = await page.evaluate(() => ['board-dave','board-sam','board-mia']
  .map((id) => ({ id, x: document.getElementById(id).querySelector('.sk-columns').scrollLeft })));
ok("38: scrolling Dave to 600 cascades to Sam", after1[1].x === 600, `sam=${after1[1].x}`);
ok("38: scrolling Dave to 600 cascades to Mia", after1[2].x === 600, `mia=${after1[2].x}`);

// ---- Scroll Mia → Dave + Sam follow ---------------------------------------
await page.evaluate(() => {
  const s = document.querySelector('#board-mia .sk-columns');
  s.scrollLeft = 1200;
  s.dispatchEvent(new Event('scroll'));
});
await page.waitForTimeout(120);
const after2 = await page.evaluate(() => ['board-dave','board-sam','board-mia']
  .map((id) => ({ id, x: document.getElementById(id).querySelector('.sk-columns').scrollLeft })));
ok("38: scrolling Mia to 1200 cascades to Dave", after2[0].x === 1200, `dave=${after2[0].x}`);
ok("38: scrolling Mia to 1200 cascades to Sam",  after2[1].x === 1200, `sam=${after2[1].x}`);

// ---- One scrollbar visible (Mia), two hidden (Dave, Sam) ------------------
// We can't sniff the literal scrollbar pixels, but we can verify the
// scrollbar-width CSS is set to 'none' on rows 1 and 2 and unset (default
// 'auto') on row 3.
const scrollbarMode = await page.evaluate(() => {
  return {
    dave: getComputedStyle(document.querySelector('#board-dave .sk-columns')).scrollbarWidth,
    sam:  getComputedStyle(document.querySelector('#board-sam .sk-columns')).scrollbarWidth,
    mia:  getComputedStyle(document.querySelector('#board-mia .sk-columns')).scrollbarWidth,
  };
});
ok("38: Dave's scrollbar hidden", scrollbarMode.dave === "none", `mode=${scrollbarMode.dave}`);
ok("38: Sam's scrollbar hidden",  scrollbarMode.sam  === "none", `mode=${scrollbarMode.sam}`);
ok("38: Mia's scrollbar visible (default auto)", scrollbarMode.mia !== "none", `mode=${scrollbarMode.mia}`);

// ---- One day-strip visible (Dave row) -------------------------------------
const headerCounts = await page.evaluate(() => ({
  dave: document.querySelectorAll('#board-dave .sk-column-header').length,
  sam:  document.querySelectorAll('#board-sam  .sk-column-header').length,
  mia:  document.querySelectorAll('#board-mia  .sk-column-header').length,
}));
ok("38: Dave row has 10 day-label headers", headerCounts.dave === 10, `count=${headerCounts.dave}`);
// Sam/Mia headers exist in DOM but `display:none` makes them invisible.
// Test via offsetParent (null when display:none).
const headerVisibility = await page.evaluate(() => {
  const samFirst = document.querySelector('#board-sam .sk-column-header');
  const miaFirst = document.querySelector('#board-mia .sk-column-header');
  return {
    sam: samFirst ? !!samFirst.offsetParent : null,
    mia: miaFirst ? !!miaFirst.offsetParent : null,
  };
});
ok("38: Sam's headers are visually hidden (offsetParent null)", headerVisibility.sam === false,
   `offsetParent=${headerVisibility.sam}`);
ok("38: Mia's headers are visually hidden (offsetParent null)", headerVisibility.mia === false,
   `offsetParent=${headerVisibility.mia}`);

// ---- Sync survives a re-render (cross-board drag → applyTransaction) ------
await page.evaluate(() => {
  // Move a pool card to dave-fri2 — triggers refresh() → setCardData →
  // re-render. The .sk-columns scroller should be reused (not replaced)
  // and our scroll handlers should remain bound.
  const pool = document.getElementById('pool');
  pool.boardApi.applyTransaction({ remove: ['1'] });
  document.getElementById('board-dave').boardApi.applyTransaction({
    add: [{ id: 1, column_id: 'dave-fri2', job_no: 'JOB-1001', type: 'callout',
      title: 'Leaking kitchen tap', suburb: 'Surry Hills',
      type_label: 'CALLOUT', type_pill_class: 'pill callout' }],
  });
});
await page.waitForTimeout(150);
// Re-bind scroll on Sam → should still propagate
await page.evaluate(() => {
  const s = document.querySelector('#board-sam .sk-columns');
  s.scrollLeft = 300;
  s.dispatchEvent(new Event('scroll'));
});
await page.waitForTimeout(120);
const after3 = await page.evaluate(() => ['board-dave','board-sam','board-mia']
  .map((id) => ({ id, x: document.getElementById(id).querySelector('.sk-columns').scrollLeft })));
ok("38: sync survives applyTransaction re-render — Dave follows", after3[0].x === 300, `dave=${after3[0].x}`);
ok("38: sync survives applyTransaction re-render — Mia follows",  after3[2].x === 300, `mia=${after3[2].x}`);

ok("38: no JS errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(process.exitCode ? "\nFAIL" : "\nOK");
