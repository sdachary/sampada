class DatabaseBackupJob
  include Sidekiq::Job

  def perform
    return unless backup_enabled?

    timestamp = Time.current.strftime("%Y%m%d_%H%M%S")
    filename = "sampada_backup_#{timestamp}.sql.gz"
    filepath = "/tmp/#{filename}"

    # pg_dump with compression
    dump_cmd = [
      "pg_dump",
      "-h", db_host,
      "-p", db_port,
      "-U", db_user,
      "-d", db_name,
      "--no-owner",
      "--no-privileges",
      "--format=custom",
      "--compress=9"
    ]

    env = { "PGPASSWORD" => db_password }

    system(env, *dump_cmd, out: filepath, err: :out)

    if $?.success?
      upload_to_storage(filepath, filename)
      cleanup_old_backups
      Rails.logger.info "[DatabaseBackup] Backup completed: #{filename}"
    else
      Rails.logger.error "[DatabaseBackup] pg_dump failed"
      raise "Database backup failed"
    end
  ensure
    FileUtils.rm_f(filepath) if filepath && File.exist?(filepath)
  end

  private

  def backup_enabled?
    ENV["DATABASE_BACKUP_ENABLED"] == "true"
  end

  def db_host
    ENV["DB_HOST"] || "localhost"
  end

  def db_port
    ENV["DB_PORT"] || "5432"
  end

  def db_user
    ENV["POSTGRES_USER"] || "sampada"
  end

  def db_name
    ENV["POSTGRES_DB"] || "sampada_production"
  end

  def db_password
    ENV["POSTGRES_PASSWORD"]
  end

  def upload_to_storage(filepath, filename)
    # For now, store locally. In production, could upload to S3/Minio
    # Example for S3:
    # Aws::S3::Client.new.put_object(bucket: bucket, key: filename, body: File.read(filepath))
    Rails.logger.info "[DatabaseBackup] Backup stored at #{filepath}"
  end

  def cleanup_old_backups
    # Keep last 7 daily, 4 weekly, 3 monthly
    # This is a simple implementation - can be enhanced
    Dir.glob("/tmp/sampada_backup_*.sql.gz").sort_by { |f| File.mtime(f) }.reverse_each.with_index do |f, i|
      next if i < 7 # Keep last 7
      FileUtils.rm_f(f)
    end
  end
end