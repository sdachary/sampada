# Puma configuration for Sampada
# Optimized for Cloud Run: single worker, multi-threaded, controlled by Cloud Run concurrency

rails_env = ENV.fetch('RAILS_ENV', 'development')

# Thread count - Cloud Run handles concurrency at the instance level
# Set RAILS_MAX_THREADS to match your Cloud Run --concurrency setting (default 80)
# For 1 vCPU, 80 threads is a good balance (Puma handles via GVL)
threads_count = ENV.fetch('RAILS_MAX_THREADS', 3)
threads threads_count, threads_count

if rails_env == 'production'
  # Cloud Run: single worker per container, concurrency managed by platform
  # WEB_CONCURRENCY=1 is the Cloud Run standard
  workers ENV.fetch('WEB_CONCURRENCY', 1)

  # Preload app for faster worker boot (copy-on-write friendly)
  preload_app!

  # Worker timeout - Cloud Run has 300s request timeout, give buffer
  worker_timeout 300
end

# Port - Cloud Run injects PORT env var (default 8080)
port ENV.fetch('PORT', 8080)

# Bind to all interfaces for Cloud Run
bind "tcp://0.0.0.0:#{ENV.fetch('PORT', 8080)}"

environment rails_env

# Allow puma to be restarted by `bin/rails restart` command
plugin :tmp_restart

pidfile ENV['PIDFILE'] if ENV['PIDFILE']

if rails_env == 'development'
  worker_timeout 3600
end

# Cloud Run health check endpoint
# Add this to routes.rb: get '/up', to: 'rails/health#show'
# Or use: plugin :puma_health_check (requires gem)