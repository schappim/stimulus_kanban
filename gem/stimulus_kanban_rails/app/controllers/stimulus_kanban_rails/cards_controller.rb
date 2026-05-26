module StimulusKanbanRails
  # POST   /boards/:resource/cards          → create
  # PATCH  /boards/:resource/cards/:id      → field update
  # PATCH  /boards/:resource/cards/:id/move → move (column / index)
  # DELETE /boards/:resource/cards/:id      → destroy
  class CardsController < BaseController
    rescue_from StimulusKanbanRails::Veto, with: :render_veto

    def create
      card = board_class.model_class.new(card_params)
      if card.save
        render json: { card: board_instance.card_to_h(card) }, status: :created
      else
        render json: { errors: card.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      card = board_class.model_class.find(params[:id])
      field = params.require(:field)
      value = params.permit(:value)[:value]
      success, errors, payload = board_instance.apply_update!(card, field, value, user: current_user_if_defined)
      if success
        render json: { card: board_instance.card_to_h(card), update: payload }
      else
        render json: { errors: errors }, status: :unprocessable_entity
      end
    end

    def move
      card = board_class.model_class.find(params[:id])
      to_column_id = params.require(:to_column_id)
      to_index     = params.fetch(:to_index, 0).to_i
      _, mutations = board_instance.apply_move!(card, to_column_id: to_column_id, to_index: to_index, user: current_user_if_defined)
      render json: { card: board_instance.card_to_h(card), mutations: mutations }
    end

    def destroy
      card = board_class.model_class.find(params[:id])
      card.destroy
      head :no_content
    end

    private

    def card_params
      raw = params.require(:card).permit!.to_h
      raw.symbolize_keys
    end

    def render_veto(err)
      render json: { vetoed: true, message: err.message }, status: :unprocessable_entity
    end
  end
end
