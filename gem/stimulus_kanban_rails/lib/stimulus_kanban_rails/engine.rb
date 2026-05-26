require "rails/engine"
require "turbo-rails"
require "stimulus-rails"
require "importmap-rails"

module StimulusKanbanRails
  class Engine < ::Rails::Engine
    isolate_namespace StimulusKanbanRails

    initializer "stimulus_kanban_rails.assets" do |app|
      if app.config.respond_to?(:assets)
        app.config.assets.precompile += %w[
          stimulus_kanban.js
          stimulus_kanban_rails.js
          stimulus_kanban.css
          stimulus_kanban_rails.css
        ]
      end
    end

    initializer "stimulus_kanban_rails.importmap", before: "importmap" do |app|
      if app.config.respond_to?(:importmap)
        app.config.importmap.paths << Engine.root.join("config/importmap.rb")
        app.config.importmap.cache_sweepers << Engine.root.join("app/assets/javascripts")
      end
    end

    initializer "stimulus_kanban_rails.view_paths" do |app|
      ActiveSupport.on_load(:action_controller) do
        append_view_path StimulusKanbanRails::Engine.root.join("app/views")
      end
    end
  end
end
