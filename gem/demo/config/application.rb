require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_view/railtie"
require "action_cable/engine"  # for turbo_stream_from + Turbo::StreamsChannel broadcasts
require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Demo
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.2

    # Pick up Board subclasses dropped into app/boards/ alongside the
    # framework's default app/* autoload paths. Rails autoloads anything
    # under app/* automatically; this line is explicit only because the
    # path name doesn't match a stock Rails directory.
    config.autoload_paths += %W[#{config.root}/app/boards]
    config.eager_load_paths += %W[#{config.root}/app/boards]

    config.autoload_lib(ignore: %w[assets tasks])

    # Don't generate system test files.
    config.generators.system_tests = nil
  end
end
