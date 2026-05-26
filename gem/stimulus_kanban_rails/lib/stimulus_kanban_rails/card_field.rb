module StimulusKanbanRails
  # One declared field on a Card. Mirrors the per-cell column spec in
  # stimulus_grid_rails: type, editable predicate, validator list,
  # concurrency mode, and computed dependencies. The Board's
  # `card_field` DSL appends one of these.
  class CardField
    TYPES = %i[string text integer bigint decimal money boolean enum date datetime reference].freeze

    attr_reader :name, :type, :enum_values, :concurrency, :validators,
                :depends_on, :editor

    def initialize(name, type:, editable: false, editor: nil,
                   enum_values: nil, concurrency: :last_write_wins,
                   computed: false, depends_on: [], validate: nil)
      raise ArgumentError, "Unknown card_field type #{type.inspect}" unless TYPES.include?(type)
      @name        = name.to_sym
      @type        = type
      @editable    = editable
      @editor      = editor || default_editor_for(type)
      @enum_values = enum_values
      @concurrency = concurrency
      @computed    = computed
      @depends_on  = Array(depends_on)
      @validators  = Array(validate)
    end

    def editable_for?(card, user)
      case @editable
      when true, false then @editable
      when Proc then !!@editable.call(card, user)
      else !!@editable
      end
    end

    def computed? = @computed

    def coerce(raw)
      case @type
      when :string, :text, :enum, :reference then [raw.to_s, nil]
      when :integer, :bigint                 then [Integer(raw.to_s, 10), nil]
      when :decimal, :money                  then [BigDecimal(raw.to_s), nil]
      when :boolean                          then [%w[1 true yes on t].include?(raw.to_s.downcase), nil]
      when :date                             then [Date.parse(raw.to_s), nil]
      when :datetime                         then [Time.zone.parse(raw.to_s), nil]
      else                                       [raw, nil]
      end
    rescue ArgumentError, TypeError => e
      [nil, "invalid #{@type}: #{e.message}"]
    end

    def validate(value, card)
      @validators.flat_map do |v|
        result = v.call(value, card)
        case result
        when nil, true then []
        when String    then [result]
        when Array     then result
        else [result.to_s]
        end
      end
    end

    private

    def default_editor_for(t)
      case t
      when :string, :text, :reference   then "text"
      when :integer, :bigint, :decimal, :money then "number"
      when :boolean                     then "checkbox"
      when :enum                        then "select"
      when :date                        then "date"
      when :datetime                    then "datetime-local"
      else "text"
      end
    end
  end
end
