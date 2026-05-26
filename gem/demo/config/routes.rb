Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # ActionCable channel for live Turbo Stream broadcasts. Required for
  # multi-user real-time sync — every board's after_commit broadcast
  # flows through this channel.
  mount ActionCable.server => "/cable"

  # Mount the engine. All of the cards endpoints — create / update / move /
  # move_bulk / destroy / show — live under this prefix.
  mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path,
        as: :stimulus_kanban_rails

  resources :sprints, only: %i[index]

  root "sprints#index"
end
