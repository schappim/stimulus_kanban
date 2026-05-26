import { Controller } from '@hotwired/stimulus';
import { findParentController, emit } from '../lib/dom.js';

/* board-column controller — attached to each column root.
 *
 * 99% of column behaviour lives in the parent board controller (it owns the
 * data + the render). This controller is a thin per-column adapter that:
 *   - lets host markup declare column attributes in a clean per-column scope,
 *   - exposes click/collapse hooks for the column header,
 *   - re-exports the column-level value attributes for Stimulus to parse on
 *     connect (the board controller reads them straight from DOM).
 */
export default class BoardColumnController extends Controller {
  static values = {
    id:              { type: String,  default: '' },
    title:           { type: String,  default: '' },
    wip:             { type: Number,  default: 0 },
    minCount:        { type: Number,  default: 0 },
    width:           { type: Number,  default: 0 },
    collapsed:       { type: Boolean, default: false },
    hidden:          { type: Boolean, default: false },
    acceptCardsFrom: { type: Array,   default: [] },
    disallowDrag:    { type: Boolean, default: false },
    sort:            { type: String,  default: 'manual' },
    cardRenderer:    { type: String,  default: '' },
    cardEditor:      { type: String,  default: '' },
    addCardLabel:    { type: String,  default: '' },
    color:           { type: String,  default: '' },
    icon:            { type: String,  default: '' },
  };

  connect() {
    this.element.addEventListener('click', this._onHeaderClick);
  }
  disconnect() {
    this.element.removeEventListener('click', this._onHeaderClick);
  }

  /* Header double-click toggles collapse — same UX as Trello's column menu
   * shortcut. Single click just emits a discoverable event so host apps can
   * wire a custom column menu. */
  _onHeaderClick = (ev) => {
    const header = ev.target?.closest?.('.sk-column-header');
    if (!header || !this.element.contains(header)) return;
    if (ev.detail === 2) {
      this._board()?.setColumnCollapsed?.(this.idValue, !this.collapsedValue);
      return;
    }
    emit(this.element, 'board:columnHeaderClicked', { columnId: this.idValue, originalEvent: ev });
  };

  toggle() {
    this._board()?.setColumnCollapsed?.(this.idValue, !this.collapsedValue);
  }

  _board() {
    return findParentController(this.element, 'board', this.application);
  }
}
