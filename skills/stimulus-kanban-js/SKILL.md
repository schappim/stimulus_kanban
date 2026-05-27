---
name: stimulus-kanban-js
description: Use stimulus_kanban, an HTML-first kanban board for Stimulus.js (Hotwire). Apply when adding or editing a column-of-cards board UI in a Stimulus/Hotwire front end — drag-and-drop between columns, WIP limits, swimlanes, multi-card selection, inline card editing, custom card renderers / editors, virtual scrolling, server-side card windows, or driving a board through its boardApi. For the Rails server-driven version (Turbo Stream live sync, server-side workflow guards, audit log + undo/redo) use the stimulus-kanban-rails skill instead — and see its COOKBOOK.md for the exact HTTP + broadcast wire format if you're writing a non-Rails server.
---

# Using stimulus_kanban (the JS library)

stimulus_kanban is a client-side kanban board built from Stimulus
controllers. **The HTML is the configuration** — there is no JS options
object. You write a semantic `<ol>` of column `<li>`s and card `<li>`s,
annotate them with `data-*` attributes, and the controllers enhance them
into a live drag-and-drop board.

## Setup (pick one)

**Plain script (no bundler):** the IIFE bundle includes Stimulus.

```html
<link rel="stylesheet" href="/path/dist/stimulus_kanban.css" />
<script src="/path/dist/stimulus_kanban.js"></script>
<script>StimulusKanban.start()</script>
```

**ES module / importmap:** the ESM bundle externalises `@hotwired/stimulus`.

```js
import { Application } from "@hotwired/stimulus"
import StimulusKanban from "@ninjaai/stimulus_kanban"
import "@ninjaai/stimulus_kanban/style.css"

const app = Application.start()
StimulusKanban.start(app)
```

`StimulusKanban.start(app?)` registers the controllers (`board`,
`board-column`, `card`, `card-editor`, `swimlane-header`, `column-menu`)
and returns the Application. Call it once.

## Minimal board

```html
<div data-controller="board" style="height: 480px">
  <ol class="sk-columns">
    <li data-controller="board-column"
        data-board-column-id-value="todo"
        data-board-column-title-value="To do">
      <ol class="sk-cards">
        <li data-card-id="1">Buy milk</li>
        <li data-card-id="2">Walk dog</li>
      </ol>
    </li>
    <li data-controller="board-column"
        data-board-column-id-value="doing"
        data-board-column-title-value="Doing">
      <ol class="sk-cards">
        <li data-card-id="3">Write spec</li>
      </ol>
    </li>
    <li data-controller="board-column"
        data-board-column-id-value="done"
        data-board-column-title-value="Done">
      <ol class="sk-cards"></ol>
    </li>
  </ol>
</div>
```

## Data sources

Cards can be supplied **three ways** (the controller resolves in this order):

1. Pre-rendered HTML — `<li data-card-id="…">…</li>` inside the column's
   `.sk-cards`. The board parses these on `connect`. **HTML is the source
   of truth.**
2. `data-board-card-data-value='[…]'` — a Stimulus JSON value.
3. `data-board-card-data-url-value="/cards.json"` — one fetch, returning
   `{ columns: [...], cards: [...] }` or a bare array.

After `connect`, `element.boardApi.setCardData([...])` and
`applyTransaction(...)` are the imperative paths.

## Common board attributes (on the root `<div>`)

- `data-board-card-selection-value` — `""` | `"single"` | `"multiple"`
- `data-board-card-renderer-value="story"` — built-in renderer name (or a
  `<template>` id with `data-bind` markup)
- `data-board-card-editor-value="story-editor"` — `<template>` id for
  inline edit
- `data-board-card-detail-template-value="story-detail"` — `<template>`
  id for the card-detail panel
- `data-board-detail-layout-value="popover" | "rail"`
- `data-board-card-height-value="64"` + `data-board-virtual-threshold-value="200"`
  — virtualise columns past N cards when card height is fixed
- `data-board-swimlane-field-value="assignee_id"` — bucket every column
  horizontally by this card field
- `data-board-quick-filter-value="bug"` — initial search
- `data-board-persist-key-value="my-board"` — auto-save column order /
  widths / collapse / swimlane / filter through localStorage
- `data-board-read-only-value="true"` — disable drag + inline edit
- `data-board-add-card-value="true"` — render `+ Add card` rows
- `data-board-accept-files-value="true"` — drag-to-attach files

## Common column attributes (on each `board-column` `<li>`)

- `data-board-column-id-value="todo"` (required)
- `data-board-column-title-value="To do"`
- `data-board-column-wip-value="5"` (over-limit fires `board:wipExceeded`
  exactly once per crossing)
- `data-board-column-accept-cards-from-value='["doing"]'` — restrict
  incoming drops
- `data-board-column-sort-value="manual" | "asc:<field>" | "desc:<field>"`
- `data-board-column-collapsed-value="true"` / `hidden-value="true"`
- `data-board-column-width-value="320"`
- `data-board-column-color-value="#3b82f6"` / `icon-value="🔥"`
- `data-board-column-stuck-after-days-value="7"` — declarative aging:
  cards sitting in this column ≥ N days get a `Nd ⚠` badge + the
  `board:cardStuck` event fires once per crossing (see Aging section)

## Card attributes

- `data-card-id` (required)
- `data-card-order` — numeric position in the column
- `data-card-locked="true"` — forbid drag + edit
- `data-card-renderer="<template-or-name>"` / `data-card-editor="…"`
- `data-card-color="#…"` (left rail accent)
- `data-card-swimlane="<value>"` — override the swimlane field lookup
- `data-card-json='{ "title":"…", "key":"…" }'` — bulk metadata for a
  renderer that reads from `card.foo`

## Public API — `element.boardApi`

Available right after the `board:ready` event:

```js
board.addEventListener("board:ready", (ev) => {
  const api = ev.detail.api
  api.setCardData(cards)
  api.moveCard("3", { toColumnId: "done", toIndex: 0 })
  api.applyTransaction({ add: [{ id: 99, column_id: "todo", title: "New" }] })
  api.setQuickFilter("bug")
  api.setSwimlaneField("assignee_id")
  api.setColumnSort("doing", "asc:priority")
  api.openCardDetail("3")
})
```

Highlights:

- **Data:** `setCardData`, `getCardData`, `setColumnData`, `getColumnData`,
  `applyTransaction({add, update, remove, move})`, `setColumnCounts`
  (server-side)
- **Selection:** `selectCard`, `deselectCard`, `selectAllInColumn(colId)`,
  `clearSelection`, `getSelectedCardIds`, `getSelectedCards`
- **Movement:** `moveCard`, `moveCards`, `reorderCardWithinColumn`,
  `bulkMove`
- **Columns:** `setColumnVisible/Collapsed/Width/Wip/AcceptFrom`,
  `moveColumn`, `setColumnSort`, `sizeColumnsToFit`
- **Filter:** `setQuickFilter`, `setCardFilter(predicate)`
- **Drag (programmatic):** `beginDrag([ids], fromColumnId)` /
  `endDrag({ toColumnId, toIndex, cancelled })` — used by the test
  harness so you don't have to synthesise pointer events
- **Persistence:** `getBoardState`, `applyBoardState`,
  `clearPersistedState`
- **Detail panel:** `openCardDetail(id)`, `closeCardDetail`,
  `isCardDetailOpen`
- **Aging / time-in-column:** `getCardEnteredAt(id)`,
  `getCardAgeInColumn(id, now?)`, `getStuckCardIds(now?)`,
  `setAgingClock(fn|null)` (replace the "now" provider for
  deterministic demos / tests)
- **Optimistic in-flight pulse:** `setCardPending(id, on=true)` adds
  a blue pulse ring; `setCardError(id, on=true, msg?)` swaps it to
  red + sets `data-card-error-msg` for tooltips; `isCardPending(id)`
  to query. Use during a save round-trip; clear on success or
  dismissal.

## Events (bubble off the board element)

- `board:ready` — `{ api }`
- `board:rendered` — fires after **every** DOM re-render. Use this to
  re-paint per-card decorations that don't fit `data-bind` (tag pills,
  hover actions, photo strips, custom avatar rows) — the card wrappers
  are recreated on each render, so paint inside this hook.
- `board:beforeMove` — **cancellable** via `ev.preventDefault()`
- `board:cardMoved`, `board:cardsMoved`
- `board:cardAdded`, `board:cardRemoved`
- `board:cardSelectionChanged`
- `board:cardClicked` / `board:cardDblClicked`
- `board:cardEditStarted` / `board:cardValueChanged` / `board:cardEditCancelled`
- `board:wipExceeded` — fires once per crossing, not per card
- `board:cardStuck` — `{ cardId, columnId, ageDays }`; fires once per
  crossing when a card sits in its column ≥ the column's
  `stuck_after_days` threshold
- `board:swimlaneChanged`, `board:filterChanged`
- `board:columnMoved/VisibleChanged/CollapsedChanged/Resized/SortChanged`
- `board:cardDetailOpened` / `board:cardDetailClosed`
- `board:fileAttached` — cancellable
- `board:columnFetchMore` (server-side mode)

## Helpers shipped on the package

```js
import { attachBulkActionToolbar } from "@ninjaai/stimulus_kanban"

attachBulkActionToolbar(boardEl, {
  minSelection: 1,
  position: "bottom",                        // or "top"
  actions: [
    { id: "move",   label: "Move to Quoting", primary: true,
      onClick: (ids, api) => api.bulkMove({ fromIds: ids, toColumnId: "quoting", toIndex: 0 }) },
    { id: "tag",    label: "Tag urgent",
      onClick: (ids, api) => api.applyTransaction({ update: ids.map(id => ({ id, urgent: true })) }) },
    { id: "delete", label: "Archive", danger: true,
      onClick: (ids, api) => api.bulkMove({ fromIds: ids, toColumnId: "archived", toIndex: 0 }) },
  ],
})
```

Returns `{ destroy(), update(), el }` so hot-reloading hosts can clean
up. The toolbar appears at the bottom of the viewport when N ≥
`minSelection` cards are selected and hides on `clearSelection`. Each
action receives `(selectedIds, boardApi, boardEl)` and can be marked
`primary: true` / `danger: true` / `disabled: (ids) => …`.

## Aging / time-in-column

```html
<li data-controller="board-column"
    data-board-column-id-value="quoting"
    data-board-column-stuck-after-days-value="3">…</li>
```

The board tracks `enteredColumnAt` per card on every set/transaction/
move. Cards in a column with a `stuck_after_days` threshold get
`data-card-stuck="true"` + `data-card-age-days="N"` on the wrapper +
the bundled CSS draws a red ring + `Nd ⚠` badge. The board emits
`board:cardStuck` once per crossing — wire it to SMS / email / Slack.

For tests / demos, swap the clock: `api.setAgingClock(() => "2026-05-26T10:00:00Z")`
so the badge math is deterministic regardless of wall clock.

## Custom card renderers

A renderer is either a `<template>` clone (data-bind markup) or a named
function from the registry:

```html
<template id="story-card">
  <article class="sk-card">
    <header>
      <span class="sk-card-key" data-bind="key"></span>
      <span data-bind="status" data-bind-attr="data-status:status"></span>
    </header>
    <h4 class="sk-card-title" data-bind="title"></h4>
  </article>
</template>

<div data-controller="board" data-board-card-renderer-value="story-card">…</div>
```

Or register a function:

```js
import { registerRenderer, renderers } from "@ninjaai/stimulus_kanban"
registerRenderer("my-card", ({ card }) => {
  const el = document.createElement("article")
  el.className = "sk-card"
  el.append(renderers.sub.statusPill(card.status, { colorMap: { open: "blue" } }))
  return el
})
```

Built-in renderer names: `story`, `task`, `bug`, `incident`, `note`,
`pr`, `support-ticket`, `lead`, `order`, `email-thread`, `image-card`,
`cover-progress`, `gantt-stub`. Sub-renderers (`statusPill`, `avatar`,
`tags`, `currency`, `percent`, `progressBar`, `relativeTime`, `dueDate`,
`countryFlag`, `attachments`, `mask`) live under `renderers.sub` for
composition.

## Patterns

- **Workflow guard:** subscribe to `board:beforeMove` and call
  `ev.preventDefault()` to refuse the drop. The optimistic move reverts
  client-side.
- **Optimistic + server reconcile:** apply the move locally
  (`moveCard`), POST to the server, then reconcile via
  `applyTransaction({ update: [...] })` with the server's authoritative
  `column_id` / `order`. The Rails companion automates this — see the
  [`stimulus-kanban-rails` skill](../stimulus-kanban-rails/SKILL.md).
  Writing a custom (non-Rails) server? The full wire format the
  `board-sync` controller expects — HTTP shapes, `X-Optimistic-Id`
  header, broadcast envelope — is documented in
  [`../stimulus-kanban-rails/COOKBOOK.md`](../stimulus-kanban-rails/COOKBOOK.md).
- **Server-side columns:** set `data-board-server-side-value="true"`,
  send one page per column via `setCardData`, send totals via
  `setColumnCounts({ colId: n })`. Watch `board:columnFetchMore` for
  scroll-loading.
- **Test programmatic drag:** in vitest, mount the board in jsdom, call
  `api.beginDrag([id], fromCol)` + `api.endDrag({ toColumnId, toIndex })`
  — no synthetic pointer events needed.
- **Painting decorations:** put paint code in a `board:rendered`
  handler. The hook fires after every render (initial, after a move,
  after `setCardData`, after a filter change), so your tag pills /
  avatars / photo thumbnails survive every state change.
- **Optimistic save UI:** `api.setCardPending(id, true)` before a fetch,
  `api.setCardPending(id, false)` on success or
  `api.setCardError(id, true, "HTTP 422: …")` on failure. The bundled
  CSS draws the pulse animations — no extra styles needed.
- **Reference demos:** the repo's `demo/` directory ships 50+ HTML
  files demonstrating every feature in isolation. Each has a Playwright
  verification script under `scripts/verify-*.mjs` proving the feature
  works. Browse them at <https://kanban.schappi.cloud/demo/>.
