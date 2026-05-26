import { Application } from '@hotwired/stimulus';
import './styles/stimulus_kanban.css';
import BoardController              from './controllers/board_controller.js';
import BoardColumnController        from './controllers/board_column_controller.js';
import CardController               from './controllers/card_controller.js';
import CardEditorController         from './controllers/card_editor_controller.js';
import SwimlaneHeaderController     from './controllers/swimlane_header_controller.js';
import ColumnMenuController         from './controllers/column_menu_controller.js';
import { registerRenderer, getRenderer, listRenderers, renderers, subRenderers } from './lib/renderers.js';

export {
  BoardController,
  BoardColumnController,
  CardController,
  CardEditorController,
  SwimlaneHeaderController,
  ColumnMenuController,
  registerRenderer,
  getRenderer,
  listRenderers,
  renderers,
  subRenderers,
};

/* Register every controller on a Stimulus Application and return it.
 *
 *   StimulusKanban.start()         // boot a new Application
 *   StimulusKanban.start(myApp)    // attach to an existing one (Rails / importmap)
 *
 * Idempotent at the controller level — Stimulus will warn if you re-register
 * the same identifier, but the window-level guard at the bottom ensures the
 * IIFE bundle doesn't double-start when included on two script tags. */
export function start(app) {
  const application = app ?? Application.start();
  application.register('board',            BoardController);
  application.register('board-column',     BoardColumnController);
  application.register('card',             CardController);
  application.register('card-editor',      CardEditorController);
  application.register('swimlane-header',  SwimlaneHeaderController);
  application.register('column-menu',      ColumnMenuController);
  return application;
}

const StimulusKanban = {
  start,
  BoardController,
  BoardColumnController,
  CardController,
  CardEditorController,
  SwimlaneHeaderController,
  ColumnMenuController,
  registerRenderer,
  getRenderer,
  listRenderers,
  renderers,
  subRenderers,
};

export default StimulusKanban;

if (typeof window !== 'undefined' && !window.__stimulusKanbanStarted) {
  window.__stimulusKanbanStarted = true;
  window.StimulusKanban = StimulusKanban;
}
