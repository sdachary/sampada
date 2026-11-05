# frozen_string_literal: true

require 'timeout'

# Parses an uploaded bank statement PDF.
#
# The uploaded file is read once, parsed, and then expunged: the raw bytes of a
# bank statement are never kept longer than the parse. A parse that raises
# (so Sidekiq can retry it) keeps the file; a parse that finished — successfully
# or not — deletes it.
class ImportStatementJob
  include Sidekiq::Job

  sidekiq_options queue: :imports, retry: 1, backtrace: true

  PARSE_TIMEOUT = 90
  # ponytail: the duplicate index covers the user's 20k most recent
  # transactions — a statement older than that is not a re-import.
  DUPLICATE_LIMIT = 20_000

  def perform(import_id)
    import = StatementImport.find_by(id: import_id)
    return if import.nil? || import.status == 'done'
    return fail_import(import, 'file_missing') unless import.source_file.attached?

    import.update!(status: 'processing')
    result = Timeout.timeout(PARSE_TIMEOUT) { parse(import) }

    if result.error.present?
      fail_import(import, result.error)
    else
      import.update!(
        status: 'done',
        bank: result.bank,
        result: {
          'transactions' => result.transactions.map(&:as_json),
          'trust' => result.trust,
          'duplicate_count' => result.duplicate_count
        }
      )
      purge_file(import)
    end
  rescue Timeout::Error
    fail_import(import, 'parse_timeout')
  end

  private

  def parse(import)
    Import::BankPdfParser.new(import.source_file.download, existing: existing_transactions(import.user)).call
  end

  # The transactions the user already has, so the parser can flag the rows it
  # would duplicate. A statement may cover any period, so this is not filtered
  # by date — it is bounded by the newest rows instead.
  def existing_transactions(user)
    user.transactions
        .order(transaction_date: :desc)
        .limit(DUPLICATE_LIMIT)
        .pluck(:transaction_date, :amount, :merchant)
        .map { |date, amount, merchant| { transaction_date: date, amount: amount, merchant: merchant } }
  end

  def fail_import(import, code)
    return if import.nil?

    import.update!(status: 'failed', error: { 'error' => code })
    purge_file(import)
  end

  def purge_file(import)
    import.source_file.purge
  rescue StandardError => e
    Rails.logger.warn("[ImportStatementJob] could not purge the uploaded file: #{e.message}")
  end
end
