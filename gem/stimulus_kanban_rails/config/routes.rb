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
    end
  end
end
