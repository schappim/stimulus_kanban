module StimulusKanbanRails
  class BaseController < StimulusKanbanRails.parent_controller.constantize
    protect_from_forgery with: :null_session, if: -> { request.format.json? }

    private

    def board_class
      StimulusKanbanRails.lookup_board(params[:resource])
    end

    def board_instance
      board_class.new(user: current_user_if_defined)
    end

    def current_user_if_defined
      respond_to?(:current_user, true) ? current_user : nil
    end

    # Scoped card lookup — goes through Board#scope(user) when the board
    # defines one, so ActsAsTenant (or any custom auth scope) constrains
    # what this user can reach. Falls back to model_class for boards that
    # haven't overridden scope. A card outside the scope raises
    # RecordNotFound rather than silently leaking across tenants. Mirrors
    # stimulus_grid_rails::BaseController#find_row!.
    def scoped_card(id)
      board = board_instance
      relation = board.respond_to?(:scope) ? board.scope(current_user_if_defined) : board_class.model_class
      relation.find(id)
    end
  end
end
