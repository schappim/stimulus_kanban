class CreateStimulusKanbanAudits < ActiveRecord::Migration[7.2]
  def change
    create_table :stimulus_kanban_audits do |t|
      t.string  :resource,     null: false, index: true
      t.string  :card_id,      null: false, index: true
      t.integer :kind,         null: false   # enum: create / update / move / destroy
      t.string  :user_id,                   index: true
      t.string  :field
      t.text    :before
      t.text    :after
      t.string  :from_column_id
      t.string  :to_column_id
      t.integer :to_index
      t.timestamps
    end
  end
end
