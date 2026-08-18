# frozen_string_literal: true

module Api
  class BaseController < ActionController::API
    include BetterAuthVerification

    rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
    rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity

    protected

    def render_success(data = {}, message: nil, status: :ok)
      body = data.is_a?(Hash) && message ? data.merge(message: message) : data
      render json: body, status: status
    end

    def render_error(message, status: :unprocessable_entity, errors: nil)
      render json: {
        success: false,
        message: message,
        errors: errors
      }, status: status
    end

    def render_unauthorized(message = 'Unauthorized')
      render_error(message, status: :unauthorized)
    end

    def render_not_found(exception)
      render_error(exception.message, status: :not_found)
    end

    def render_unprocessable_entity(exception)
      render_error('Validation failed', status: :unprocessable_entity, errors: exception.record.errors.full_messages)
    end
  end
end
