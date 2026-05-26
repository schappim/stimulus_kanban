class Story < ApplicationRecord
  # Wire the broadcastable concern — every after_create / after_update /
  # after_destroy commit now broadcasts a Turbo Stream event to the same
  # tenant-scoped stream that `turbo_stream_from(*streamables)` in the
  # rendered view subscribed to. The originator's tab suppresses its own
  # echo via the `_skr_optimistic_id` reconcile so its optimistic move
  # doesn't double-apply.
  include StimulusKanbanRails::Broadcastable
  broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }

  # Used by the column index of the rendered card list. `position` is
  # written by Board#assign_column! on a successful move.
  default_scope { order(:column_id, :position) }
end
