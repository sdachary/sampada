# frozen_string_literal: true

# ponytail: shared index/show/create/update/destroy for user-scoped resources.
# Usage:
#   include ScopedCrud
#   crud_for :goals, serialize: :goal_json, params: :goal_params
# Optional private overrides: scope_index(rel) to extend the index query,
# destroy_response(record) to customize destroy (default: head :no_content).
module ScopedCrud
  extend ActiveSupport::Concern

  class_methods do
    attr_reader :crud_resource, :crud_serializer, :crud_params_method

    def crud_for(resource, serialize:, params:)
      @crud_resource = resource
      @crud_serializer = serialize
      @crud_params_method = params
    end
  end

  def index
    rel = current_user.public_send(self.class.crud_resource).order(created_at: :desc)
    rel = scope_index(rel) if respond_to?(:scope_index, true)
    render_success(rel.map { |r| public_send(self.class.crud_serializer, r) })
  end

  def show
    record = current_user.public_send(self.class.crud_resource).find(params.expect(:id))
    render_success(public_send(self.class.crud_serializer, record))
  end

  def create
    record = current_user.public_send(self.class.crud_resource).create!(public_send(self.class.crud_params_method))
    render_success(public_send(self.class.crud_serializer, record), status: :created)
  end

  def update
    record = current_user.public_send(self.class.crud_resource).find(params.expect(:id))
    record.update!(public_send(self.class.crud_params_method))
    render_success(public_send(self.class.crud_serializer, record))
  end

  def destroy
    record = current_user.public_send(self.class.crud_resource).find(params.expect(:id))
    if respond_to?(:destroy_response, true)
      destroy_response(record)
    else
      record.destroy!
      head :no_content
    end
  end
end
