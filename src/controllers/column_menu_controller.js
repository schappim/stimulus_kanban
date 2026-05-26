import { Controller } from '@hotwired/stimulus';
import { findParentController, el } from '../lib/dom.js';

/* column-menu controller — right-click context menu over a column.
 *
 * Built lazily on the first contextmenu event so it's free for boards that
 * never use it. Items: Collapse / Expand, Hide column, Clear WIP, Sort
 * Manual/Asc-by-title/Desc-by-title. Host apps can ignore this entirely and
 * roll their own column header UI. */
export default class ColumnMenuController extends Controller {
  static values = {
    columnId: { type: String, default: '' },
  };

  connect() {
    this.element.addEventListener('contextmenu', this._open);
  }
  disconnect() {
    this.element.removeEventListener('contextmenu', this._open);
    this._dismiss();
  }

  _open = (ev) => {
    ev.preventDefault();
    this._dismiss();
    const board = findParentController(this.element, 'board', this.application);
    if (!board) return;
    const colId = this.columnIdValue || this.element.getAttribute('data-board-column-id-value') || '';
    if (!colId) return;
    const col = board._columnById?.(colId);
    if (!col) return;
    const menu = el('div', {
      class: 'sk-column-menu',
      style: `position:fixed;left:${ev.clientX}px;top:${ev.clientY}px;z-index:9999;`,
    }, [
      el('button', { type: 'button', class: 'sk-menu-item',
        text: col.collapsed ? 'Expand column' : 'Collapse column',
        onclick: () => { board.setColumnCollapsed(colId, !col.collapsed); this._dismiss(); } }),
      el('button', { type: 'button', class: 'sk-menu-item',
        text: 'Hide column',
        onclick: () => { board.setColumnVisible(colId, false); this._dismiss(); } }),
      col.wip != null
        ? el('button', { type: 'button', class: 'sk-menu-item',
            text: 'Clear WIP limit',
            onclick: () => { board.setColumnWip(colId, null); this._dismiss(); } })
        : null,
      el('hr', { class: 'sk-menu-sep' }),
      el('button', { type: 'button', class: 'sk-menu-item',
        text: 'Sort: Manual',
        onclick: () => { board.setColumnSort(colId, 'manual'); this._dismiss(); } }),
      el('button', { type: 'button', class: 'sk-menu-item',
        text: 'Sort: Title ↑',
        onclick: () => { board.setColumnSort(colId, 'asc:title'); this._dismiss(); } }),
      el('button', { type: 'button', class: 'sk-menu-item',
        text: 'Sort: Title ↓',
        onclick: () => { board.setColumnSort(colId, 'desc:title'); this._dismiss(); } }),
    ].filter(Boolean));
    document.body.appendChild(menu);
    this._menu = menu;
    setTimeout(() => document.addEventListener('click', this._dismiss, { once: true }), 0);
  };

  _dismiss = () => {
    this._menu?.remove();
    this._menu = null;
  };
}
