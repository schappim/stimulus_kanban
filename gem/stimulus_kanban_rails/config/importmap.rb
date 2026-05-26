# Importmap pins for host apps. Re-exports the upstream JS package +
# this engine's Turbo Stream sync layer under stable identifiers so a host
# can do:
#
#   import "stimulus_kanban"
#   import "stimulus_kanban_rails"
#
# without vendoring anything.
pin "stimulus_kanban",       to: "stimulus_kanban.js"
pin "stimulus_kanban_rails", to: "stimulus_kanban_rails.js"
