/* Factory for the public `boardApi` exposed on the board element.
 *
 * The board controller assigns this object to `element.boardApi` in `connect`
 * and emits `board:ready` with `{ api }` so callers don't need to wait for a
 * specific event lifecycle to grab it — both paths work.
 *
 * Every method here is a thin pass-through to the controller. Heavy lifting
 * lives in board_controller.js (or in src/lib/model.js for pure reducers); the
 * api layer's job is naming and JSDoc-friendly grouping. */

export function createBoardApi(board) {
  return {
    // ---- Data ----
    setCardData(cards)        { board.setCardData(cards); },
    getCardData()             { return board.getCardData(); },
    setColumnData(cols)       { board.setColumnData(cols); },
    getColumnData()           { return board.getColumnData(); },
    applyTransaction(tx)      { return board.applyTransaction(tx); },
    setColumnCounts(counts)   { board.setColumnCounts(counts); },
    getColumnCounts()         { return board.getColumnCounts(); },

    // ---- Card selection ----
    getSelectedCardIds()      { return board.getSelectedCardIds(); },
    getSelectedCards()        { return board.getSelectedCards(); },
    selectCard(id)            { board.selectCard(id); },
    deselectCard(id)          { board.deselectCard(id); },
    selectAllInColumn(colId)  { board.selectAllInColumn(colId); },
    clearSelection()          { board.clearSelection(); },

    // ---- Movement ----
    moveCard(cardId, target)               { return board.moveCard(cardId, target); },
    moveCards(cardIds, target)             { return board.moveCards(cardIds, target); },
    reorderCardWithinColumn(cardId, toIndex){ return board.reorderCardWithinColumn(cardId, toIndex); },
    bulkMove({ fromIds, toColumnId, toIndex }) {
      return board.moveCards(fromIds, { toColumnId, toIndex });
    },

    // ---- Columns ----
    setColumnVisible(colId, visible)   { board.setColumnVisible(colId, visible); },
    setColumnCollapsed(colId, on)      { board.setColumnCollapsed(colId, on); },
    setColumnWidth(colId, px)          { board.setColumnWidth(colId, px); },
    moveColumn(colId, toIndex)         { board.moveColumn(colId, toIndex); },
    setColumnWip(colId, limit)         { board.setColumnWip(colId, limit); },
    setColumnAcceptFrom(colId, ids)    { board.setColumnAcceptFrom(colId, ids); },
    sizeColumnsToFit()                 { board.sizeColumnsToFit(); },

    // ---- Swimlanes ----
    setSwimlaneField(field)            { board.setSwimlaneField(field); },
    getSwimlaneField()                 { return board.state.swimlaneField || ''; },
    setSwimlaneCollapsed(value, on)    { board.setSwimlaneCollapsed(value, on); },
    getSwimlaneCollapsedSet()          { return new Set(board.state.collapsedSwimlanes); },

    // ---- Sort ----
    setColumnSort(colId, sort)         { board.setColumnSort(colId, sort); },
    getColumnSort(colId)               { return board.getColumnSort(colId); },

    // ---- Filter & search ----
    setQuickFilter(q)                  { board.setQuickFilter(q); },
    getQuickFilter()                   { return board.state.quickFilter || ''; },
    setCardFilter(predicate)           { board.setCardFilter(predicate); },
    getCardFilter()                    { return board.state.predicate || null; },

    // ---- Editing ----
    startEditingCard(cardId)           { return board.startEditingCard(cardId); },
    commitEditing()                    { return board.commitEditing(); },
    cancelEditing()                    { return board.cancelEditing(); },

    // ---- Drag programmatic ----
    beginDrag(cardIds, fromColumnId)   { return board.beginDrag(cardIds, fromColumnId); },
    endDrag(target)                    { return board.endDrag(target); },

    // ---- WIP ----
    getWipState()                      { return board.getWipState(); },

    // ---- Aging / time-in-column ----
    getCardEnteredAt(cardId)           { return board.getCardEnteredAt(cardId); },
    getCardAgeInColumn(cardId, now)    { return board.getCardAgeInColumn(cardId, now); },
    getStuckCardIds(now)               { return board.getStuckCardIds(now); },
    setAgingClock(fn) {
      // Replace the controller's "now" provider — useful for tests / demos
      // where you want deterministic ages. Pass `null` to restore the
      // wall-clock default.
      if (typeof fn === 'function') board._aging_now = fn;
      else board._aging_now = () => new Date().toISOString();
      board._decorateStuckCards();
    },

    // ---- Persistence ----
    getBoardState()                    { return board.getBoardState(); },
    applyBoardState(state)             { return board.applyBoardState(state); },
    clearPersistedState()              { return board.clearPersistedState(); },
    getPersistKey()                    { return board.persistKeyValue || ''; },

    // ---- Export ----
    getDataAsJson()                    { return board.getDataAsJson(); },
    getDataAsCsv(opts = {})            { return board.getDataAsCsv(opts); },

    // ---- Detail panel ----
    openCardDetail(cardId)             { return board.openCardDetail(cardId); },
    closeCardDetail()                  { return board.closeCardDetail(); },
    isCardDetailOpen()                 { return !!board.state.openDetailCardId; },

    // ---- Events (convenience) ----
    addEventListener(type, handler)    { board.element.addEventListener(type, handler); },
    removeEventListener(type, handler) { board.element.removeEventListener(type, handler); },
  };
}
