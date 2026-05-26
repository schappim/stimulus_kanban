# Configure the kanban engine — these can be overridden per environment.
#
# `parent_controller` makes the gem's controllers inherit ApplicationController
# so any Devise / ActsAsTenant before_actions run on the kanban endpoints too.
StimulusKanbanRails.parent_controller = "ApplicationController"

# Where the engine is mounted; the client-side board-sync controller builds
# its PATCH/POST URLs from this. Default "/boards".
# StimulusKanbanRails.mount_path = "/boards"
