import { Controller } from '@hotwired/stimulus';
import { findParentController } from '../lib/dom.js';

/* swimlane-header controller — toggle a swimlane's collapse state.
 *
 * The board controller renders a header row per swimlane bucket with a
 * collapse caret. This controller is the action target — `data-action`
 * wired in the rendered markup calls swimlane-header#toggle, which flips
 * the board's `collapsedSwimlanes` set and triggers a re-render. */
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
}
