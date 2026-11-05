# frozen_string_literal: true

# Deletes statement imports older than a day — the parsed rows and the uploaded
# file. A statement is a transient copy of the user's data, not the data itself.
class CleanupStatementImportsJob
  include Sidekiq::Job

  sidekiq_options queue: :maintenance, retry: 1, backtrace: true

  RETENTION = 24.hours

  def perform
    StatementImport.where(status: %w[done failed]).where(updated_at: RETENTION.ago..).find_each do |import|
      import.source_file.purge
      import.destroy!
    end
  end
end
