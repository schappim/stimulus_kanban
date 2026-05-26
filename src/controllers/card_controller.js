import { Controller } from '@hotwired/stimulus';
import { findParentController, emit } from '../lib/dom.js';

/* card controller — attached to each rendered card wrapper.
 *
 * Slim adapter. The board controller handles the drag, the keyboard, and
 * the selection model. This controller exists so a host page can:
 *   - listen for click / dblclick on a card without hand-rolling the
 *     `[data-card-id]` event delegation,
 *   - call `cardController.select()` from arbitrary glue code,
 *   - declare a card-level `data-controller="card"` (Stimulus will report on
 *     connect/disconnect for hot-swap rendering — useful if the board's data
 *     changes under a Turbo Stream).
 */
export default class CardController extends Controller {
  connect() {
    this.element.addEventListener('click', this._onClick);
    this.element.addEventListener('dblclick', this._onDblClick);
  }
  disconnect() {
    this.element.removeEventListener('click', this._onClick);
    this.element.removeEventListener('dblclick', this._onDblClick);
  }

  _board() { return findParentController(this.element, 'board', this.application); }
  _cardId() { return this.element.getAttribute('data-card-id'); }
  _card()   {
    const board = this._board();
    if (!board) return null;
    const id = this._cardId();
    return board.state.cards.find((c) => String(c[board.getCardIdValue]) === String(id)) || null;
  }

  _onClick = (ev) => {
    const board = this._board(); if (!board) return;
    const id = this._cardId();
    const card = this._card();
    const colId = card?.[board.getColumnIdValue] ?? null;
    emit(this.element, 'board:cardClicked', { cardId: id, card, columnId: colId, originalEvent: ev });

    // Always activate the clicked card. The keyboard handler (Enter to open
    // detail / editor, arrows to move) needs an active card; without this,
    // a fresh click→Enter sequence does nothing because activeCardId is null.
    board._setActive?.(id);

    if (board.suppressCardClickSelectionValue) return;
    if (board.cardSelectionValue === '') return;
    const meta = ev.metaKey || ev.ctrlKey;
    const shift = ev.shiftKey;
    if (board.cardSelectionValue === 'multiple' && (meta || shift || board.cardMultiSelectWithClickValue)) {
      board.toggleSelection(id);
    } else {
      board.clearSelection?.();
      board.selectCard(id);
    }
  };

  _onDblClick = (ev) => {
    const board = this._board(); if (!board) return;
    const id = this._cardId();
    const card = this._card();
    const colId = card?.[board.getColumnIdValue] ?? null;
    emit(this.element, 'board:cardDblClicked', { cardId: id, card, columnId: colId });
    // Prefer the detail panel when a template is wired up — mirrors the
    // keyboard Enter handler so dblclick + Enter behave the same way.
    // Without this, demos with only a detail template (no editor) never
    // surface their panel from a plain dblclick.
    if (board.cardDetailTemplateValue) {
      board.openCardDetail?.(id);
    } else {
      board.startEditingCard?.(id);
    }
  };

  /* Imperative helpers — exposed for host glue */
  select() { this._board()?.selectCard?.(this._cardId()); }
  deselect() { this._board()?.deselectCard?.(this._cardId()); }
  edit() { this._board()?.startEditingCard?.(this._cardId()); }
  openDetail() { this._board()?.openCardDetail?.(this._cardId()); }
}
