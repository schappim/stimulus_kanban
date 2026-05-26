# Demo board declaring the columns, card-field schema, and the only workflow
# guard (a card must have story points before it can enter "Doing"). The same
# DSL is what host apps subclass — see skills/stimulus-kanban-rails/SKILL.md.
class SprintBoard < StimulusKanbanRails::Board
  resource :stories
  model    Story

  # All connected tabs receive broadcasts for this stream name. For per-team
  # / per-sprint scoping return a different string here (the broadcaster on
  # the model side reads the same proc, so they always match).
  stream_name { |_user| "sprint:current" }

  column :backlog, title: "Backlog"
  column :todo,    title: "To do",  wip: 5
  column :doing,   title: "Doing",  wip: 3, accept_from: %i[todo backlog]
  column :review,  title: "Review", wip: 2, accept_from: %i[doing]
  column :done,    title: "Done",   accept_from: %i[review]

  card_field :title,       type: :string,  editable: true
  card_field :points,      type: :integer, editable: true,
                           validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
  card_field :assignee,    type: :string,  editable: true

  # Refuse a drop into "Doing" until the story has been estimated. The JS
  # board sees a 422 with `{ vetoed: true, message }` and reverts the
  # optimistic move; the user sees a tooltip via the standard cancellation
  # hook.
  before_move ->(card, from:, to:, user:) {
    raise StimulusKanbanRails::Veto, "Story must have points before Doing" \
      if to == :doing && card.points.blank?
  }
end
