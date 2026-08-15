class HealthController < ActionController::API
  def show
    db_ok = begin
      ActiveRecord::Base.connection.execute('SELECT 1')
      true
    rescue StandardError
      false
    end

    status = db_ok ? :ok : :service_unavailable

    render json: {
      status: db_ok ? 'ok' : 'degraded',
      timestamp: Time.current.iso8601,
      services: {
        database: db_ok ? 'connected' : 'disconnected'
      },
      version: ENV.fetch('KUBERA_VERSION', nil),
      rails_env: Rails.env
    }, status: status
  end
end
