require "bigdecimal"
require "json"

module StimulusKanbanRails
  # Base class for declaring a server-side kanban board. One subclass per
  # logical board (e.g. SprintBoard, IncidentBoard, LeadsBoard). The DSL is
  # deliberately small and Rails-idiomatic — columns, card fields, before-move
  # guards, stream name, optional authorization scope.
  #
  #   class SprintBoard < StimulusKanbanRails::Board
  #     resource :stories
  #     model    Story
  #     stream_name { |_user| "sprint:current" }
  #
  #     column :backlog, title: "Backlog"
  #     column :todo,    title: "To do",  wip: 5
  #     column :doing,   title: "Doing",  wip: 3, accept_from: %i[todo backlog]
  #     column :review,  title: "Review", wip: 2, accept_from: %i[doing]
  #     column :done,    title: "Done",   accept_from: %i[review]
  #
  #     card_field :title,  type: :string,  editable: true
  #     card_field :points, type: :integer, editable: true,
  #                         validate: ->(v, _) { "must be 1–13" unless (1..13).cover?(v.to_i) }
  #
  #     before_move ->(card, from:, to:, user:) {
  #       raise StimulusKanbanRails::Veto, "Story must have points" if to == :doing && card.points.blank?
  #     }
  #   end
  class Board
    class << self
      attr_reader :resource_name, :model_class, :columns_registry,
                  :card_fields_registry, :before_move_hooks

      def resource(name)
        @resource_name = name.to_s
        StimulusKanbanRails.register_board(@resource_name, self)
      end

      def model(klass)
        @model_class = klass
      end

      def column(name, **opts)
        @columns_registry ||= {}
        @columns_registry[name.to_sym] = Column.new(name, **opts)
      end

      def card_field(name, **opts)
        @card_fields_registry ||= {}
        @card_fields_registry[name.to_sym] = CardField.new(name, **opts)
      end

      def before_move(callable)
        @before_move_hooks ||= []
        @before_move_hooks << callable
      end

      # Per-user stream name — yielded to the broadcaster + the subscriber so
      # they share a token. Default: "#{resource}:default".
      def stream_name(&block)
        if block_given?
          @stream_name_proc = block
        else
          @stream_name_proc || ->(_user) { "#{@resource_name}:default" }
        end
      end

      def resolve_column!(col_id)
        col = columns_registry&.[](col_id.to_sym)
        raise ArgumentError, "Unknown column #{col_id} on #{name}" unless col
        col
      end
    end

    attr_reader :user

    def initialize(user: nil)
      @user = user
    end

    def columns; (self.class.columns_registry || {}).values; end
    def card_fields; (self.class.card_fields_registry || {}).values; end

    # The base relation visible to the cards controller. Override for per-user
    # authorization scoping (e.g. `model_class.where(account: user.account)`).
    # ActsAsTenant's default_scope is honoured automatically because we go
    # through `model_class.all` instead of an unscoped find.
    def scope(_user = user)
      self.class.model_class.all
    end

    # Returns the column id (Symbol) the given AR record currently lives in.
    # Boards customise by overriding — the default looks for `column_id`.
    def column_id_for(card)
      raw = card.respond_to?(:column_id) ? card.column_id : card[:column_id]
      raw && raw.to_sym
    end

    # Update the record's column membership + ordering. Default writes
    # column_id + position; override for non-positional schemas.
    def assign_column!(card, to_column_id, to_index)
      card.column_id = to_column_id.to_s if card.respond_to?(:column_id=)
      card.position  = to_index          if card.respond_to?(:position=)
    end

    # Run the before_move chain. Raises Veto with a message on refusal.
    def run_before_move!(card, from:, to:, user:)
      (self.class.before_move_hooks || []).each do |hook|
        hook.call(card, from: from, to: to, user: user)
      end
    end

    # Apply a move to a single card and persist. Returns the (possibly
    # updated) card and a list of mutations to broadcast.
    def apply_move!(card, to_column_id:, to_index:, user: nil)
      from = column_id_for(card)
      to   = to_column_id.to_sym
      run_before_move!(card, from: from, to: to, user: user || self.user)
      assign_column!(card, to, to_index)
      card.save! if card.respond_to?(:save!)
      [card, [{ card_id: card.id, from_column_id: from, to_column_id: to, to_index: to_index }]]
    end

    # Apply a field update with coercion + validation. Returns [success?,
    # errors_array, broadcast_payload].
    def apply_update!(card, field_name, raw_value, user: nil)
      field = self.class.card_fields_registry&.[](field_name.to_sym)
      return [false, ["Unknown field #{field_name}"], nil] unless field
      return [false, ["Field not editable"], nil] unless field.editable_for?(card, user || self.user)
      value, err = field.coerce(raw_value)
      return [false, [err], nil] if err
      errors = field.validate(value, card)
      return [false, errors, nil] if errors.any?
      card.send("#{field.name}=", value) if card.respond_to?("#{field.name}=")
      card.save! if card.respond_to?(:save!)
      [true, [], { card_id: card.id, field: field.name.to_s, value: value }]
    end

    # JSON-friendly card hash for the wire / row_to_json equivalent.
    def card_to_h(card)
      h = { "id" => card.id, "column_id" => column_id_for(card).to_s }
      (self.class.card_fields_registry || {}).each_value do |f|
        next if f.name.to_s.start_with?("_")
        v = card.respond_to?(f.name) ? card.send(f.name) : card[f.name]
        h[f.name.to_s] = serialize_value(v, f)
      end
      h["order"] = card.position if card.respond_to?(:position)
      h
    end

    def serialize_value(v, field)
      case field.type
      when :integer, :bigint then v.to_i
      when :decimal, :money  then v.to_f
      when :boolean          then !!v
      when :date             then v.respond_to?(:to_date) ? v.to_date.iso8601 : v
      when :datetime         then v.respond_to?(:iso8601) ? v.iso8601 : v
      else v
      end
    end
  end
end
