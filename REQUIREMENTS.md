# stimulus_kanban — Requirements

A specification for **`stimulus_kanban`**: the Kanban-board analog of
[`stimulus_grid`](../stimulus_grid). Same philosophy, same shipping vehicles
(npm IIFE/ESM + Rails gem), same HTML-first contract — but the primitive is a
**column-of-cards board** instead of a tabular grid.

The goal of this document is to nail down scope and the public API surface
*before* any code is written, so the JS package, the demos, and the Rails
companion gem all converge on one mental model.

---

## 1. Mission

> An **HTML-first Kanban board for [Stimulus.js](https://stimulus.hotwired.dev/) (Hotwire)**.
> Drop `data-controller="board"` on a `<div>`, describe columns and cards with
> `data-*` attributes, and you get drag-and-drop between/within columns, WIP
> limits, swimlanes, filtering, global search, multi-card selection, inline
> card editing, custom card renderers **and editors**, column collapse / hide /
> reorder, virtual scrolling for huge columns, a public `boardApi` — no React,
> no build-time config object, no third-party Kanban framework.
> With the optional [`stimulus_kanban_rails`](#10-rails--hotwire-stimulus_kanban_rails)
> companion, every move/edit also **streams live to every connected client over
> Turbo Streams** (Action Cable) — optimistic updates, server-side validation,
> and undo/redo included.

The HTML is the source of truth: a `stimulus_kanban` board is a real
semantic `<ol>`/`<li>` list of columns and cards that renders without JS and
progressively enhances. The exact same DOM that the server emits is the DOM
that the controller takes over — no shadow DOM, no client-only "real model"
that diverges from what's on the page.

### Non-goals (v1)

- Gantt / timeline views (separate package).
- Calendar view (separate package).
- Nested sub-boards inside cards (use **card-detail** popovers instead — §6).
- A workflow engine. Column transitions are *visual*; business rules are
  the host app's job (validate in `card:beforeMove`, or on the server in
  the Rails companion).

---

## 2. HTML contract

The minimum boot:

```html
<link rel="stylesheet" href="dist/stimulus_kanban.css" />

<div data-controller="board"
     data-board-card-height-value="auto"
     style="height: 640px">
  <ol class="sk-columns">
    <li data-controller="board-column"
        data-board-column-id-value="todo"
        data-board-column-title-value="To do">
      <ol class="sk-cards">
        <li data-card-id="1" data-column-id="todo">Buy milk</li>
        <li data-card-id="2" data-column-id="todo">Walk dog</li>
      </ol>
    </li>
    <li data-controller="board-column"
        data-board-column-id-value="doing"
        data-board-column-title-value="Doing">
      <ol class="sk-cards">
        <li data-card-id="3" data-column-id="doing">Write spec</li>
      </ol>
    </li>
    <li data-controller="board-column"
        data-board-column-id-value="done"
        data-board-column-title-value="Done">
      <ol class="sk-cards"></ol>
    </li>
  </ol>
</div>

<script src="dist/stimulus_kanban.js"></script>
<script>StimulusKanban.start()</script>
```

Cards can be:

- **Server-rendered** as above (parsed into the dataset on connect — the
  HTML wins, the JS hydrates).
- **Loaded from a URL** via `data-board-card-data-url-value="/cards.json"`
  (one fetch, single JSON document `{ columns: [...], cards: [...] }`).
- **Set imperatively** via `element.boardApi.setCardData([...])` and
  `element.boardApi.setColumnData([...])`.

### Card body markup

A card is *any* element with `data-card-id` inside a column's `.sk-cards`
list. The default renderer treats the card's existing innerHTML as the
display content (so server-rendered Markdown / partial templates work
as-is). To opt into a registered renderer, set
`data-card-renderer="<name>"` on the card or
`data-board-column-card-renderer-value="<name>"` on the column.

---

## 3. Board attributes (`data-board-*-value`)

| Attribute | Meaning |
|---|---|
| `card-data-url` | URL returning `{ columns: [...], cards: [...] }` |
| `card-selection` | `""` \| `"single"` \| `"multiple"` |
| `card-multi-select-with-click` | multi-select on plain click (no modifier) |
| `suppress-card-click-selection` | don't select on card click |
| `card-height` | `"auto"` \| pixel number (uniform rows enable virtualisation) |
| `column-width` | default pixel width per column (default `280`) |
| `gap` | pixel gap between columns and between cards (default `8`) |
| `virtual` / `virtual-threshold` | force virtual scrolling inside a column / auto-on cards-per-column threshold |
| `height` | CSS height of the board viewport (e.g. `"640px"`) |
| `get-card-id` | card-object field used as identity (default `id`) |
| `get-column-id` | card-object field that holds the *current* column id (default `column_id`) |
| `dom-layout` | `""` \| `"autoHeight"` |
| `server-side` | server-side card model: `setCardData` represents the currently-loaded window; column counts come from `setColumnCounts` |
| `swimlane-field` | card field used to bucket every column horizontally into swimlanes (e.g. `"assignee_id"`, `"epic"`) |
| `swimlane-display` | `"row"` (default, horizontal bands) \| `"collapsed"` (collapsible group rows) |
| `wip-limits` | JSON map `{ columnId: number }` overlaid on `data-board-column-wip-value` |
| `quick-filter` | initial value of the global card search |
| `card-renderer` | board-wide default renderer name |
| `card-editor` | board-wide default editor template id |
| `drag-handle-selector` | CSS selector for the drag handle inside a card (default: whole card draggable) |
| `read-only` | disable drag/drop, inline edit, add-card, column reordering |
| `persist-key` | when non-empty, auto-save/restore column order, widths, collapse state, hidden columns, swimlane, quick filter, sort to `localStorage["skanban:" + persistKey]` |
| `add-card` / `add-column` | `true` to render the inline "+ Add card" / "+ Add column" affordances (default `false`) |
| `accept-files` | drag-to-attach: dropping files on a card dispatches a cancellable `board:fileAttached` event |

---

## 4. Column attributes (`data-board-column-*-value`, on each column root)

| Attribute | Meaning |
|---|---|
| `id` | stable column id; matches `card.column_id` |
| `title` | header text |
| `wip` | integer WIP limit; over-limit columns get a `data-over-wip` state and `board:wipExceeded` fires |
| `min-count` | optional minimum (e.g. backlog should never be empty) — purely advisory |
| `width` | per-column override of the board `column-width` |
| `collapsed` | render the column in its collapsed (icon + count) form |
| `hidden` | exclude from the layout (still tracked in the API) |
| `accept-cards-from` | JSON array of column ids — restrict which columns can drop into this one |
| `disallow-drag` | cards in this column can't be picked up (read-only column) |
| `sort` | `"manual"` (default) \| `"asc:<field>"` \| `"desc:<field>"` — server-supplied ordering replaces user drag-sort |
| `card-renderer` | column-level renderer override |
| `card-editor` | column-level editor template id |
| `add-card-label` | per-column "+ Add card" label override |
| `color` | accent color (any CSS value); applied to the header band |
| `icon` | icon name (matches the built-in icon set used by status pills) |

A column can be **synthetic** (computed by the board, e.g. swimlane group
rows) — synthetic columns set `data-synthetic="true"` and are excluded
from `getColumnData()` and persistence.

---

## 5. Card attributes (`data-card-*`)

Cards are data-bearing rows in the column lists. The minimum is just
`data-card-id`; everything else is optional metadata for rendering,
filtering, sorting, and drag rules.

| Attribute | Meaning |
|---|---|
| `data-card-id` | stable identity |
| `data-column-id` | current column membership (must match a `board-column` id) |
| `data-card-order` | numeric sort key within the column (server-emitted) |
| `data-card-renderer` | per-card renderer override |
| `data-card-editor` | per-card editor template id |
| `data-card-locked` | `"true"` to forbid drag + edit |
| `data-card-swimlane` | swimlane bucket (overrides the `swimlane-field` lookup) |
| `data-card-color` | accent color for the card's left rail |

The rest of the card's data lives in attributes on its descendants — same
binding model as `stimulus_grid` renderers (`data-bind`, `data-bind-text`,
`data-bind-attr`) — or in a single JSON payload on
`data-card-json` for renderers that prefer one object.

---

## 6. Public API — `element.boardApi`

Available after the `board:ready` event. Highlights:

- **Data:** `setCardData(cards)`, `getCardData()`, `setColumnData(cols)`,
  `getColumnData()`, `applyTransaction({add, update, remove, move})`,
  `setColumnCounts({colId: total})` / `getColumnCounts()` (server-side)
- **Card selection:** `getSelectedCardIds()`, `getSelectedCards()`,
  `selectCard(id)`, `deselectCard(id)`, `selectAllInColumn(colId)`,
  `clearSelection()`
- **Movement:** `moveCard(cardId, { toColumnId, toIndex })`,
  `moveCards([cardId], target)` (multi-move preserves order),
  `reorderCardWithinColumn(cardId, toIndex)`,
  `bulkMove({fromIds, toColumnId, toIndex})`
- **Columns:** `setColumnVisible(colId, visible)`,
  `setColumnCollapsed(colId, collapsed)`, `setColumnWidth(colId, px)`,
  `moveColumn(colId, toIndex)`, `setColumnWip(colId, limit)`,
  `setColumnAcceptFrom(colId, [otherIds])`, `sizeColumnsToFit()`
- **Swimlanes:** `setSwimlaneField(field)`, `getSwimlaneField()`,
  `setSwimlaneCollapsed(value, collapsed)`,
  `getSwimlaneCollapsedSet()`
- **Sort within column:** `setColumnSort(colId, 'manual'|'asc:<f>'|'desc:<f>')`,
  `getColumnSort(colId)`
- **Filter & search:** `setQuickFilter(q)`, `getQuickFilter()`,
  `setCardFilter(predicate)`, `getCardFilter()`
- **Editing:** `startEditingCard(cardId)`, `commitEditing()`, `cancelEditing()`
- **Drag programmatic:** `beginDrag(cardIds, fromColumnId)`,
  `endDrag({toColumnId, toIndex, cancelled})` — wraps the same code path
  as a real pointer drag, so tests don't need synthetic pointer events
- **WIP:** `getWipState()` returns `[{colId, count, limit, over}]`
- **Persistence:** `getBoardState()` (JSON-safe), `applyBoardState(state)`,
  `clearPersistedState()`, `getPersistKey()`
- **Export:** `getDataAsJson()`, `getDataAsCsv({columns, swimlanes})`
- **Detail panel:** `openCardDetail(cardId)`, `closeCardDetail()`,
  `isCardDetailOpen()` — opens an anchored popover or right-rail
  panel cloned from a `<template id="card-detail-tpl">` (same template
  contract as `stimulus_grid`'s master/detail)

---

## 7. Events (dispatched on the board element)

All events bubble. Each one carries enough data in `detail` for an undo
log entry, so a host app can keep its own audit trail without re-querying
state.

| Event | `detail` |
|---|---|
| `board:ready` | `{ api }` |
| `board:cardDataChanged` | `{ cards }` |
| `board:columnDataChanged` | `{ columns }` |
| `board:cardClicked` | `{ cardId, card, columnId, originalEvent }` |
| `board:cardDblClicked` | `{ cardId, card, columnId }` |
| `board:cardSelectionChanged` | `{ selectedCardIds }` |
| `board:cardEditStarted` | `{ cardId }` |
| `board:cardValueChanged` | `{ cardId, oldCard, newCard }` |
| `board:cardEditCancelled` | `{ cardId }` |
| `board:beforeMove` | `{ cardIds, fromColumnId, toColumnId, toIndex }` — **cancellable** with `preventDefault()`; the host app's hook for workflow rules |
| `board:cardMoved` | `{ cardId, fromColumnId, toColumnId, fromIndex, toIndex }` |
| `board:cardsMoved` | `{ cardIds, fromColumnId, toColumnId, toIndex }` (multi-move) |
| `board:cardAdded` / `board:cardRemoved` | `{ cardId, columnId, card }` |
| `board:columnMoved` | `{ columnId, fromIndex, toIndex }` |
| `board:columnVisibleChanged` / `board:columnCollapsedChanged` / `board:columnResized` | `{ columnId, ... }` |
| `board:columnSortChanged` | `{ columnId, sort }` |
| `board:wipExceeded` | `{ columnId, count, limit }` (fires once per crossing) |
| `board:filterChanged` | `{ quickFilter, predicate }` |
| `board:swimlaneChanged` | `{ swimlaneField }` |
| `board:boardStateApplied` | `{ state }` (after `applyBoardState` / restore) |
| `board:cardDetailOpened` / `board:cardDetailClosed` | `{ cardId, card, panelEl }` |
| `board:fileAttached` | `{ cardId, files, card, dataTransfer }` — cancellable |

```js
board.addEventListener("board:ready", (e) => e.detail.api.setCardData(cards))
board.addEventListener("board:beforeMove", (e) => {
  if (e.detail.toColumnId === "done" && !canMarkDone(e.detail.cardIds)) {
    e.preventDefault()
  }
})
board.addEventListener("board:cardMoved", (e) => save(e.detail))
```

---

## 8. Custom card renderers & editors (via `<template>`)

Same shape as `stimulus_grid`:

```html
<template id="story-card">
  <article class="sk-card story">
    <header>
      <span class="sk-card-key" data-bind="key"></span>
      <span class="status" data-bind="status" data-bind-attr="data-status:status"></span>
    </header>
    <h4 class="sk-card-title" data-bind="title"></h4>
    <footer>
      <span class="sk-card-points" data-bind="points"></span>
      <img class="sk-card-avatar" data-bind-attr="src:assignee_avatar"
           data-bind-attr="alt:assignee_name" />
    </footer>
  </article>
</template>

<template id="story-editor">
  <form class="sk-card-editor">
    <input data-editor-input data-editor-field="title" />
    <select data-editor-field="points">
      <option>1</option><option>2</option><option>3</option><option>5</option>
    </select>
    <button data-editor-commit>Save</button>
    <button data-editor-cancel type="button">Cancel</button>
  </form>
</template>

<div data-controller="board"
     data-board-card-renderer-value="story-card"
     data-board-card-editor-value="story-editor">…</div>
```

- **Renderer**: clones the template per card. `data-bind="field"` →
  element text = `card.field`; `data-bind-text` → formatted; `data-bind-attr`
  → set attribute. Returning nothing means the renderer mutated the cloned
  node directly.
- **Editor**: clones on edit. Inputs marked `[data-editor-field="<f>"]`
  are seeded from the card and read back into `{ field: value }` on
  commit. Enter / Tab commit; Esc cancels; the editor's
  `[data-editor-commit]` / `[data-editor-cancel]` buttons trigger the
  same handlers.

---

## 9. Built-in card renderers

A library of named renderers ships pre-registered, mirroring the
`stimulus_grid` list. Cards can mix-and-match these for sub-elements
without hand-writing a `<template>`. Referenced via
`data-board-column-card-renderer-value` or programmatically through
`registerRenderer(name, fn)`.

| Renderer | Use for |
|---|---|
| `story` | title + key + status pill + assignee + points |
| `task` | title + checkbox completion + due date |
| `bug` | title + severity badge + reporter avatar |
| `incident` | title + priority + paging count + time-since-open |
| `note` | freeform text card with author + relative time |
| `pr` | PR title + repo + reviewer avatars + CI dot + diff stats |
| `support-ticket` | subject + customer + channel icon + SLA countdown |
| `lead` | name + company + value (currency) + stage |
| `order` | order # + status pill + total + items count |
| `email-thread` | subject + sender + snippet + unread dot |
| `image-card` | hero image + caption (with `clickToZoom`) |
| `cover-progress` | hero image + bottom progress bar (campaign assets) |
| `gantt-stub` | label + due-window bar (visual only — no real timeline) |

Sub-renderers reused from the grid (`statusPill`, `avatar`, `tags`,
`currency`, `percent`, `progress-bar`, `relative-time`, `due-date`,
`country-flag`, `attachments`, `mask`) are exposed from the same
`renderers` namespace so a custom card can compose them.

---

## 10. WIP limits & swimlanes

**WIP limits** are declared per column. When a column's visible card count
> `wip`, the column gains `data-over-wip`, the header gets a red badge,
and `board:wipExceeded` fires (debounced — once per crossing, not per
card). Limits are *advisory*: the board does not refuse the drop. To
enforce, the host app cancels in `board:beforeMove`.

**Swimlanes** bucket every column horizontally by a card field —
typically `assignee_id`, `epic`, or `priority`. With
`swimlane-field="assignee_id"` and three assignees, the board renders
three horizontal bands; each column still spans the full board width,
but each band contains only that assignee's cards. Drag respects the
band: dropping into a different band reassigns the field, firing
`board:cardValueChanged` with the old/new card.

Swimlane headers can be collapsed (per-value, persisted) and labelled
with a renderer (`swimlane-renderer` attribute → name of a registered
function taking `(value, count) => Element`).

---

## 11. Drag & drop, keyboard, multi-select

- **Pointer drag** is HTML5 DnD-first with a pointer-events fallback for
  touch. Drag-handle CSS selector is configurable.
- **Auto-scroll** kicks in near board edges (column-list horizontal
  scroll) and column edges (card-list vertical scroll).
- **Drop indicator** is a 2 px insertion bar between cards, not a
  highlight on the drop target — easier to read at speed.
- **Cancel** with Esc *during* drag — fires `board:beforeMove` with
  `cancelled: true` and reverts the optimistic DOM.
- **Multi-card drag**: `Cmd/Ctrl+click` adds to selection; dragging any
  selected card moves the whole set as a stack, preserving relative
  order. The dragged stack shows a count badge.
- **Keyboard nav**:
  - `↑/↓` move active card within column;
  - `←/→` move active card across columns;
  - `Cmd/Ctrl+↑/↓/←/→` actually moves the card (fires
    `board:beforeMove` → `board:cardMoved`);
  - `Enter` opens the card detail / editor;
  - `Space` toggles selection;
  - `Cmd/Ctrl+A` selects all cards in the active column;
  - `Cmd/Ctrl+C` / `Cmd/Ctrl+V` copy / paste cards as JSON.

---

## 12. Filter, search, sort

- **Quick filter** (`data-board-quick-filter-value` or `setQuickFilter`)
  matches against the card's title + all string fields; non-matching
  cards are visually dimmed *or* hidden (`data-board-filter-mode-value`:
  `"dim"` vs `"hide"`; default `"hide"`).
- **Predicate filter** (`setCardFilter(card => boolean)`) for app-driven
  rules ("only my cards", "due this week").
- **Per-column sort** via `data-board-column-sort-value` — `"manual"`
  preserves user drag order; `"asc:<field>"` / `"desc:<field>"` keeps
  the column auto-sorted and disables intra-column drag (cards can still
  move *between* columns).
- **Highlight** matched text in the card title via the same `highlight`
  renderer used in the grid.

---

## 13. Persistence

`persist-key` round-trips through `localStorage["skanban:" + key]`. The
snapshot covers:

- column order, widths, collapse state, visibility, WIP overrides;
- swimlane field + per-value collapse state;
- per-column sort mode;
- quick filter string;
- expanded card-detail card id (session-scoped → off by default);
- read-only toggle.

It deliberately **does not** persist the card-data window itself (server
is the source of truth) or per-card drag positions (those live on the
cards via `data-card-order`, set by the host app on the server).

Writes debounced 200 ms, flushed on `beforeunload`. Restore broadcasts
one `board:boardStateApplied` event after layout.

---

## 14. Virtual scrolling

A single column can blow past 1,000 cards (incidents queue, support
inbox, lead backlog). With `card-height` set to a fixed pixel value
*and* the column passing the `virtual-threshold` (default `200`), each
column virtualises its card list independently, recycling DOM nodes on
scroll. Variable-height cards fall back to non-virtual rendering for
that column — same trade-off as the grid.

Cross-column drag works against the virtual viewport: dragging out
of/into a virtualised column auto-scrolls and resolves drop indices
against the logical list, not the rendered window.

---

## 15. Card detail panel

A heavier edit surface than the inline editor — comments, history,
sub-tasks, custom forms. Two layout options:

- **`detail-layout="popover"`** (default): anchored to the card, click-out
  / Esc to close.
- **`detail-layout="rail"`**: slides in from the board's right edge,
  pushing columns. Width via `data-board-detail-width-value`.

Content cloned from `<template id="<card-detail-tpl>">` referenced by
`data-board-card-detail-template-value`. Bindings work the same as
renderers (`data-bind`, `data-bind-attr`, `data-detail-if`). Commits via
`applyTransaction` and fires `board:cardValueChanged`.

---

## 16. Drag-to-attach

Drop files anywhere on a card to dispatch `board:fileAttached` (cancellable).
If the host doesn't `preventDefault`, file metadata is appended to
`card[attachments-field]` (default `attachments`) — identical contract
to the grid. Per-column opt-out via `data-board-column-accept-files-value="false"`.

---

## 17. Server-side card model

For boards bigger than the browser wants in memory, the host can run
**server-side**:

- The server returns one **window per column** — e.g. the top 50 cards
  per column, total count separately.
- The board renders those windows, shows a `+N more …` pill at the
  bottom of any column that has been windowed.
- Scrolling near the bottom of a windowed column dispatches
  `board:columnFetchMore` (`{ columnId, loadedCount, totalCount }`) for
  the host to load and `applyTransaction` more rows.
- Drag-and-drop emits `board:beforeMove` *before* updating the local
  DOM, so the server can authoritatively assign the new `card.order` and
  echo it back via Turbo Stream — see §18.

Filter/search and per-column sort in server-side mode are sent to the
server (`board:filterChanged` fires with `{ quickFilter, predicate }`; the
host translates and re-fetches).

---

## 18. Rails & Hotwire (`stimulus_kanban_rails`)

A Rails engine, parallel to `stimulus_grid_rails`. Turns the board into
a **server-driven, multi-user editable** board over Turbo Streams +
Action Cable.

**Capabilities**

- **Live multi-user moves & edits** — every move / create / update /
  destroy broadcasts card-grained Turbo Stream actions to all connected
  tabs.
- **Optimistic card moves** — a dropped card pulses pending (blue),
  reconciles green / reverts red; `X-Optimistic-Id` echo-suppression for
  the originator.
- **Server-side column registry** — per-column `wip`, `accept_from`,
  `sort`, `editable` (boolean *or* lambda), authorisation lambda.
- **Server-side card schema** — per-field `type`, `editable`, `editor`,
  `validate`, `concurrency`, `computed`/`depends_on`.
- **Workflow hooks** — `before_move(card, from:, to:, user:)` raises to
  veto; clients see `board:beforeMove` → `revert` round-trip.
- **Concurrency** — version-checked moves (`lock_version` → conflict
  revert), per-field validation.
- **Bulk operations** — multi-card move, bulk archive, undo/redo backed
  by a server-side audit log (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- **Multi-tenancy & auth** — tenant-scoped streams (ActsAsTenant), scoped
  card lookups, auth inherited from `parent_controller`.
- **Scale** — server-side global search, server-side per-column window
  for 50–100K+ cards.

**Install (sketch)**

```bash
bundle add stimulus_kanban_rails
```

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusKanban from "stimulus_kanban"
import StimulusKanbanRails from "stimulus_kanban_rails"

const application = Application.start()
StimulusKanban.start(application)        // board, board-column, card-editor, …
StimulusKanbanRails.start(application)   // board-sync + Turbo Stream actions
```

```ruby
# config/routes.rb
mount ActionCable.server => "/cable"
mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path # default "/boards"
```

```ruby
# app/boards/sprint_board.rb
class SprintBoard < StimulusKanbanRails::Board
  resource :stories
  model    Story
  stream_name { |_user| "sprint:current" }

  column :backlog, title: "Backlog"
  column :todo,    title: "To do",  wip: 5
  column :doing,   title: "Doing",  wip: 3, accept_from: %i[todo backlog]
  column :review,  title: "Review", wip: 2, accept_from: %i[doing]
  column :done,    title: "Done",   accept_from: %i[review]

  card_field :title,  type: :string,  editable: true
  card_field :points, type: :integer, editable: true,
                      validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
  card_field :assignee_id, type: :integer, editable: ->(_card, user) { user&.lead? }

  before_move ->(card, from:, to:, user:) {
    raise StimulusKanbanRails::Veto, "Story must have points" if to == :doing && card.points.blank?
  }
end
```

```ruby
# app/models/story.rb
class Story < ApplicationRecord
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }
  self.locking_column = :lock_version
end
```

```erb
<%= render partial: "stimulus_kanban_rails/boards/board",
           locals: { board: SprintBoard.new(user: current_user),
                     cards: Story.current_sprint.order(:column_id, :position),
                     card_selection: "multiple" } %>
```

Undo/redo + audit log opt-in via the bundled migration
(`bin/rails stimulus_kanban_rails:install:migrations && bin/rails db:migrate`).

---

## 19. Distribution

Same three install paths as `stimulus_grid`:

- **Option A — plain `<script>`**: self-contained IIFE bundle with
  Stimulus included; CDN-loadable. `dist/stimulus_kanban.js` +
  `dist/stimulus_kanban.css`.
- **Option B — npm + bundler**: `npm install @ninjaai/stimulus_kanban
  @hotwired/stimulus`; Stimulus is a peer dependency.
  `StimulusKanban.start(app?)` registers all controllers and returns
  the application.
- **Option C — Rails / Hotwire (gem)**: `bundle add stimulus_kanban_rails`;
  importmap pins auto-registered, CSS shipped from the engine, no JS
  build step.

Stimulus controllers registered: `board`, `board-column`, `card`,
`card-editor`, `swimlane-header`, `column-menu`. (Mirrors the
`grid`, `header-cell`, `cell`, `pagination`, `side-panel`,
`filter` set in `stimulus_grid`.)

---

## 20. Project layout (target)

```
stimulus_kanban/
├── README.md
├── DESIGN.md                      # architecture + full API reference
├── REQUIREMENTS.md                # this file
├── package.json
├── vite.config.js                 # demo dev server
├── vite.lib.config.js             # IIFE + ESM bundle
├── vitest.config.js
├── src/
│   ├── index.js
│   ├── controllers/
│   │   ├── board_controller.js
│   │   ├── board_column_controller.js
│   │   ├── card_controller.js
│   │   ├── card_editor_controller.js
│   │   ├── swimlane_header_controller.js
│   │   └── column_menu_controller.js
│   ├── lib/
│   │   ├── api.js                 # public boardApi
│   │   ├── dom.js                 # DOM helpers, drag overlay
│   │   ├── model.js               # card/column/swimlane reducers
│   │   ├── dnd.js                 # pointer + HTML5 DnD, auto-scroll, indicator
│   │   ├── virtual.js             # per-column virtualisation
│   │   └── renderers.js           # built-in card renderers
│   └── styles/
│       └── stimulus_kanban.css
├── dist/                          # built artefacts (gitignored except for releases)
├── demo/                          # 30+ HTML pages, vite-served
│   ├── 01-basic.html
│   ├── 02-json-data.html
│   ├── 03-drag-drop.html
│   ├── 04-multi-select-drag.html
│   ├── 05-wip-limits.html
│   ├── 06-swimlanes-assignee.html
│   ├── 07-card-editor.html
│   ├── 08-custom-renderer-story.html
│   ├── 09-keyboard-nav.html
│   ├── 10-quick-filter.html
│   ├── 11-server-side-window.html
│   ├── 12-virtual-1000-cards.html
│   ├── 13-card-detail-popover.html
│   ├── 14-card-detail-rail.html
│   ├── 15-persisted-state.html
│   ├── 16-read-only-board.html
│   ├── 17-add-card-add-column.html
│   ├── 18-accept-from-rules.html
│   ├── 19-cancellable-before-move.html
│   ├── 20-incident-board-renderer.html
│   ├── 21-pr-review-board.html
│   ├── 22-support-inbox-board.html
│   ├── 23-leads-pipeline-currency.html
│   ├── 24-image-cards-clickToZoom.html
│   ├── 25-drag-to-attach-files.html
│   └── …
├── test/                          # Vitest specs
│   ├── model.spec.js
│   ├── dnd.spec.js
│   ├── api.spec.js
│   └── renderers.spec.js
├── docs/
│   └── images/                    # README screenshots
├── gem/
│   ├── stimulus_kanban_rails/     # the Rails engine
│   │   ├── app/
│   │   ├── config/
│   │   ├── db/migrate/            # opt-in audit log
│   │   ├── lib/stimulus_kanban_rails/
│   │   ├── stimulus_kanban_rails.gemspec
│   │   └── README.md
│   └── demo/                      # runnable Rails app
└── skills/
    ├── stimulus-kanban-js/        # LLM-oriented usage skill
    └── stimulus-kanban-rails/
```

---

## 21. Tests & CI

- **JS**: Vitest covers the model (move/sort/swimlane reducers), the
  `boardApi`, the renderers, and the DnD state machine via the
  `beginDrag` / `endDrag` programmatic harness (no synthetic pointer
  events needed).
- **Rails engine**: `bin/rails test` covers models, channel actions,
  Turbo Stream payloads, audit log, before-move vetoes, and concurrency
  conflicts.
- Both run on every push / PR via GitHub Actions, same matrix as
  `stimulus_grid`.

---

## 22. Acceptance criteria for v1

A v1 ships when:

1. **HTML-first contract.** A server-rendered `<ol>` of columns and `<li>`
   cards is fully usable with JS disabled (no drag, but cards visible
   and clickable as links if the host wrapped them).
2. **Drag & drop** between and within columns works on desktop pointer +
   touch; multi-card drag preserves order; cancellable
   `board:beforeMove`; auto-scroll on board / column edges; insertion-bar
   drop indicator.
3. **Keyboard** parity for everything drag does, plus selection nav.
4. **WIP limits** show visual state + fire `board:wipExceeded` exactly
   once per crossing.
5. **Swimlanes** by any card field; per-value collapse; drag across bands
   reassigns the field and emits `board:cardValueChanged`.
6. **Inline editor** via `<template>` works on Enter / Tab / blur; Esc
   cancels.
7. **Card detail** popover *and* rail layouts both ship; clone from
   template; commit via `applyTransaction`.
8. **Renderers**: at least 12 built-in card renderers (§9) plus the
   custom `<template>` path; sub-renderer composition documented.
9. **Quick filter + per-column sort + persisted state** all working and
   round-tripping through `localStorage` with one `persist-key`.
10. **Virtualisation** kicks in automatically over the configured
    threshold with fixed `card-height`, and degrades gracefully for
    variable-height cards.
11. **Server-side card model**: one fetch per column-window, scroll-to-load,
    server-assigned card order on move.
12. **Rails companion gem** ships parallel to JS package, importmap-pinned,
    publishes Turbo Stream actions on every move/edit; demo app in
    `gem/demo` covers the sprint-board scenario end-to-end.
13. **Demos**: 25+ HTML pages, vite-served, covering each capability
    above plus 6+ industry scenarios (incidents, PRs, support, leads,
    image cards, file-drop).
14. **Tests** green on CI for both the JS package and the Rails engine.
15. **Docs**: `README.md` follows the `stimulus_grid` shape (Install,
    Quick start, Board attributes, Column attributes, Public API,
    Events, Renderers, Rails section), `DESIGN.md` covers the model
    reducers and DnD state machine, `skills/` holds two LLM usage guides
    (JS, Rails).
