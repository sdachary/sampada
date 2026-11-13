# frozen_string_literal: true

class Rails::HealthController < ApplicationController
  # Health check endpoint for Cloud Run / load balancers
  # GET /up
  def show
    checks = {
      database: check_database,
      redis: check_redis,
      timestamp: Time.current.iso8601
    }

    healthy = checks.values.all? { |v| v[:status] == "ok" }

    render json: {
      status: healthy ? "ok" : "degraded",
      checks: checks
    }, status: healthy ? :ok : :service_unavailable
  end

  private

  def check_database
    ActiveRecord::Base.connection.execute("SELECT 1")
    { status: "ok" }
  rescue => e
    { status: "error", message: e.message }
  end

  def check_redis
    if defined?(Redis) && Rails.cache.respond_to?(:redis)
      Rails.cache.redis.ping == "PONG" ? { status: "ok" } : { status: "error", message: "PONG not received" }
    elsif defined?(Sidekiq)
      Sidekiq.redis(&:ping) == "PONG" ? { status: "ok" } : { status: "error", message: "PONG not received" }
    else
      { status: "skipped", message: "Redis not configured" }
    end
  rescue => e
    { status: "error", message: e.message }
  end
end