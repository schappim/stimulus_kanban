# stimulus_kanban — design notes

Architecture, model reducers, DnD state machine, and the integration
contracts between layers. Keep this open alongside `REQUIREMENTS.md`
and the source.

## Mental model

> An `<ol>` of columns (`<li data-controller="board-column">`), each
> containing an `<ol>` of cards (`<li data-card-id="…">`). The board
> controller mounts an enhancement layer (drag, keyboard, edit, sync)
> on top of that pre-rendered DOM. The model layer is a pile of pure
> reducers; the controller layer is the only place that touches the DOM
> or fires events.

This separation is load-bearing:

- **Pure model** (`src/lib/model.js`) — `move`, `applyTransaction`,
  `buildDisplayList`, `applyColumnSort`, etc. No `document`. Runs in
  `node` (no jsdom). 50+ of the 53 tests in the suite hit this layer
  exclusively.
- **DOM helpers** (`src/lib/dom.js`) — `el`, `setAttrs`, `cloneTemplate`,
  `emit`, `applyBindings`. Tiny, no Stimulus dependency.
- **DnD machine** (`src/lib/dnd.js`) — owns the pointer state machine,
  takes a hooks object from the controller; doesn't touch state.cards.
- **Virtualisation** (`src/lib/virtual.js`) — per-column DOM recycling.
- **Renderers** (`src/lib/renderers.js`) — registry + 13 built-in cards
  + a `sub` namespace for composition.
- **Controllers** (`src/controllers/*`) — the only place that knows
  about Stimulus. The board controller is the orchestrator; the five
  others are thin per-element adapters.

## Display-list pipeline

`buildDisplayList({ cards, columns, options })` is the model's render
contract. It walks:

```
cards
  → applyQuickFilter         (skips structural fields: id, column_id, order, __*)
  → applyPredicate           (host's setCardFilter)
  → bucketBySwimlane         (if swimlaneField is set, else single bucket)
  → cardsInColumn × columns  (drop visible-column matrix)
  → applyColumnSort          ('manual' | 'asc:<f>' | 'desc:<f>')
```

Result:

```js
{
  columns:   [{ col, cards: [...] }, ...],
  swimlanes: [{ value, label, columns: [{col, cards}, ...] }, ...] | null,
  filtered:  [...]
}
```

The controller's `_renderNow()` consumes this. Swimlane mode renders one
`<li class="sk-swimlane">` per bucket, each containing the same set of
columns.

## Move semantics

Two reducers — `moveCard` (single) and `moveCards` (multi) — both:

1. Find the moving card(s) in the input list.
2. Partition the remaining cards into per-column lists, sorted by
   `order`.
3. Insert the pile at the requested `toIndex` of the target column's
   list.
4. Re-sequence the `order` of every column they touched so the indices
   stay contiguous.

Returning a *new* array is deliberate — the controller compares
references for downstream decisions, and React-style immutability makes
test diffs trivial.

Multi-move preserves the input pile's cross-column order: cards 1, 4 from
two different source columns land in the target column at `toIndex,
toIndex+1` in that order.

## Transaction shape

`applyTransaction({ add, update, remove, move })` is the single
mutation path:

- `remove` runs first so an `update` of the just-removed id is silently
  dropped (caller hopefully didn't intend it).
- `update` merges into existing cards, preserving the stringified id
  (host updates often pass a numeric `id: 1` but the model carries
  `'1'`; we don't let the merge silently re-type it).
- `add` is idempotent against existing ids (no-op).
- `move` runs each entry through `moveCard` so the relative-index
  semantics are identical to drag.

## DnD state machine

```
   idle  ──dragstart──►  dragging ──dragover (computeDropIndex)──► dragging
                            │                                          │
                            └─drop / dragend───────────────────────────┘
                                            │
                                            ▼
                                    _finishDrop ──► hooks.onDrop
                                            │
                                            ▼
                                        _cleanup
```

HTML5 DnD is the primary path on desktop. On touch the
`pointerdown/move/up/cancel` events drive a parallel machine that
mirrors the same lifecycle and ends in the same `hooks.onDrop({…})`
call. The controller passes hooks (one per concern):

- `isColumnDisallowDrag(colId)` — short-circuit at dragstart
- `canAcceptDrop(fromColId, toColId)` — gates `accept_from` rules
- `expandSelection(id, fromColId)` — multi-card drag expansion
  (cross-column selections are split)
- `onDragStart` / `onDrop` — the integration points

Drop indicator is a `<li class="sk-drop-indicator">` inserted between
cards (or at the end of an empty column). Indicator-as-DOM rather than
absolute-positioned-overlay survives scrolling and the per-column
`overflow: hidden`. The cost: one DOM node move per `dragover` —
negligible at human input rates.

Auto-scroll runs on `requestAnimationFrame` while `state.dragging` is
true. Velocity is linear in distance-to-edge, clamped to
`SCROLL_VELOCITY_MAX`. Cleared on drop / dragend / pointerup /
pointercancel / Esc.

## Programmatic drag harness

The spec calls out `beginDrag([ids], fromColumnId)` /
`endDrag({ toColumnId, toIndex, cancelled })` as a test path. The DnD
module exposes both — they take the same code path as a real pointer
drag (the hooks fire, the model mutates, `board:cardMoved` emits) but
they don't touch the DOM event loop. The suite uses them so we never
have to synthesise pointer events in jsdom.

## Virtualisation

Triggered when a column passes `shouldVirtualise({ cardCount,
threshold, cardHeight, virtual })`:

- `virtual: true` → always virtualise
- `virtual: false` → never
- otherwise: only if `cardHeight` is finite & `cardCount ≥ threshold`

`createVirtualColumn` keeps two spacer `<li>`s at the top and bottom of
the cards list; the active band is rendered into the middle. Recycling
is one `replaceChildren` per scroll tick (rAF-throttled by the browser's
own scroll event coalescing). Cross-column drag against a virtualised
column still resolves logical indices via `indexToY` / `yToIndex`.

Variable-height cards (`card-height: "auto"`) deliberately *do not*
virtualise — keeping the math simple is a trade-off we don't fight.
Hosts with auto-height cards in big columns can pick a uniform pixel
height per column.

## Renderer registry

`registerRenderer(name, fn)` adds a function-shaped renderer. The board
resolves a card's renderer in this order:

1. `card.__renderer` (read from `data-card-renderer="…"` on the source
   `<li>`)
2. `column.card_renderer` (`data-board-column-card-renderer-value`)
3. `board.cardRendererValue` (`data-board-card-renderer-value`)
4. Default fallback chrome (`title` on `<article class="sk-card">`)

For each name we check the `<template id="…">` first — host apps
typically prefer template binding (`data-bind`, `data-bind-attr`) for
shaped cards. Only when no matching template exists do we fall through
to `getRenderer(name)`.

## Selection + keyboard

`activeCardId` + `activeColumnId` track the focused card.
`state.selection` is a `Set<id>` — single mode replaces, multiple mode
toggles. Decorations (`.sk-card-active`, `.sk-card-selected`,
`aria-selected`) are reapplied via `_refreshSelectionDecorations()`
without a full re-render, so the user's focus survives selection
changes.

Keyboard handler short-circuits when the event target is inside a
`.sk-card-editor` — the editor controller owns Enter / Tab / Esc.

## Persistence

`getBoardState()` snapshots the board into a JSON-safe object: column
order, per-column width/collapsed/hidden/wip/sort, swimlane field +
collapsed bands, quick filter, read-only flag.
`applyBoardState(state)` is the inverse. Both round-trip cleanly.

Auto-save is 200 ms debounced on every state-changing render; flush on
`beforeunload` is intentionally *not* wired (the timer is short enough
that an unmount usually wins anyway, and we want the unhappy-path of a
crashed tab to leave a sane snapshot, not a half-written one).

## Server-side card model

`data-board-server-side-value="true"` switches the column count source.
Instead of computing counts from the loaded cards, the board reads from
`state.columnCounts` (set by the host via `setColumnCounts({ colId:
total })`). A "+N more…" pill appears at the bottom of any column whose
total exceeds its loaded count, and clicking fires
`board:columnFetchMore` for the host to load + applyTransaction more
rows.

## Card detail panel

Two layouts share one template + one event surface. `popover` clones
the template and positions it `fixed` next to the card; `rail` appends
it to the board element as `position: absolute; right: 0`. Both fire
`board:cardDetailOpened` / `board:cardDetailClosed`. Click-outside
dismisses both.

## Inline editor

Three-way contract:

1. **The card** declares an editor via `data-card-editor="<tpl-id>"`,
   the column declares one via `data-board-column-card-editor-value`,
   or the board declares a default via `data-board-card-editor-value`.
2. **The template** is cloned into the card on dblclick / Enter / API
   call; each `[data-editor-field="<f>"]` is seeded from
   `card[<f>]`.
3. **The card-editor controller** wires Enter / Tab to commit,
   `[data-editor-commit]` / `[data-editor-cancel]` clicks, and a
   `focusout` (outside the editor) to commit idiomatically.

Commit reads every `[data-editor-field]` back into `{ field: value }`
and runs `applyTransaction({ update: [...] })`. Cancel restores the
original card via a full re-render.

## Rails integration

The companion gem `stimulus_kanban_rails` wraps three concerns:

- A **Board DSL** (`column`, `card_field`, `before_move`, `stream_name`,
  `resource`, `model`) — the canonical declaration of a board's
  schema + workflow.
- A **Broadcastable concern** on AR models that fires a tenant-scoped
  Turbo Stream per commit. The streamables list is built from
  `StimulusKanbanRails.streamables_for(resource, stream)` so the
  broadcaster + subscriber always agree.
- A **board-sync** Stimulus controller (JS) that POSTs
  `board:cardMoved` + `board:cardValueChanged` to the cards endpoint
  and applies inbound stream events via `boardApi.applyTransaction`.

The Rails layer is intentionally optional. The JS package works
standalone; the gem just supplies the server-side schema, the
broadcast plumbing, and the optimistic + reconcile loop.
