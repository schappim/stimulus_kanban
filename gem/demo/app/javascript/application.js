// Entry point for the demo app, managed by importmap.
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusKanban       from "stimulus_kanban"
import StimulusKanbanRails  from "stimulus_kanban_rails"

const application = Application.start()
application.debug = false
window.Stimulus = application

// Register the base board controllers (board, board-column, card, card-editor, …)
StimulusKanban.start(application)
// Register the Rails sync layer (board-sync — PATCHes moves, applies broadcasts).
StimulusKanbanRails.start(application)
