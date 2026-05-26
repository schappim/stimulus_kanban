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
  end
end
