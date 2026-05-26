# Importmap pins exposed to host apps. Loaded by the engine initializer.
# Both JS files are shipped from the gem's app/assets/javascripts/ so a host
# can `import "stimulus_kanban"` / `import "stimulus_kanban_rails"` without
# touching npm. Mirrors stimulus_grid_rails's importmap layout.
pin "stimulus_kanban",       to: "stimulus_kanban.js",       preload: true
pin "stimulus_kanban_rails", to: "stimulus_kanban_rails.js", preload: true
