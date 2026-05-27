---
name: stimulus-kanban-rails
description: Use stimulus_kanban_rails — the Rails / Hotwire companion gem for the stimulus_kanban JS package. Apply when wiring up a server-driven kanban board in a Rails app (Turbo Streams live multi-user sync, server-side workflow guards / WIP limits / accept_from rules, optimistic-id reconciliation, tenant-scoped broadcasts, atomic bulk-move endpoint, audit log + undo/redo). For client-only / non-Rails usage of the JS controller use the stimulus-kanban-js skill instead. For exact HTTP request/response shapes, broadcast envelopes, schema requirements, or debugging a fresh integration, see COOKBOOK.md alongside this file.
---

# Using stimulus_kanban_rails (the Rails gem)

`stimulus_kanban_rails` is a Rails engine that wraps the `stimulus_kanban`
JS package with a Ruby DSL for boards + a Turbo Stream sync layer. The
JS package handles the user-facing drag/drop/keyboard/editor. The gem
owns the server-side schema, the workflow guards, and the broadcasts
that keep every connected tab in sync.

## When to use which file

| You're doing… | Read this |
|---|---|
| First-time integration in a fresh Rails app | This file, top-to-bottom — then the [End-to-end first-time recipe](./COOKBOOK.md#end-to-end-first-time-recipe) |
| Need exact HTTP request/response shapes | [`COOKBOOK.md`](./COOKBOOK.md#http-surface) |
| Debugging "it doesn't sync" / "my move flickers" / "404 on /cards/:id" | [`COOKBOOK.md` common failures](./COOKBOOK.md#common-first-time-failures) |
| JS-only / client-side board (no Rails) | [`../stimulus-kanban-js/SKILL.md`](../stimulus-kanban-js/SKILL.md) |
| Looking for boardApi methods / JS event names | [`../stimulus-kanban-js/SKILL.md`](../stimulus-kanban-js/SKILL.md) |
| Pasting a working example | The runnable demo at `gem/demo/` (`bin/rails server`, open in two tabs) |

> **Live, runnable demo:** `gem/demo/` is a complete Rails 7.2 app. Boot
> it with `cd gem/demo && bundle install && bin/rails db:setup && bin/rails server`
> and open `http://localhost:3000` in two browser windows side-by-side to
> see real-time multi-user sync. Use it as the canonical reference for
> what a host app's wiring looks like.

## Setup

### Schema requirements (do this first)

Your card model needs `column_id` (string) and `position` (integer)
columns by default — the `board-sync` controller writes them on every
move. If your existing schema uses different names, override
`Board#column_id_for` and `Board#assign_column!` rather than renaming
your tables. Full details + a minimal migration:
[COOKBOOK.md → Schema requirements](./COOKBOOK.md#schema-requirements).

### Gemfile + install

```ruby
# Gemfile
gem "turbo-rails"
gem "stimulus-rails"
gem "importmap-rails"
gem "stimulus_kanban_rails"
```

```bash
bundle install
bin/rails stimulus_kanban_rails:install:migrations   # optional: audit log
bin/rails db:migrate
```

### Routes

```ruby
# config/routes.rb
mount ActionCable.server          => "/cable"
mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path  # default "/boards"
```

### JS bootstrap

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusKanban       from "stimulus_kanban"
import StimulusKanbanRails  from "stimulus_kanban_rails"

const application = Application.start()
StimulusKanban.start(application)        // board, board-column, card, card-editor, …
StimulusKanbanRails.start(application)   // adds the `board-sync` controller
```

### Layout

```erb
<%# app/views/layouts/application.html.erb <head> %>
<%= csrf_meta_tags %>                         <%# REQUIRED — JS reads it for X-CSRF-Token %>
<%= stylesheet_link_tag "stimulus_kanban", "stimulus_kanban_rails" %>
<%= javascript_importmap_tags %>
```

### Initializer

```ruby
# config/initializers/stimulus_kanban_rails.rb
StimulusKanbanRails.parent_controller = "ApplicationController"   # Devise / ActsAsTenant
StimulusKanbanRails.mount_path        = "/boards"                  # match the mount above
```

The engine auto-pins `stimulus_kanban` + `stimulus_kanban_rails` via
importmap and ships both JS bundles + CSS — host apps need **no** JS build
step and **no** npm packages.

## 1. Declare a board (server-side column registry)

```ruby
# app/boards/sprint_board.rb
class SprintBoard < StimulusKanbanRails::Board
  resource :stories
  model    Story
  stream_name { |_user| "sprint:current" }   # per-team/per-sprint scoping

  column :backlog, title: "Backlog"
  column :todo,    title: "To do",  wip: 5
  column :doing,   title: "Doing",  wip: 3, accept_from: %i[todo backlog]
  column :review,  title: "Review", wip: 2, accept_from: %i[doing]
  column :done,    title: "Done",   accept_from: %i[review]

  card_field :title,       type: :string,  editable: true
  card_field :points,      type: :integer, editable: true,
                           validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
  card_field :assignee_id, type: :integer, editable: ->(_card, user) { user&.lead? }

  before_move ->(card, from:, to:, user:) {
    raise StimulusKanbanRails::Veto, "Story must have points" \
      if to == :doing && card.points.blank?
  }

  # Optional: authorization / tenant scoping. Used by every lookup
  # (`scoped_card`) — override for per-user filtering.
  def scope(user) = model_class.all   # e.g. model_class.where(account: user.account)
end
```

The DSL is intentionally small:

- `column name, **opts` — `title`, `wip`, `min_count`, `accept_from`,
  `sort`, `width`, `color`, `icon`, `card_renderer`, `card_editor`,
  `editable`, `authorize`, `stuck_after_days`
- `card_field name, type:, editable:, validate:, computed:, depends_on:`
  — coercion + validation shape mirrors `stimulus_grid_rails`
- `before_move callable` — raise `StimulusKanbanRails::Veto` to refuse
- `stream_name { |user| … }` — per-board stream token (defaults to
  `"<resource>:default"`)
- `scope(user)` — base relation visible to the controller; defaults to
  `model_class.all`. Override for ActsAsTenant / Devise scoping

**Card-field types:** `string text integer bigint decimal money boolean enum date datetime reference`.
Exact JSON serialization rules per type:
[COOKBOOK.md → Card payload shape](./COOKBOOK.md#card-payload-shape).

## 2. Make the model broadcastable

```ruby
class Story < ApplicationRecord
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }
  self.locking_column = :lock_version           # optional optimistic locking
end
```

After this, **every** `create_commit` / `update_commit` / `destroy_commit`
automatically broadcasts a card-grained Turbo Stream to the board's
tenant-scoped stream — including changes made from the console, jobs, or
other controllers. No manual broadcast calls anywhere. The `board-sync`
JS controller picks them up and applies them via
`boardApi.applyTransaction`.

The broadcast payload shape (what the originator sees, what other tabs
see, how `optimistic_id` round-trips) is documented in
[COOKBOOK.md → Broadcast envelope](./COOKBOOK.md#broadcast-envelope) and
[COOKBOOK.md → Optimistic-id reconciliation lifecycle](./COOKBOOK.md#optimistic-id-reconciliation-lifecycle).

## 3. Render the board in a view

```erb
<%= stimulus_kanban_board(
      board: SprintBoard.new(user: current_user),
      cards: Story.current_sprint.order(:column_id, :position),
      card_selection: "multiple") %>
```

That helper renders the engine's `boards/_board.html.erb` partial,
which:

1. Mounts the `<div data-controller="board board-sync">` root.
2. Subscribes to `turbo_stream_from(*streamables)` so card-grained
   broadcasts arrive over Action Cable.
3. Renders the column `<li>`s with the right `data-board-column-*`
   attributes from the Board's `column` declarations.
4. Renders each card `<li>` with `data-card-id` + the JSON payload on
   `data-card-json` so the JS renderers find their fields. To use a
   custom HTML card, define `to_kanban_html` on the model — see
   [COOKBOOK.md → Card HTML rendering](./COOKBOOK.md#card-html-rendering).

Wrap or style `.sk-board` to give the board a height. Defaults to
`height: 620px` in the demo.

## Endpoints (mounted under `StimulusKanbanRails.mount_path`)

| Verb   | Path                                            | Purpose                                  |
|--------|-------------------------------------------------|------------------------------------------|
| GET    | `/boards/:resource/cards/:id`                   | show (used by sync's revert path)        |
| POST   | `/boards/:resource/cards`                       | create                                   |
| PATCH  | `/boards/:resource/cards/:id`                   | field update `{ field, value }`          |
| PATCH  | `/boards/:resource/cards/:id/move`              | single-card move `{ to_column_id, to_index }` |
| PATCH  | `/boards/:resource/cards/move_bulk`             | atomic multi-card move (collection route) |
| DELETE | `/boards/:resource/cards/:id`                   | destroy                                  |

All actions go through `BaseController#scoped_card`, which delegates to
`Board#scope(user)` — so any `ActsAsTenant` default scope and your custom
authorization filters apply automatically. A card outside the user's
scope raises `RecordNotFound` rather than silently leaking.

**Full request/response JSON for every endpoint** — including the
`X-Optimistic-Id` header contract, the veto response shape, and the
`move_bulk` per-card auto-incremented `to_index` rule — lives in
[COOKBOOK.md → HTTP surface](./COOKBOOK.md#http-surface). If you're
implementing a non-default client (custom mobile app, scripted writer)
or debugging an integration, read that section.

## Optimistic-id reconciliation

The `board-sync` controller sends a fresh `X-Optimistic-Id` header on
every PATCH. The cards controller assigns it to
`card._skr_optimistic_id` before save; the `Broadcastable` after_commit
broadcast includes it in the event payload; the originating tab sees its
own id come back and silently drops the echo (the move was already
applied locally). Other tabs apply normally.

In short: the originator's UI doesn't double-render / flicker, and you
don't have to write any reconcile code yourself.

Lifecycle diagram + 30-second TTL guard + the "I wrote a custom client
and it flickers" symptom:
[COOKBOOK.md → Optimistic-id reconciliation lifecycle](./COOKBOOK.md#optimistic-id-reconciliation-lifecycle).

## Tenant isolation

If `ActsAsTenant` is in use, both the broadcaster (the `Broadcastable`
after_commit) and the subscriber (the partial's `turbo_stream_from`)
include the same `skr-tenant:<Class>:<id>` token. A broadcast for
tenant A can never reach tenant B's subscribers — even when boards
share a logical stream name. Without ActsAsTenant the tenant scoping is
a no-op and `Board#scope` defaults to `model_class.all`.

Caveat for background jobs that mutate cards: wrap them in
`ActsAsTenant.with_tenant(tenant) { … }` so the broadcaster picks up the
right tenant at after_commit time.
[COOKBOOK.md → Tenant scoping mechanics](./COOKBOOK.md#tenant-scoping-mechanics).

## Workflow patterns

- **Veto in `before_move`** — raise `StimulusKanbanRails::Veto, "message"`.
  The cards controller returns 422 `{ vetoed: true, message }` and the
  client reverts the optimistic move.
- **Per-user field editability** —
  `card_field :assignee_id, editable: ->(_c, u) { u.lead? }`.
- **Server-side WIP enforcement** — declare `column :doing, wip: 3` and
  re-check `card_field counts` in `before_move`. The client overlay is
  advisory; this is the real gate.
- **Atomic bulk moves** — the JS `boardApi.bulkMove({ fromIds, toColumnId, toIndex })`
  PATCHes `move_bulk`; one transaction wraps every card so an early Veto
  rolls back the entire batch. The server auto-increments `to_index`
  per card so the pile lands in order — never send the same `to_index`
  per card from a custom client.
- **Audit log / undo** — run the bundled migration to enable the
  `stimulus_kanban_audits` table. (V0.1 ships the table + model; the
  undo controller lands in v0.2.) Table shape:
  [COOKBOOK.md → Audit-log table shape](./COOKBOOK.md#audit-log-table-shape).

## Two-tab smoke test

```bash
cd gem/demo
bundle install
bin/rails db:setup
bin/rails server
# open http://localhost:3000 in two windows side-by-side
```

1. Drag any story in window 1 — within ~50ms window 2 reflects the move.
2. Try dragging an unpointed story (Annual gas-safety report) into Doing
   — the move reverts and a tooltip surfaces the `Veto` message.
3. Cmd/Ctrl-click 3 stories then drag the pile — one `move_bulk` PATCH
   moves all three atomically.

If any of these fails on your host app:
[COOKBOOK.md → Common first-time failures](./COOKBOOK.md#common-first-time-failures).

## Configuration knobs

```ruby
# config/initializers/stimulus_kanban_rails.rb
StimulusKanbanRails.parent_controller = "Admin::BaseController"
StimulusKanbanRails.mount_path        = "/admin/boards"
```

The mount path is used both by the routes config and the client-side
`board-sync` controller (via `data-board-sync-mount-path-value`), so
they always agree.

## Where to look

| Where to look                                                   | What's in it                                          |
|-----------------------------------------------------------------|-------------------------------------------------------|
| [`./COOKBOOK.md`](./COOKBOOK.md)                                | **wire-format spec** — HTTP, broadcasts, lifecycle, first-time recipe, failure modes |
| [`../stimulus-kanban-js/SKILL.md`](../stimulus-kanban-js/SKILL.md) | JS-side `boardApi`, events, renderers, drag-and-drop  |
| `gem/stimulus_kanban_rails/lib/stimulus_kanban_rails/board.rb`  | the DSL (`Board` base class)                          |
| `gem/stimulus_kanban_rails/lib/stimulus_kanban_rails/column.rb` | column option list + DOM data-attr emission           |
| `gem/stimulus_kanban_rails/lib/stimulus_kanban_rails/card_field.rb` | card-field type registry + coerce/validate           |
| `gem/stimulus_kanban_rails/lib/stimulus_kanban_rails/concerns/broadcastable.rb` | the after_commit broadcaster + optimistic-id pass-through |
| `gem/stimulus_kanban_rails/app/controllers/.../cards_controller.rb` | show / create / update / move / move_bulk / destroy   |
| `gem/stimulus_kanban_rails/app/views/.../boards/_board.html.erb` | the view partial the helper renders                   |
| `gem/stimulus_kanban_rails/app/assets/javascripts/stimulus_kanban_rails.js` | the JS `board-sync` controller                        |
| `gem/demo/`                                                     | a complete Rails 7.2 host app exercising it end-to-end |
