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
    // dblclick → start inline edit, mirroring the grid's dblclick-to-edit UX.
    board.startEditingCard?.(id);
  };

  /* Imperative helpers — exposed for host glue */
  select() { this._board()?.selectCard?.(this._cardId()); }
  deselect() { this._board()?.deselectCard?.(this._cardId()); }
  edit() { this._board()?.startEditingCard?.(this._cardId()); }
  openDetail() { this._board()?.openCardDetail?.(this._cardId()); }
}
