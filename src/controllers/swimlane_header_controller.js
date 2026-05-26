import { Controller } from '@hotwired/stimulus';
import { findParentController } from '../lib/dom.js';

/* swimlane-header controller — toggle a swimlane's collapse state.
 *
 * The header element itself is the click target (role="button",
 * tabindex="0", aria-expanded). `toggle` runs on click; `keydown`
 * forwards Enter / Space so keyboard users get the same affordance as
 * mouse users. */
export default class SwimlaneHeaderController extends Controller {
  static values = {
    value: { type: String, default: '' },
  };

  toggle(_ev) {
    const board = findParentController(this.element, 'board', this.application);
    if (!board) return;
    const v = this.valueValue || '';
    const set = board.state.collapsedSwimlanes;
    if (set.has(v)) set.delete(v); else set.add(v);
    board._scheduleRender?.();
  }

  keydown(ev) {
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
      ev.preventDefault();
      this.toggle(ev);
    }
  }
}
