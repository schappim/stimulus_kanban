module StimulusKanbanRails
  # GET    /boards/:resource/cards/:id          → show (used by sync revert)
  # POST   /boards/:resource/cards              → create
  # PATCH  /boards/:resource/cards/:id          → field update
  # PATCH  /boards/:resource/cards/:id/move     → move (column / index)
  # PATCH  /boards/:resource/cards/move_bulk    → atomic multi-card move
  # DELETE /boards/:resource/cards/:id          → destroy
  class CardsController < BaseController
    rescue_from StimulusKanbanRails::Veto, with: :render_veto

    def show
      card = scoped_card(params[:id])
      render json: { card: board_instance.card_to_h(card) }
    end

    def create
      card = board_class.model_class.new(card_params)
      if card.save
        render json: { card: board_instance.card_to_h(card) }, status: :created
      else
        render json: { errors: card.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      card = scoped_card(params[:id])
      field = params.require(:field)
      value = params.permit(:value)[:value]
      card._skr_optimistic_id = optimistic_id if card.respond_to?(:_skr_optimistic_id=)
      success, errors, payload = board_instance.apply_update!(card, field, value, user: current_user_if_defined)
      if success
        render json: { card: board_instance.card_to_h(card), update: payload, optimistic_id: optimistic_id }
      else
        render json: { errors: errors }, status: :unprocessable_entity
      end
    end

    def move
      card = scoped_card(params[:id])
      to_column_id = params.require(:to_column_id)
      to_index     = params.fetch(:to_index, 0).to_i
      card._skr_optimistic_id = optimistic_id if card.respond_to?(:_skr_optimistic_id=)
      _, mutations = board_instance.apply_move!(card, to_column_id: to_column_id, to_index: to_index, user: current_user_if_defined)
      render json: { card: board_instance.card_to_h(card), mutations: mutations, optimistic_id: optimistic_id }
    end

    def destroy
      card = scoped_card(params[:id])
      card.destroy
      head :no_content
    end

    # Atomic multi-card move. Same shape as the JS-side
    # `boardApi.bulkMove({ fromIds, toColumnId, toIndex })`. Runs every
    # card's before_move guard; raises Veto inside the transaction so all
    # writes roll back on the first refusal. Per-card broadcasts still
    # fire on the after_commit (each carries the optimistic_id so the
    # originator only suppresses these collectively).
    def move_bulk
      ids          = Array(params.require(:card_ids))
      to_column_id = params.require(:to_column_id)
      to_index     = params.fetch(:to_index, 0).to_i
      board        = board_instance
      moved        = []

      board_class.model_class.transaction do
        ids.each_with_index do |id, i|
          card = scoped_card(id)
          card._skr_optimistic_id = optimistic_id if card.respond_to?(:_skr_optimistic_id=)
          _, mutations = board.apply_move!(card, to_column_id: to_column_id, to_index: to_index + i, user: current_user_if_defined)
          moved << { card: board.card_to_h(card), mutations: mutations }
        end
      end

      render json: { moved: moved, optimistic_id: optimistic_id }
    end

    private

    def card_params
      raw = params.require(:card).permit!.to_h
      raw.symbolize_keys
    end

    # Pulled from the body, query string, or X-Optimistic-Id header — the
    # board-sync controller sends it as the header. Carried through into
    # the model's _skr_optimistic_id attr so the after_commit broadcast
    # includes it and the originating client can suppress its own echo.
    def optimistic_id
      params[:optimistic_id] || request.headers["X-Optimistic-Id"]
    end

    def render_veto(err)
      render json: { vetoed: true, message: err.message }, status: :unprocessable_entity
    end
  end
end
