module StimulusKanbanRails
  # One column on a Board. Captures the lifecycle metadata: WIP limit,
  # accept_from chain, server-side sort mode, and whether the column is
  # editable in this user's context. Created via the `column` DSL inside a
  # Board subclass.
  class Column
    attr_reader :name, :title, :wip, :min_count, :accept_from, :sort, :width,
                :card_renderer, :card_editor, :color, :icon

    def initialize(name, title: nil, wip: nil, min_count: nil,
                   accept_from: nil, sort: "manual", width: nil,
                   card_renderer: nil, card_editor: nil,
                   color: nil, icon: nil,
                   editable: true, authorize: nil)
      @name          = name.to_sym
      @title         = title || name.to_s.humanize
      @wip           = wip
      @min_count     = min_count
      @accept_from   = accept_from && Array(accept_from).map(&:to_sym)
      @sort          = sort
      @width         = width
      @card_renderer = card_renderer
      @card_editor   = card_editor
      @color         = color
      @icon          = icon
      @editable      = editable
      @authorize     = authorize
    end

    # Per-user editable check. true/false constants short-circuit; lambdas
    # get (column, user).
    def editable_for?(user)
      case @editable
      when true, false then @editable
      when Proc then !!@editable.call(self, user)
      else !!@editable
      end
    end

    def authorized?(user, card)
      return true if @authorize.nil?
      !!@authorize.call(user, card)
    end

    # data-board-column-* serialization for the rendered <li>.
    def data_attrs
      out = {
        "data-controller"                              => "board-column",
        "data-board-column-id-value"                   => name,
        "data-board-column-title-value"                => title,
        "data-board-column-sort-value"                 => sort,
      }
      out["data-board-column-wip-value"]            = wip          if wip
      out["data-board-column-min-count-value"]      = min_count    if min_count
      out["data-board-column-width-value"]          = width        if width
      out["data-board-column-accept-cards-from-value"] = JSON.generate(accept_from.map(&:to_s)) if accept_from
      out["data-board-column-color-value"]          = color        if color
      out["data-board-column-icon-value"]           = icon         if icon
      out["data-board-column-card-renderer-value"]  = card_renderer if card_renderer
      out["data-board-column-card-editor-value"]    = card_editor   if card_editor
      out
    end
  end
end
