class SprintsController < ApplicationController
  # The only action this demo needs — every card mutation (create/update/move/
  # delete) flows through the engine's CardsController under /boards/stories/...
  def index
    @board   = SprintBoard.new(user: current_user_if_defined)
    @stories = Story.all
  end

  private

  def current_user_if_defined
    respond_to?(:current_user, true) ? current_user : nil
  end
end
