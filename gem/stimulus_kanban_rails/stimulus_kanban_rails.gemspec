require_relative "lib/stimulus_kanban_rails/version"

Gem::Specification.new do |spec|
  spec.name        = "stimulus_kanban_rails"
  spec.version     = StimulusKanbanRails::VERSION
  spec.authors     = ["Marcus Schappi"]
  spec.email       = ["marcus@chickcom.com"]

  spec.summary     = "Hotwire / Turbo Streams companion gem for the stimulus_kanban JS package."
  spec.description = "Live multi-user kanban boards over Turbo Streams + Action Cable. " \
                     "Server-side column registry, card-field schema with coercion + validation, " \
                     "before-move workflow guards, tenant-scoped broadcasts, optional audit log + undo/redo."
  spec.homepage    = "https://github.com/schappim/stimulus_kanban"
  spec.license     = "MIT"

  spec.required_ruby_version = ">= 3.1"

  spec.files = Dir[
    "{app,config,db,lib}/**/*",
    "MIT-LICENSE",
    "Rakefile",
    "README.md",
  ]

  spec.add_dependency "rails",          ">= 7.1"
  spec.add_dependency "turbo-rails",    ">= 2.0"
  spec.add_dependency "stimulus-rails", ">= 1.3"
  spec.add_dependency "importmap-rails",">= 2.0"
end
