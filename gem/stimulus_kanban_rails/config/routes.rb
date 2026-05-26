StimulusKanbanRails::Engine.routes.draw do
  resources :boards, only: [], param: :resource do
    # `show` is needed by the board-sync controller's _revert path: when a
    # move PATCH fails (server vetoed it), the JS refetches the canonical
    # card and applies it back via applyTransaction. Without this route the
    # revert silently 404s and the optimistic move stays applied.
    resources :cards, controller: "cards", only: %i[show create update destroy] do
      member do
        patch :move
      end
      collection do
        # Atomic bulk-move endpoint backing the bulk-action toolbar:
        # PATCH /boards/:resource/cards/move_bulk
        #   body: { card_ids: [...], to_column_id:, to_index: }
        # Runs the board's before_move chain for every card in a single
        # transaction so a Veto on any one card rolls back the lot.
        patch :move_bulk
      end
    end
  end
end
