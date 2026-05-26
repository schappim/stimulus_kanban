module StimulusKanbanRails
  # Mixin for AR models that back a Board. Adds a tenant-scoped Turbo Stream
  # broadcast on every save/destroy so connected tabs reconcile against the
  # canonical server state. Mirrors `stimulus_grid_rails::Broadcastable`.
  #
  #   class Story < ApplicationRecord
  #     include StimulusKanbanRails::Broadcastable
  #     broadcasts_board SprintBoard, stream: ->(_s) { "sprint:current" }
  #   end
  module Broadcastable
    extend ActiveSupport::Concern

    class_methods do
      def broadcasts_board(board_class, stream: nil)
        @stimulus_kanban_board_class = board_class
        @stimulus_kanban_stream_proc = stream
        after_create_commit  { stimulus_kanban_broadcast(:add) }
        after_update_commit  { stimulus_kanban_broadcast(:update) }
        after_destroy_commit { stimulus_kanban_broadcast(:remove) }
      end

      def stimulus_kanban_board_class; @stimulus_kanban_board_class; end
      def stimulus_kanban_stream_proc;  @stimulus_kanban_stream_proc; end
    end

    private

    def stimulus_kanban_broadcast(kind)
      klass  = self.class.stimulus_kanban_board_class
      return unless klass
      stream = self.class.stimulus_kanban_stream_proc&.call(self) || "#{klass.resource_name}:default"
      board  = klass.new
      payload = {
        kind: kind,
        card: kind == :remove ? { id: id } : board.card_to_h(self),
      }
      streamables = StimulusKanbanRails.streamables_for(klass.resource_name, stream)
      Turbo::StreamsChannel.broadcast_render_to(
        *streamables,
        partial: "stimulus_kanban_rails/boards/turbo_stream_event",
        locals:  { event: payload, resource: klass.resource_name },
      )
    end
  end
end
