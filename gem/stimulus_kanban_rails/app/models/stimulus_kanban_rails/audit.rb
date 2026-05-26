module StimulusKanbanRails
  # Opt-in audit log for boards. Migration in db/migrate creates the table;
  # records are appended by the cards controller on every move / update /
  # destroy. Forms the basis of undo/redo (the controller pops the latest
  # entry for the (resource, user) pair and reverses the recorded mutation).
  class Audit < ActiveRecord::Base
    self.table_name = "stimulus_kanban_audits"

    enum kind: { create: 0, update: 1, move: 2, destroy: 3 }

    validates :resource, :card_id, :kind, presence: true
  end
end
