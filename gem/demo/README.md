# stimulus_kanban_rails demo app

Minimal Rails 7.2 app that exercises the engine end-to-end. Boots straight from
this directory — points at the sibling `stimulus_kanban_rails/` via a `path:`
gem reference, so any edit to the engine is picked up by a server reload.

## Boot

```bash
cd gem/demo
bundle install
bin/rails db:setup        # creates the sqlite db + runs migrations + seeds
bin/rails server          # http://localhost:3000
```

Open `http://localhost:3000` to see the sprint board, then open the same URL in
a second window — drags in either window propagate to the other in under a frame.

## What it shows

- **Server-side board declaration** — `app/boards/sprint_board.rb` (`column`,
  `card_field`, `before_move`, `stream_name`).
- **Auto-broadcasting model** — `app/models/story.rb` includes
  `StimulusKanbanRails::Broadcastable` and wires `broadcasts_board SprintBoard`.
  Every commit fires a Turbo Stream over Action Cable.
- **Auto-mounted endpoints** — `config/routes.rb` mounts
  `StimulusKanbanRails::Engine`, which brings in:
  - `GET    /boards/stories/cards/:id`           — show (sync revert path)
  - `POST   /boards/stories/cards`               — create
  - `PATCH  /boards/stories/cards/:id`           — field update
  - `PATCH  /boards/stories/cards/:id/move`      — single-card move
  - `PATCH  /boards/stories/cards/move_bulk`     — atomic multi-card move
  - `DELETE /boards/stories/cards/:id`           — destroy
- **View helper** — `app/views/sprints/index.html.erb` renders the whole board
  with one `<%= stimulus_kanban_board(...) %>` call.
- **Optimistic-id reconciliation** — the originator's tab sees its own echo
  and silently drops it (no double-render).
- **before_move veto** — refuse a story into Doing until it's been pointed; the
  client reverts the optimistic move and surfaces the message.
- **WIP limits** — declared per column on the Board class; the JS overlay
  flashes red over the column header when the limit is breached.
- **accept_from chain** — Done only accepts from Review, etc.

## Testing the multi-user loop

1. Open two browser windows side by side at `http://localhost:3000`.
2. Drag any story in window 1 — within ~50ms window 2 reflects the move.
3. Try dragging an unpointed story (Annual gas-safety report) into Doing — the
   move reverts and a "Story must have points before Doing" tooltip appears.
4. Cmd/Ctrl-click 3 stories then drag them as a pile — one `move_bulk` PATCH
   moves all three atomically (try a story with the veto rule mixed in to see
   the whole batch roll back).

## Layout

```
gem/demo/
  app/
    boards/sprint_board.rb         # Board DSL — columns, card_fields, before_move
    models/story.rb                # AR model with broadcasts_board
    controllers/sprints_controller.rb
    views/sprints/index.html.erb   # uses stimulus_kanban_board helper
    javascript/application.js      # imports stimulus_kanban + stimulus_kanban_rails
  config/
    routes.rb                       # mount ActionCable + the engine
    initializers/stimulus_kanban_rails.rb
    importmap.rb                    # the engine adds its own pins
  db/
    migrate/                        # stories table + the audit table
    seeds.rb                        # ~13 stories across the columns
```
