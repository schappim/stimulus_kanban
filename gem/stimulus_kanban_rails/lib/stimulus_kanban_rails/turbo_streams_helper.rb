module StimulusKanbanRails
  # View helpers exposed to host apps so they can render
  #   <%= stimulus_kanban_board board: SprintBoard.new(user: current_user),
  #                             cards: Story.current_sprint %>
  # without hand-rolling the data-* attribute soup.
  module TurboStreamsHelper
    def stimulus_kanban_board(board:, cards:, card_selection: "", **html_opts)
      resource = board.class.resource_name
      stream   = board.class.stream_name.call(board.user)
      streamables = StimulusKanbanRails.streamables_for(resource, stream)
      render partial: "stimulus_kanban_rails/boards/board", locals: {
        board: board,
        cards: cards,
        streamables: streamables,
        card_selection: card_selection,
        html_opts: html_opts,
      }
    end
  end
end

ActiveSupport.on_load(:action_view) do
  include StimulusKanbanRails::TurboStreamsHelper
end
