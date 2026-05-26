# stimulus_kanban_rails

Hotwire companion gem for the [`stimulus_kanban`](https://github.com/schappim/stimulus_kanban)
JS package. Live multi-user kanban boards over Turbo Streams + Action Cable
with a Ruby-side column registry, card-field schema, workflow guards,
tenant-scoped broadcasts, and an opt-in audit log for undo/redo.

## Install

```bash
bundle add stimulus_kanban_rails
bin/rails stimulus_kanban_rails:install:migrations   # only if you want the audit log
bin/rails db:migrate
```

```ruby
# config/routes.rb
mount ActionCable.server => "/cable"
mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path
```

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusKanban       from "stimulus_kanban"
import StimulusKanbanRails  from "stimulus_kanban_rails"

const application = Application.start()
StimulusKanban.start(application)        // board, board-column, card, card-editor, …
StimulusKanbanRails.start(application)   // board-sync + Turbo Stream actions
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

  card_field :title,  type: :string,  editable: true
  card_field :points, type: :integer, editable: true,
                      validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
  card_field :assignee_id, type: :integer, editable: ->(_card, user) { user&.lead? }

  before_move ->(card, from:, to:, user:) {
    raise StimulusKanbanRails::Veto, "Story must have points" if to == :doing && card.points.blank?
  }
end
```

## Broadcastable model

```ruby
# app/models/story.rb
class Story < ApplicationRecord
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }
  self.locking_column = :lock_version
end
```

## Render the board

```erb
<%= stimulus_kanban_board(
      board: SprintBoard.new(user: current_user),
      cards: Story.current_sprint.order(:column_id, :position),
      card_selection: "multiple") %>
```

That's the whole loop. Every drag fires the JS `board:cardMoved` event,
which the `board-sync` controller PATCHes to the cards endpoint; the
server runs `before_move`, persists, and the `Broadcastable` after_commit
echoes a Turbo Stream that reaches every other connected tab — applied
through `boardApi.applyTransaction`.

## Configure

```ruby
# config/initializers/stimulus_kanban_rails.rb
StimulusKanbanRails.parent_controller = "ApplicationController"
StimulusKanbanRails.mount_path        = "/boards"
```

## Endpoints

- `POST   /boards/:resource/cards`
- `PATCH  /boards/:resource/cards/:id`         — `{ field, value }`
- `PATCH  /boards/:resource/cards/:id/move`    — `{ to_column_id, to_index }`
- `DELETE /boards/:resource/cards/:id`

All routes inherit auth/tenant from `StimulusKanbanRails.parent_controller`.

## Audit log + undo/redo

Run the bundled migration to enable persistent history. The cards
controller appends an `Audit` row per change; an `Undo` endpoint and
client keybinding (`Cmd/Ctrl+Z`) restore the previous state for the
(resource, user) pair. (V0.1 ships the table + model; the undo endpoint
lands in v0.2.)

## License

MIT.
