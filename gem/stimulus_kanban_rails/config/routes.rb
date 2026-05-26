StimulusKanbanRails::Engine.routes.draw do
  resources :boards, only: [], param: :resource do
    resources :cards, controller: "cards", only: %i[create update destroy] do
      member do
        patch :move
      end
    end
  end
end
