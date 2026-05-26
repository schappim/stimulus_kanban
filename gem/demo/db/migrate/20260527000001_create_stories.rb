class CreateStories < ActiveRecord::Migration[7.2]
  def change
    create_table :stories do |t|
      t.string  :title,     null: false
      t.string  :column_id, null: false, default: "backlog"
      t.integer :position,  null: false, default: 0
      t.integer :points
      t.string  :assignee
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_index :stories, [:column_id, :position]
  end
end
