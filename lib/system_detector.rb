# frozen_string_literal: true

module SystemDetector
  MIN_RAM_FOR_LOCAL_AI = 8192

  def self.summary
    {
      ram_mb: total_ram_mb,
      cpu_cores: cpu_cores,
      ollama_installed: ollama_installed?,
      ollama_running: ollama_running?,
      docker_available: docker_available?,
      can_run_local: can_run_local_ai?,
      local_ai_viable?: local_ai_viable?,
      platform: RUBY_PLATFORM
    }
  end

  def self.total_ram_mb
    mem = File.read('/proc/meminfo')[/MemTotal:\s+(\d+)/, 1]
    mem.to_i / 1024
  rescue StandardError
    0
  end

  def self.cpu_cores
    File.read('/proc/cpuinfo').scan(/^processor\s+:/).size
  rescue StandardError
    begin
      Etc.nprocessors
    rescue StandardError
      2
    end
  end

  def self.ollama_installed?
    system('which ollama > /dev/null 2>&1')
  end

  def self.ollama_running?
    require 'net/http'
    uri = URI('http://localhost:11434/api/tags')
    response = Net::HTTP.get_response(uri)
    response.is_a?(Net::HTTPSuccess)
  rescue Errno::ECONNREFUSED, Errno::ENOENT, Net::HTTPError
    false
  end

  def self.docker_available?
    system('which docker > /dev/null 2>&1')
  end

  def self.can_run_local_ai?
    total_ram_mb >= MIN_RAM_FOR_LOCAL_AI && cpu_cores >= 4
  end

  def self.local_ai_viable?
    can_run_local_ai? && (ollama_installed? || docker_available?)
  end

  def self.readable_ram
    "#{total_ram_mb}MB"
  end
end
