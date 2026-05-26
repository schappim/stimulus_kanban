# Seed a single sprint with stories scattered across the columns. Enough
# variety to actually drive every board feature: WIP-trigger, accept_from
# block, before_move veto, multi-select bulk-move, swimlane potential.

Story.delete_all

seeds = [
  { column_id: "backlog", title: "Bathroom rough-in",                   points: 8,  assignee: "Dave" },
  { column_id: "backlog", title: "Quote — laundry plumbing",            points: 2,  assignee: "Mia" },
  { column_id: "backlog", title: "Annual gas-safety report",            points: nil, assignee: nil  },
  { column_id: "backlog", title: "Switchboard upgrade ×4",              points: 5,  assignee: "Noah" },
  { column_id: "backlog", title: "Pool pump + spa wiring",              points: nil, assignee: nil  },

  { column_id: "todo",    title: "Leaking kitchen tap",                 points: 1,  assignee: "Dave" },
  { column_id: "todo",    title: "Toilet running constantly",           points: 2,  assignee: "Sam" },
  { column_id: "todo",    title: "HWS replace 250L (gas)",              points: 5,  assignee: "Dave" },

  { column_id: "doing",   title: "Café espresso plumbing tie-in",       points: 8,  assignee: "Mia" },
  { column_id: "doing",   title: "Sewer line excavate + cap",           points: 13, assignee: "Dave" },

  { column_id: "review",  title: "Methven tapware (kitchen)",           points: 3,  assignee: "Sam" },

  { column_id: "done",    title: "Mixer tap drips slow",                points: 1,  assignee: "Sam" },
  { column_id: "done",    title: "Annual gas-safety (12 units)",        points: 8,  assignee: "Mia" },
]

seeds.each_with_index do |s, i|
  Story.create!(s.merge(position: i))
end

puts "Seeded #{Story.count} stories across #{Story.distinct.pluck(:column_id).size} columns."
