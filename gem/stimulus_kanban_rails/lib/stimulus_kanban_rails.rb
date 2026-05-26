require "stimulus_kanban_rails/version"
require "stimulus_kanban_rails/engine"
require "stimulus_kanban_rails/board"
require "stimulus_kanban_rails/column"
require "stimulus_kanban_rails/card_field"
require "stimulus_kanban_rails/turbo_streams_helper"
require "stimulus_kanban_rails/concerns/broadcastable"

# Rails companion for the stimulus_kanban JS package.
#
# Boards declare their columns, card-field schema, workflow guards and
# authorization via a Ruby DSL (StimulusKanbanRails::Board). The engine ships:
#
#   - a tenant-scoped Turbo Stream broadcaster (Broadcastable concern);
#   - cards controller endpoints for move / update / create / destroy;
#   - audit-log + undo/redo migrations (opt-in);
#   - view partials that render a board from a Board instance + a card
#     relation;
#   - importmap pins for the upstream JS package + this engine's sync layer.
#
# Configure once in an initializer:
#
#   # config/initializers/stimulus_kanban_rails.rb
#   StimulusKanbanRails.parent_controller = "ApplicationController"
#   StimulusKanbanRails.mount_path        = "/boards"
#
# Then mount the engine:
#
#   # config/routes.rb
#   mount StimulusKanbanRails::Engine => StimulusKanbanRails.mount_path
module StimulusKanbanRails
  # Raised inside a `before_move` lambda to refuse a drop. The cards
  # controller catches Veto, reverts the optimistic move client-side, and
  # surfaces the message in `board:beforeMove` cancellation.
  class Veto < StandardError; end

  class << self
    # Base class for the gem's controllers. Set to your authenticated base
    # controller so Devise / ActsAsTenant before_actions apply to the cards
    # endpoints too — otherwise they'd run unauthenticated.
    attr_writer :parent_controller

    def parent_controller
      @parent_controller ||= "ApplicationController"
    end

    # Where the engine is mounted; the client-side endpoints are built off
    # this. Must match `mount StimulusKanbanRails::Engine => ...`.
    def mount_path
      @mount_path || "/boards"
    end

    def mount_path=(path)
      @mount_path = path.to_s.sub(%r{/+\z}, "")
    end
  end

  def self.registry
    @registry ||= {}
  end

  def self.register_board(resource, klass)
    registry[resource.to_s] = klass
  end

  def self.lookup_board(resource)
    registry[resource.to_s] or
      raise ArgumentError, "No board registered for resource #{resource.inspect}. " \
                           "Did you define a Board subclass and reference it from a view?"
  end

  # Tenant-isolation token — mirrors stimulus_grid_rails. Same broadcaster +
  # subscriber tokens means a per-tenant broadcast can never leak to another
  # tenant's tabs.
  def self.tenant_stream_token
    return nil unless defined?(ActsAsTenant) && ActsAsTenant.respond_to?(:current_tenant)
    tenant = ActsAsTenant.current_tenant
    tenant ? "skr-tenant:#{tenant.class.name}:#{tenant.id}" : nil
  end

  def self.streamables_for(resource, *extra)
    [tenant_stream_token, "skr-board:#{resource}", *extra].compact
  end
end
