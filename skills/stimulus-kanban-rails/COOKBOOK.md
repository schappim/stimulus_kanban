---
name: stimulus-kanban-rails-cookbook
description: Wire-format reference + first-time integration recipe for stimulus_kanban_rails. Read this whenever you need exact HTTP request/response shapes, broadcast envelope, optimistic-id reconciliation, schema requirements, or you're debugging why a fresh integration didn't work first time. Companion to skills/stimulus-kanban-rails/SKILL.md.
---

# stimulus_kanban_rails — wire-format cookbook

This file is the **load-bearing spec** for the Rails ↔ JS contract. The
companion [`SKILL.md`](./SKILL.md) gives the high-level setup story; this
file is what you read when the bytes on the wire matter.

If you're integrating into a fresh Rails app and want to get to a working
two-tab live-sync board on the first try, follow the
[End-to-end first-time recipe](#end-to-end-first-time-recipe) at the
bottom, then come back here whenever something doesn't behave the way you
expect.

## Table of contents

1. [Architecture in 60 seconds](#architecture-in-60-seconds)
2. [Schema requirements](#schema-requirements)
3. [HTTP surface — full request/response](#http-surface)
4. [Broadcast envelope (Turbo Streams)](#broadcast-envelope)
5. [Optimistic-id reconciliation lifecycle](#optimistic-id-reconciliation-lifecycle)
6. [Packet trace — one cross-tab move, ms-by-ms](#packet-trace)
7. [Card payload shape + field serialization](#card-payload-shape)
8. [Card HTML rendering — default vs `to_kanban_html`](#card-html-rendering)
9. [Veto + error responses](#veto--error-responses)
10. [Tenant scoping mechanics](#tenant-scoping-mechanics)
11. [Bulk-move atomicity contract](#bulk-move-atomicity-contract)
12. [Audit-log table shape](#audit-log-table-shape)
13. [Wiring pre-flight checklist (silent-failure warnings)](#wiring-pre-flight-checklist)
14. [End-to-end first-time recipe](#end-to-end-first-time-recipe)
15. [Common first-time failures + diagnoses](#common-first-time-failures)

## Architecture in 60 seconds

Three pieces, one stream:

```
                         Action Cable (Turbo Streams)
   ┌─────────────────┐   ────────────────────────►   ┌─────────────────┐
   │  Tab A (browser)│                                │  Tab B (browser)│
   │  data-controller│                                │  data-controller│
   │    ="board      │                                │    ="board      │
   │     board-sync" │                                │     board-sync" │
   └────────┬────────┘                                └────────┬────────┘
            │ PATCH /boards/:resource/cards/:id/move           ▲
            │ X-Optimistic-Id: <uuid>                          │
            ▼                                                  │ broadcast
   ┌───────────────────────────────────────────────────────────┴────────┐
   │  Rails (gem/stimulus_kanban_rails)                                 │
   │                                                                    │
   │   CardsController#move ─► Board#apply_move! ─► card.save!          │
   │                                          │                         │
   │              Broadcastable after_commit ─┘                         │
   │              ─► Turbo::StreamsChannel.broadcast_render_to(         │
   │                   streamables, partial: "…/turbo_stream_event")    │
   └────────────────────────────────────────────────────────────────────┘
```

Per move/edit:

1. JS optimistically mutates the DOM, fires `board:cardMoved`.
2. `board-sync` Stimulus controller PATCHes Rails with `X-Optimistic-Id`.
3. `apply_move!` runs `before_move` hooks (may `raise Veto`), saves the
   record, returns mutations.
4. `Broadcastable.after_update_commit` broadcasts a Turbo Stream to every
   subscriber on the stream name **including the originator** — the
   broadcast payload carries the `optimistic_id`.
5. Each tab's `board-sync` receives the event. The originator sees its
   own id, drops the event (already applied). Other tabs apply via
   `boardApi.applyTransaction`.
6. On 4xx/5xx, the originator GETs `/cards/:id` and reapplies the
   canonical state (revert path).

## Schema requirements

### Your card model **must** have:

| Column        | Type      | Why                                                                          |
|---------------|-----------|------------------------------------------------------------------------------|
| `column_id`   | `string`  | Which board column this card lives in. Defaults driven by `Board#column_id_for` (override for non-`column_id` schemas). |
| `position`    | `integer` | Ordering within a column. Written by `Board#assign_column!` on every move. Bulk-move auto-increments per card. |

Optionally:

| Column          | Type      | Why                                                                  |
|-----------------|-----------|----------------------------------------------------------------------|
| `lock_version`  | `integer` | `self.locking_column = :lock_version` for AR optimistic locking.     |
| (your fields)   | any       | One column per `card_field` you declare on the board.                |

Minimal migration:

```ruby
class CreateStories < ActiveRecord::Migration[7.2]
  def change
    create_table :stories do |t|
      t.string  :title,     null: false
      t.string  :column_id, null: false, default: "backlog"
      t.integer :position,  null: false, default: 0
      t.integer :points
      t.string  :assignee
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_index :stories, [:column_id, :position]
  end
end
```

If your existing schema names these differently, override `Board#column_id_for`
and `Board#assign_column!` rather than renaming columns. Example:

```ruby
class TicketBoard < StimulusKanbanRails::Board
  # ...
  def column_id_for(card)  = card.workflow_state&.to_sym
  def assign_column!(card, to, idx)
    card.workflow_state = to.to_s
    card.list_position  = idx
  end
end
```

### Host-app prerequisites

- Rails 7.0+ (engine targets 7.2 in tests; uses Turbo Streams).
- `turbo-rails`, `stimulus-rails`, `importmap-rails` in the host Gemfile.
- `<%= csrf_meta_tags %>` in the layout — the JS sync controller reads
  the meta tag for `X-CSRF-Token` on every PATCH.
- An Action Cable mount: `mount ActionCable.server => "/cable"`.

## HTTP surface

All endpoints live under `StimulusKanbanRails.mount_path` (default `/boards`).
All requests are JSON. All PATCHes carry `X-Optimistic-Id` (the JS sync
controller mints it via `crypto.randomUUID()`).

### GET `/boards/:resource/cards/:id` — show

Used by the **revert path** when a PATCH fails — JS refetches canonical
state and reapplies via `applyTransaction({ update: [...] })`.

**Response 200:**
```json
{ "card": { "id": 7, "column_id": "doing", "title": "Ship beta", "points": 5, "order": 2 } }
```

> **Required.** Without this route the revert silently 404s and a failed
> move stays visually applied. Confirm it's mounted (the engine's routes
> already include it; if you've customised the engine routes, keep
> `:show`).

### POST `/boards/:resource/cards` — create

**Request body:**
```json
{ "card": { "title": "New story", "column_id": "backlog", "points": 3 } }
```

**Response 201:**
```json
{ "card": { "id": 42, "column_id": "backlog", "title": "New story", "points": 3, "order": 0 } }
```

**Response 422 on validation error:**
```json
{ "errors": ["Title can't be blank"] }
```

> No `optimistic_id` round-trip for `create` — JS-side `+ Add card`
> assigns a temp id and reconciles on the Turbo Stream `add` event.

### PATCH `/boards/:resource/cards/:id` — field update

Fires when a card is inline-edited (`board:cardValueChanged`).

**Request body:**
```json
{ "field": "points", "value": 5 }
```

**Headers:**
```
Content-Type:     application/json
X-Optimistic-Id:  <uuid>
X-CSRF-Token:     <from meta>
```

**Response 200:**
```json
{
  "card":          { "id": 7, "column_id": "doing", "title": "Ship beta", "points": 5, "order": 2 },
  "update":        { "card_id": 7, "field": "points", "value": 5 },
  "optimistic_id": "0f8c…"
}
```

**Response 422 on coerce/validate fail:**
```json
{ "errors": ["must be 1–13"] }
```

### PATCH `/boards/:resource/cards/:id/move` — single-card move

**Request body:**
```json
{ "to_column_id": "doing", "to_index": 0 }
```

**Response 200:**
```json
{
  "card":          { "id": 7, "column_id": "doing", "title": "Ship beta", "points": 5, "order": 0 },
  "mutations":     [{ "card_id": 7, "from_column_id": "todo", "to_column_id": "doing", "to_index": 0 }],
  "optimistic_id": "0f8c…"
}
```

**Response 422 on Veto:**
```json
{ "vetoed": true, "message": "Story must have points before Doing" }
```

### PATCH `/boards/:resource/cards/move_bulk` — atomic multi-card move

Fires from `board:cardsMoved` (multi-select drag-drop / bulk-action
toolbar). **One transaction wraps all writes.** A `Veto` on any card
rolls back the entire batch — no half-moved state. Per-card broadcasts
still fire on the after_commit so other tabs see incremental updates;
the originator suppresses them all via the shared `optimistic_id`.

**Request body:**
```json
{ "card_ids": ["7", "8", "9"], "to_column_id": "review", "to_index": 0 }
```

`to_index` auto-increments per card on the server, so the pile lands at
`0, 1, 2` rather than three cards collapsing onto the same slot.

**Response 200:**
```json
{
  "moved": [
    { "card": { "id": 7, "column_id": "review", "order": 0 }, "mutations": [{ "card_id": 7, "from_column_id": "doing", "to_column_id": "review", "to_index": 0 }] },
    { "card": { "id": 8, "column_id": "review", "order": 1 }, "mutations": [{ "card_id": 8, "from_column_id": "doing", "to_column_id": "review", "to_index": 1 }] },
    { "card": { "id": 9, "column_id": "review", "order": 2 }, "mutations": [{ "card_id": 9, "from_column_id": "doing", "to_column_id": "review", "to_index": 2 }] }
  ],
  "optimistic_id": "0f8c…"
}
```

**Response 422 on Veto** (whole batch rolls back):
```json
{ "vetoed": true, "message": "Story must have points before Doing" }
```

### DELETE `/boards/:resource/cards/:id` — destroy

**Response:** `204 No Content`. The after_commit broadcast carries
`{ kind: "remove", card: { id }, optimistic_id: null }`.

## Broadcast envelope

The Broadcastable concern broadcasts a Turbo Stream that renders
`app/views/stimulus_kanban_rails/boards/_turbo_stream_event.html.erb`:

```erb
<script>
  (function(){
    document.dispatchEvent(new CustomEvent("stimulus-kanban-rails:event", {
      detail: <%= raw JSON.generate({ resource: resource, event: event }) %>
    }));
  })();
</script>
```

So every subscribed tab receives a **document-level CustomEvent** with
`detail`:

```js
{
  resource: "stories",
  event: {
    kind: "add" | "update" | "remove",
    card: { id, column_id, ...fields, order },   // for remove: just { id }
    optimistic_id: "0f8c…" | null
  }
}
```

The `board-sync` controller filters by `detail.resource` (so a page
hosting multiple boards routes correctly), checks the
`optimistic_id` against its in-flight set, and applies the event:

```js
if (event.kind === "remove") api.applyTransaction({ remove: [event.card.id] })
if (event.kind === "update") api.applyTransaction({ update: [event.card] })
if (event.kind === "add")    api.applyTransaction({ add:    [event.card] })
```

### Why a CustomEvent and not direct DOM updates

Turbo Streams support `<turbo-stream action="…">` actions, but a kanban
move can require both DOM relocation and per-tab UI state reconciliation
(virtual scrolling, selection, swimlanes). Routing through
`applyTransaction` keeps a single source of truth — `boardApi` — and
makes the originator's optimistic-id suppression possible.

### Stream tokens

`StimulusKanbanRails.streamables_for(resource, stream)` returns:

```ruby
[ "skr-tenant:<TenantClass>:<id>",   # nil unless ActsAsTenant is loaded + a tenant is set
  "skr-board:<resource>",
  "<your stream name>" ]
```

Both the broadcaster (`Broadcastable#stimulus_kanban_broadcast`) and the
subscriber (`turbo_stream_from(*streamables)` inside the board partial)
compose the **same** list, so a broadcast for tenant A can never reach
tenant B's subscribers.

## Optimistic-id reconciliation lifecycle

```
Tab A                                Server                              Tab B
─────                                ──────                              ─────
boardApi.moveCard(7, →doing,0)
  ├─ DOM moved optimistically
  └─ board:cardMoved fired
      │
      └─► board-sync._postMove
            mints OID = "0f8c…"
            this._myOptimisticIds.add(OID)
            PATCH /cards/7/move
            X-Optimistic-Id: 0f8c…
                                     │
                                     │ CardsController#move
                                     │   card._skr_optimistic_id = "0f8c…"
                                     │   apply_move! → save!
                                     │     after_update_commit:
                                     │       broadcast { kind:"update",
                                     │                   card:{…},
                                     │                   optimistic_id:"0f8c…" }
                                     ▼
              (Turbo Streams fanout to BOTH tabs)
                                     │
   stimulus-kanban-rails:event       │       stimulus-kanban-rails:event
   _applyIncoming                    │       _applyIncoming
     detail.event.optimistic_id      │         detail.event.optimistic_id
       == "0f8c…" ∈ myIds            │           ∉ myIds
       → DROP (already applied)      │         → applyTransaction({update:[card]})
       this._myOptimisticIds.delete  │
```

**TTL guard:** `setTimeout(() => myIds.delete(OID), 30_000)` so a hung
request never grows the set forever. If the broadcast arrives after 30s
the originator will redundantly re-apply (no incorrectness, just a
flicker).

**Why this matters for first-time integrations:** if you skip the
`X-Optimistic-Id` header (e.g. you wrote a custom client), the
originator's tab will visibly re-apply every move it just made. That's
the symptom — look for the missing header.

## Packet trace

The same move, drawn ms-by-ms across two tabs so you can match what
you see in DevTools against what the gem is doing. Setup: two tabs
open on `/sprints`. Tab A drags story `#17` from `todo` → `doing`
(passes `before_move`).

**Tab A — `0ms`**: drop fires `pointerup`; the JS board emits
`board:cardMoved` with
`{ detail: { cardId:"17", toColumnId:"doing", toIndex:0, fromColumnId:"todo", fromIndex:2 } }`.
The DOM has already been mutated optimistically by `boardApi.moveCard`.

**Tab A — `2ms`**: `BoardSyncController#_postMove` mints
`OID = "5f4e8d62-…"`, adds it to `_myOptimisticIds` (with a 30s TTL
guard), and fires:

```http
PATCH /boards/stories/cards/17/move HTTP/1.1
Content-Type: application/json
X-Requested-With: XMLHttpRequest
X-CSRF-Token: aBcD…
X-Optimistic-Id: 5f4e8d62-0a3c-4b3e-b73e-7f3b1bf2a1e2

{"to_column_id":"doing","to_index":0}
```

**Server — `5ms`**: `CardsController#move`:
- `scoped_card("17")` → `Board#scope(user).find("17")` (404 if outside
  the user's scope — never reaches `before_move`).
- `card._skr_optimistic_id = "5f4e8d62-…"` — **before** `save!`.
- `apply_move!` → `run_before_move!(card, from: :todo, to: :doing, …)`.
  Any `Veto` here jumps to §Veto + error responses.
- `assign_column!(card, :doing, 0)` → `card.column_id = "doing"`;
  `card.position = 0`.
- `card.save!` → `after_update_commit` →
  `stimulus_kanban_broadcast(:update)` → render
  `_turbo_stream_event` partial → `Turbo::StreamsChannel.broadcast_render_to(*streamables, …)`.

**Server response to tab A — `12ms`**:

```json
{
  "card":          { "id":17, "column_id":"doing", "title":"…", "points":5, "order":0 },
  "mutations":     [{ "card_id":17, "from_column_id":"todo", "to_column_id":"doing", "to_index":0 }],
  "optimistic_id": "5f4e8d62-…"
}
```

The JS only checks `r.ok` — the response body is discarded. The
optimistic move already mutated the DOM; the broadcast echo is what
reconciles other tabs.

**Both tabs — `18ms`**: Action Cable delivers a Turbo Stream frame
that, when injected, executes the inline `<script>` from
`_turbo_stream_event.html.erb`:

```js
document.dispatchEvent(new CustomEvent("stimulus-kanban-rails:event", {
  detail: {
    resource: "stories",
    event:    { kind: "update",
                card: { "id":17, "column_id":"doing", "title":"…", "points":5, "order":0 },
                optimistic_id: "5f4e8d62-…" }
  }
}))
```

**Tab B — `19ms`**: `_applyIncoming`:
- `event.optimistic_id` = `"5f4e8d62-…"`; tab B's `_myOptimisticIds`
  does **not** contain it → don't suppress.
- `event.kind === "update"` → `api.applyTransaction({ update: [event.card] })`.
- Card hops to `doing` column index 0; render commits.

**Tab A — `19ms`**: same event, same handler:
- `event.optimistic_id` = `"5f4e8d62-…"`; tab A's `_myOptimisticIds`
  **does** contain it → `delete` and `return`.
- No `applyTransaction`. DOM was already correct from the optimistic
  move at `0ms`; the broadcast is a no-op for tab A.

Net: one drag, ~20ms cross-tab latency, no flicker on the originator,
no duplicate render anywhere.

> **Reproduce it yourself.** In tab B, paste this into the console
> before dragging in tab A:
>
> ```js
> document.addEventListener("stimulus-kanban-rails:event",
>   e => console.log("rcv", e.detail))
> ```
>
> Then watch the network tab in tab A for the `X-Optimistic-Id`
> header. The two strings should match.

## Card payload shape

`Board#card_to_h(card)` is the canonical serializer. Output:

```json
{
  "id":        <card.id>,
  "column_id": "<column symbol, stringified>",
  "<field>":   <serialize_value(card.<field>, field)>,   // for each card_field
  ...
  "order":     <card.position>   // only if the model responds to :position
}
```

Field-type serialization (`Board#serialize_value`):

| `card_field type:` | JSON output                                    |
|--------------------|------------------------------------------------|
| `:integer`, `:bigint` | `to_i` → integer                            |
| `:decimal`, `:money`  | `to_f` → number (lossy — use string if you need exact decimal) |
| `:boolean`         | `!!v` → `true`/`false`                         |
| `:date`            | ISO-8601 date string                           |
| `:datetime`        | ISO-8601 datetime string                       |
| `:string`, `:text`, `:enum`, `:reference` | passthrough                       |

Card-field names starting with `_` are excluded from the payload
(useful for server-internal flags).

## Card HTML rendering

The default `_card.html.erb` partial renders one of:

- `card.to_kanban_html` (raw HTML) if the model defines it, OR
- `card.title || card.id` as a fallback.

It also stamps the data attributes the JS controllers need:

```erb
<li data-card-id="<%= card.id %>"
    data-column-id="<%= board.column_id_for(card) %>"
    data-card-order="<%= card.position %>"
    data-card-json="<%= JSON.generate(board.card_to_h(card)).gsub('"', '&quot;') %>">
  <%= card.to_kanban_html.html_safe %>
</li>
```

**`data-card-json` is critical.** The JS renderers (`story`, `task`, `bug`,
…) bind their fields from this attribute. If you set a renderer on a
column (`card_renderer: "story"`) but `data-card-json` is empty, the
renderer has nothing to bind to.

**For custom HTML cards,** define `to_kanban_html` on the model:

```ruby
class Story < ApplicationRecord
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }

  def to_kanban_html
    ApplicationController.render(partial: "stories/card", locals: { story: self })
  end
end
```

## Veto + error responses

`StimulusKanbanRails::Veto` is the only special-case exception:

```ruby
before_move ->(card, from:, to:, user:) {
  raise StimulusKanbanRails::Veto, "Story must have points" if to == :doing && card.points.blank?
}
```

The cards controller catches it via `rescue_from` and renders:

```
422 Unprocessable Entity
{ "vetoed": true, "message": "Story must have points" }
```

The `board-sync` JS controller sees `!response.ok` and triggers the
revert path: GET `/cards/:id`, reapply via `applyTransaction`. The user
sees the card snap back to its previous column.

> **The standard `board:beforeMove` JS event is independent** — fire it
> client-side for instant feedback (e.g. WIP overlay shake), then let
> the server's Veto win as the authoritative gate.

Anything other than `Veto` propagates normally (500 error) and the JS
revert path still runs.

## Tenant scoping mechanics

`StimulusKanbanRails.tenant_stream_token` reads `ActsAsTenant.current_tenant`
and returns `"skr-tenant:<Class>:<id>"`. It's `nil` when ActsAsTenant
isn't loaded or no tenant is set, in which case tenant scoping is a
no-op.

Two things need to match:

1. **Broadcast token** (sent by `Broadcastable#stimulus_kanban_broadcast`
   on the model after_commit).
2. **Subscription token** (rendered by `turbo_stream_from(*streamables)`
   inside the board partial when the page is rendered).

Both go through the same `streamables_for` helper, so they always agree
**as long as `ActsAsTenant.current_tenant` is set the same way at
broadcast time as at render time.** For background jobs that update
cards, wrap with `ActsAsTenant.with_tenant(tenant) { record.update!(…) }`.

**`Board#scope(user)`** is the orthogonal axis — it constrains *which
cards the controller can find*, regardless of stream topology.
`BaseController#scoped_card` calls `board.scope(current_user_if_defined).find(id)`,
so any default scope or `where` clause applies. The default returns
`model_class.all` (i.e. ActsAsTenant's default_scope is the only guard
unless you override).

Override `Board#scope` for explicit auth:

```ruby
def scope(user) = model_class.where(account_id: user.account_id)
```

## Bulk-move atomicity contract

The `move_bulk` endpoint wraps all card moves in a single
`model_class.transaction do … end`. Inside that block:

1. Each card is fetched via `scoped_card(id)` (so out-of-scope ids 404
   the whole batch).
2. The shared `optimistic_id` is stamped on every card.
3. `apply_move!` runs the `before_move` chain — any `raise Veto` aborts
   the transaction, no card is persisted.
4. `to_index + i` is the actual destination index for the i-th card
   (so the pile lands `[i, i+1, i+2, …]`).
5. On successful commit, the after_commit broadcast fires **once per
   card** — each event carries the shared `optimistic_id`, so the
   originator suppresses all of them and other tabs see incremental
   moves.

**Failure modes that DO roll back:** any card outside the user's scope,
any `Veto`, any save failure, any DB error.

**Failure modes that DON'T roll back:** broadcasts. The DB transaction
commits first, then broadcasts fire on after_commit. If the Action
Cable subscriber is down, the DB state is correct but other tabs miss
the update until they next refresh.

**Originator-side cost on large bulk moves.** All N cards share one
`optimistic_id`. The originator's `_myOptimisticIds` set holds one
entry; the first broadcast consumes it. The remaining N-1 broadcasts
no longer match the suppression set and **re-apply redundantly on the
originator** via `applyTransaction({ update: [...] })`. This is benign
correctness-wise (applyTransaction is idempotent), but for very large
bulk moves the originator pays N-1 extra renders. Tracked, not yet
optimised; if you hit it, batch the UI hint differently
(`api.setCardPending` per card) so the user sees activity even while
re-renders flush.

## Audit-log table shape

Run the bundled migration to enable it:

```bash
bin/rails stimulus_kanban_rails:install:migrations
bin/rails db:migrate
```

Creates `stimulus_kanban_audits`:

| Column            | Type       | Purpose                                  |
|-------------------|------------|------------------------------------------|
| `resource`        | string     | the `resource_name` of the board         |
| `card_id`         | string     | the card's PK                            |
| `kind`            | integer    | enum: `create / update / move / destroy` |
| `user_id`         | string     | originator (nullable for system writes)  |
| `field`           | string     | the changed field (`update` only)        |
| `before`, `after` | text       | JSON snapshots                           |
| `from_column_id`, `to_column_id`, `to_index` | string/int | move metadata |
| `created_at`, `updated_at` | datetime | standard                          |

> v0.1 ships the table + model only — the undo/redo controller and
> retention policy land in v0.2.

## Wiring pre-flight checklist

Walk this top-to-bottom on a fresh app. Each item describes a *silent
failure mode* — skip it and the board half-works in a way that's hard
to debug because nothing throws.

1. **Action Cable mounted.** `mount ActionCable.server => "/cable"` in
   `config/routes.rb`. Without this, no broadcast reaches any tab —
   neither the originator's echo nor the observer's update. The dev
   adapter (`adapter: async` in `config/cable.yml`) is fine for the
   smoke test; switch to Redis for prod.

2. **Engine mounted at a known path that matches the initializer.**
   `mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path`
   in `config/routes.rb`, and `StimulusKanbanRails.mount_path = "/boards"`
   (or whatever) in `config/initializers/stimulus_kanban_rails.rb`.
   The JS reads the same value via `data-board-sync-mount-path-value`
   on the board root. Mismatch ⇒ every PATCH 404s.

3. **CSRF meta tag in the layout.** `<%= csrf_meta_tags %>` in the
   `<head>`. The board-sync JS pulls the token from
   `meta[name="csrf-token"]` and sends it as `X-CSRF-Token`. Without
   it, every PATCH fails CSRF and the optimistic move silently
   reverts.

4. **Turbo + Stimulus loaded *before* the kanban controllers
   register.** `application.js` must import `@hotwired/turbo-rails`
   *and* call `Application.start()` *before*
   `StimulusKanban.start(application)` +
   `StimulusKanbanRails.start(application)`. The board-sync
   controller needs Turbo's `<turbo-cable-stream-source>` element
   working already.

5. **Board class loaded.** Boards live under `app/boards/`. Rails 7+
   autoloads it via Zeitwerk — but if your boards live elsewhere,
   add the path to `config.autoload_paths`. The `resource :stories`
   line registers it in `StimulusKanbanRails.registry`; the cards
   controller looks up the board class from the `:resource` URL
   parameter, so an unregistered board ⇒
   `ArgumentError: No board registered for resource :stories`. Touch
   the constant from the view (the helper already does — but only if
   the view is actually rendered before any PATCH arrives).

6. **Model includes `Broadcastable` *and* points at the board.**
   Without both `include StimulusKanbanRails::Broadcastable` *and*
   `broadcasts_board SprintBoard, stream: …`, the after_*_commit
   hooks aren't installed and no broadcast goes out. This is
   independent of any other broadcast the model already does — they
   coexist.

7. **Render through the helper.** `<%= stimulus_kanban_board(board:,
   cards:, …) %>` does both the `turbo_stream_from(*streamables)`
   *and* the root `<div data-controller="board board-sync" …>`. If
   you hand-roll the partial and drop either, broadcasts fire but
   no tab subscribes (or PATCH events fire but no controller picks
   them up).

8. **Both stylesheets loaded.** `<%= stylesheet_link_tag
   "stimulus_kanban", "stimulus_kanban_rails" %>` — both. The first
   gives the board its layout; the second adds the in-flight pulse
   and revert animations. Without these the board layout collapses
   and drag targets are unhittable — users will report it as a sync
   bug.

## End-to-end first-time recipe

Run this in order against a fresh Rails 7.2 app. If every step succeeds,
two tabs side-by-side will mirror each other's drags within ~50ms.

### 1. Gemfile

```ruby
gem "turbo-rails"
gem "stimulus-rails"
gem "importmap-rails"
gem "stimulus_kanban_rails"
```

```bash
bundle install
bin/rails stimulus_kanban_rails:install:migrations   # adds audit table
```

### 2. Migration for your card model

```ruby
class CreateStories < ActiveRecord::Migration[7.2]
  def change
    create_table :stories do |t|
      t.string  :title,     null: false
      t.string  :column_id, null: false, default: "backlog"
      t.integer :position,  null: false, default: 0
      t.integer :points
      t.timestamps
    end
    add_index :stories, [:column_id, :position]
  end
end
```

```bash
bin/rails db:migrate
```

### 3. Initializer

```ruby
# config/initializers/stimulus_kanban_rails.rb
StimulusKanbanRails.parent_controller = "ApplicationController"   # not BaseController
StimulusKanbanRails.mount_path        = "/boards"
```

### 4. Routes

```ruby
# config/routes.rb
Rails.application.routes.draw do
  mount ActionCable.server          => "/cable"
  mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path

  root "stories#index"
  resources :stories, only: %i[index]
end
```

### 5. Board class

```ruby
# app/boards/sprint_board.rb
class SprintBoard < StimulusKanbanRails::Board
  resource :stories
  model    Story
  stream_name { |_user| "sprint:current" }

  column :backlog, title: "Backlog"
  column :todo,    title: "To do",  wip: 5
  column :doing,   title: "Doing",  wip: 3, accept_from: %i[todo backlog]
  column :done,    title: "Done",   accept_from: %i[doing]

  card_field :title,  type: :string,  editable: true
  card_field :points, type: :integer, editable: true,
                      validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
end
```

> Eager-load if your boards live outside the default autoload paths:
> `config.autoload_paths += %W[#{Rails.root}/app/boards]`

### 6. Model with Broadcastable

```ruby
# app/models/story.rb
class Story < ApplicationRecord
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }

  default_scope { order(:column_id, :position) }
end
```

### 7. View + layout

```erb
<%# app/views/layouts/application.html.erb (head) %>
<%= csrf_meta_tags %>
<%= stylesheet_link_tag "stimulus_kanban", "stimulus_kanban_rails" %>
<%= javascript_importmap_tags %>
```

```erb
<%# app/views/stories/index.html.erb %>
<div style="height: 90vh; padding: 1rem;">
  <%= stimulus_kanban_board(
        board: SprintBoard.new(user: current_user),
        cards: Story.all,
        card_selection: "multiple") %>
</div>
```

### 8. JS bootstrap

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusKanban       from "stimulus_kanban"
import StimulusKanbanRails  from "stimulus_kanban_rails"

const application = Application.start()
StimulusKanban.start(application)
StimulusKanbanRails.start(application)
```

### 9. Smoke test

```bash
bin/rails console
> 3.times { |i| Story.create!(title: "Demo #{i}", column_id: "backlog", points: 3) }
exit
bin/rails server
```

Open `http://localhost:3000` in two browser windows side-by-side:

- Drag a card in window 1. Within ~50ms window 2 shows it move.
- Try dragging a card with `points: nil` (delete `points` on one record
  first) into Doing — it should snap back with a 422 in the network tab.
- Cmd/Ctrl-click 2 cards in window 1, drag the pile to Done. Window 2
  shows both arrive in order.

If any step fails, jump to the next section.

## Common first-time failures

| Symptom | Likely cause | Fix |
|---|---|---|
| Drag works locally but other tabs don't update | Turbo Streams not connecting | `<%= csrf_meta_tags %>` missing; or `mount ActionCable.server` missing; or `import "@hotwired/turbo-rails"` missing |
| PATCH returns 422 `{ vetoed: true }` immediately on every move | a `before_move` guard refusing — check the message in DevTools Network tab | Loosen the guard or seed valid data |
| PATCH returns 404 on `/cards/:id/move` | Board resource not registered; or wrong `mount_path` | Confirm `data-board-sync-mount-path-value` in DOM matches `StimulusKanbanRails.mount_path`; confirm `resource :stories` in the Board matches the URL `/boards/stories/…` |
| PATCH returns 401/403 | Devise/auth before_action runs but the request is unauthenticated | Use a `parent_controller` that includes session/cookie auth; the gem's controllers inherit it |
| Originator tab visibly re-applies its own moves (flicker) | `X-Optimistic-Id` header missing | Confirm you're using `StimulusKanbanRails.start(application)` (which registers `board-sync`); the DOM should have `data-controller="board board-sync"` |
| `Unknown column` on bulk move | `column_id` column missing from the table | Add migration; `t.string :column_id, null: false, default: "<first-col-name>"` |
| Card position drifts on every move | `position` column missing or non-integer | Add migration; the JS sends `to_index`, the server writes `position` |
| Card renders as raw ID like "42" instead of a title | `to_kanban_html` not defined and no `title` column | Define `to_kanban_html` on the model, or add a `title` column |
| All updates work, but CSRF fails on PATCH | `csrf_meta_tags` missing OR you're not behind authenticated routing | Add `<%= csrf_meta_tags %>` to the layout `<head>` |
| `No board registered for resource :stories` | Board class autoloaded too late | Reference `SprintBoard` in the view (the helper does); or add `Rails.application.config.to_prepare { SprintBoard }` |
| Two-tenant test bleeds events across tenants | Background job not wrapped in `ActsAsTenant.with_tenant` | Wrap any non-request writes; the broadcaster reads `ActsAsTenant.current_tenant` at after_commit time |
| Bulk-move pile collapses to one slot | You wrote a custom client that re-uses the same `to_index` for every card | Send one PATCH with `{ card_ids: [...], to_index: N }` — the server auto-increments |

---

## Where to look in the gem

| File                                                                          | What's in it                                   |
|-------------------------------------------------------------------------------|------------------------------------------------|
| `lib/stimulus_kanban_rails.rb`                                                | module config, registry, streamables           |
| `lib/stimulus_kanban_rails/board.rb`                                          | DSL + `apply_move!` / `apply_update!` / `card_to_h` |
| `lib/stimulus_kanban_rails/concerns/broadcastable.rb`                         | after_commit broadcaster + optimistic-id stamp |
| `lib/stimulus_kanban_rails/turbo_streams_helper.rb`                           | `stimulus_kanban_board` view helper            |
| `app/controllers/stimulus_kanban_rails/base_controller.rb`                    | parent controller + `scoped_card`              |
| `app/controllers/stimulus_kanban_rails/cards_controller.rb`                   | show / create / update / move / move_bulk / destroy |
| `app/views/stimulus_kanban_rails/boards/_board.html.erb`                      | the board partial                              |
| `app/views/stimulus_kanban_rails/boards/_card.html.erb`                       | the per-card partial                           |
| `app/views/stimulus_kanban_rails/boards/_turbo_stream_event.html.erb`         | the broadcast envelope template                |
| `app/assets/javascripts/stimulus_kanban_rails.js`                             | the `board-sync` Stimulus controller           |
| `config/routes.rb`                                                            | engine routes                                  |
| `gem/demo/`                                                                   | a complete working Rails 7.2 host app          |

Cross-references:

- High-level setup story: [`SKILL.md`](./SKILL.md)
- JS-side board API + events: [`../stimulus-kanban-js/SKILL.md`](../stimulus-kanban-js/SKILL.md)
- Gem README (RubyGems landing): [`../../gem/stimulus_kanban_rails/README.md`](../../gem/stimulus_kanban_rails/README.md)
