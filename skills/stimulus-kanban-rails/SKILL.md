---
name: stimulus-kanban-rails
description: Use stimulus_kanban_rails — the Rails / Hotwire companion gem for the stimulus_kanban JS package. Apply when wiring up a server-driven kanban board in a Rails app (Turbo Streams live sync, multi-user editable boards, server-side workflow guards / WIP limits / accept_from rules, tenant-scoped broadcasts, audit log + undo/redo). For client-only / non-Rails usage of the JS controller use the stimulus-kanban-js skill instead.
---

# Using stimulus_kanban_rails (the Rails gem)

`stimulus_kanban_rails` is a Rails engine that wraps the
`stimulus_kanban` JS package with a Ruby DSL for boards + a Turbo
Stream sync layer. The JS package handles the user-facing
drag/drop/keyboard/editor. The gem owns the server-side schema, the
workflow guards, and the broadcasts that keep every connected tab in
sync.

## Install

```bash
bundle add stimulus_kanban_rails
bin/rails stimulus_kanban_rails:install:migrations   # optional: audit log
bin/rails db:migrate
```

```ruby
# config/routes.rb
mount ActionCable.server                  => "/cable"
mount StimulusKanbanRails::Engine         => StimulusKanbanRails.mount_path
```

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusKanban       from "stimulus_kanban"
import StimulusKanbanRails  from "stimulus_kanban_rails"

const application = Application.start()
StimulusKanban.start(application)
StimulusKanbanRails.start(application)   // adds the `board-sync` controller
```

```ruby
# config/initializers/stimulus_kanban_rails.rb
StimulusKanbanRails.parent_controller = "ApplicationController"
StimulusKanbanRails.mount_path        = "/boards"
```

## Declare a board

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

  card_field :title,       type: :string,  editable: true
  card_field :points,      type: :integer, editable: true,
                           validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
  card_field :assignee_id, type: :integer, editable: ->(_card, user) { user&.lead? }

  before_move ->(card, from:, to:, user:) {
    raise StimulusKanbanRails::Veto, "Story must have points" if to == :doing && card.points.blank?
  }
end
```

The DSL is intentionally small:

- `column name, **opts` — `title`, `wip`, `min_count`, `accept_from`,
  `sort`, `width`, `color`, `icon`, `card_renderer`, `card_editor`,
  `editable`, `authorize`
- `card_field name, type:, editable:, validate:, computed:, depends_on:`
  — same coercion + validation shape as `stimulus_grid_rails`
- `before_move callable` — raise `StimulusKanbanRails::Veto` to refuse
- `stream_name { |user| … }` — per-user tenant token (defaults to
  `"<resource>:default"`)

## Make the model broadcastable

```ruby
class Story < ApplicationRecord
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }
  self.locking_column = :lock_version           # optional optimistic locking
end
```

Every `create_commit` / `update_commit` / `destroy_commit` broadcasts a
card-grained Turbo Stream that the `board-sync` JS controller applies
via `boardApi.applyTransaction`. Tabs that initiated the change
suppress their own echo so the optimistic state doesn't pulse.

## Render the board in a view

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
   `data-card-json` so the JS renderers find their fields.

## Endpoints (mounted under `StimulusKanbanRails.mount_path`)

| Verb   | Path                                           | Purpose                       |
|--------|------------------------------------------------|-------------------------------|
| POST   | `/boards/:resource/cards`                       | create                        |
| PATCH  | `/boards/:resource/cards/:id`                   | field update `{field, value}` |
| PATCH  | `/boards/:resource/cards/:id/move`              | move `{to_column_id, to_index}` |
| DELETE | `/boards/:resource/cards/:id`                   | destroy                       |

All routes inherit auth/tenant from `StimulusKanbanRails.parent_controller`.

## Tenant isolation

If `ActsAsTenant` is in use, both the broadcaster (the `Broadcastable`
after_commit) and the subscriber (the partial's `turbo_stream_from`)
include the same `skr-tenant:<Class>:<id>` token. A broadcast for
tenant A can never reach tenant B's subscribers even when boards share a
logical stream name.

## Workflow patterns

- **Veto in `before_move`** — raise `StimulusKanbanRails::Veto, "message"`.
  The cards controller returns 422 `{vetoed: true, message}` and the
  client reverts the optimistic move.
- **Per-user field editability** — `card_field :assignee_id, editable: ->(_c, u) { u.lead? }`.
- **Server-side WIP enforcement** — declare `column :doing, wip: 3` and
  check `card_field counts` in `before_move`. The client overlay is
  advisory; this is the real gate.
- **Audit log / undo** — run the bundled migration to enable.

## Configuration knobs

```ruby
StimulusKanbanRails.parent_controller = "Admin::BaseController"
StimulusKanbanRails.mount_path        = "/admin/boards"
```

The mount path is used both by the routes config and the
client-side `board-sync` controller (via `data-board-sync-mount-path-value`),
so they always agree.
