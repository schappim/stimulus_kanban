import { Controller } from '@hotwired/stimulus';
import { findParentController } from '../lib/dom.js';

/* card-editor controller — the controller half of the inline edit experience.
 *
 * Mounted on the cloned template (board_controller#startEditingCard adds
 * `data-controller="card-editor"` to the cloned element). Wires the keyboard
 * + button contract:
 *
 *   - Enter or click [data-editor-commit]  → board.commitEditing()
 *   - Esc or click [data-editor-cancel]    → board.cancelEditing()
 *   - Tab on the last [data-editor-field]  → commit (so editors with one
 *     field feel like inline cell edits)
 *   - blur on the form (focusout outside) → commit (idiomatic; host can
 *     suppress via data-editor-no-commit-on-blur)
 */
export default class CardEditorController extends Controller {
  static values = {
    cardId: { type: String, default: '' },
  };

  connect() {
    this.element.addEventListener('keydown', this._onKeyDown);
    this.element.addEventListener('click', this._onClick);
    this.element.addEventListener('focusout', this._onFocusOut);
    if (this.element.tagName === 'FORM') {
      this.element.addEventListener('submit', this._onSubmit);
    }
  }
  disconnect() {
    this.element.removeEventListener('keydown', this._onKeyDown);
    this.element.removeEventListener('click', this._onClick);
    this.element.removeEventListener('focusout', this._onFocusOut);
    if (this.element.tagName === 'FORM') {
      this.element.removeEventListener('submit', this._onSubmit);
    }
  }

  _onKeyDown = (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this._board()?.cancelEditing();
      return;
    }
    if (ev.key === 'Enter' && !ev.shiftKey && !this._isMultiline(ev.target)) {
      ev.preventDefault();
      this._board()?.commitEditing();
      return;
    }
    if (ev.key === 'Tab') {
      const fields = Array.from(this.element.querySelectorAll('[data-editor-field]'));
      if (fields.length && ev.target === fields[fields.length - 1] && !ev.shiftKey) {
        ev.preventDefault();
        this._board()?.commitEditing();
      }
    }
  };

  _onClick = (ev) => {
    const t = ev.target;
    if (t?.closest?.('[data-editor-commit]')) {
      ev.preventDefault();
      this._board()?.commitEditing();
      return;
    }
    if (t?.closest?.('[data-editor-cancel]')) {
      ev.preventDefault();
      this._board()?.cancelEditing();
    }
  };

  _onSubmit = (ev) => {
    ev.preventDefault();
    this._board()?.commitEditing();
  };

  _onFocusOut = (ev) => {
    if (this.element.hasAttribute('data-editor-no-commit-on-blur')) return;
    // If focus moved to something *inside* the editor, ignore.
    if (this.element.contains(ev.relatedTarget)) return;
    this._board()?.commitEditing();
  };

  _isMultiline(node) {
    if (!node) return false;
    if (node.tagName === 'TEXTAREA') return true;
    return node.hasAttribute?.('data-editor-multiline');
  }

  _board() { return findParentController(this.element, 'board', this.application); }
}
