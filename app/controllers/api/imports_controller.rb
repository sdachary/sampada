# frozen_string_literal: true

require 'digest'

module Api
  # Bank statement PDF import: upload, poll, confirm.
  #
  # The upload only queues the parse — the browser polls GET /imports/:id while
  # the statement is parsed server side, the user reviews the parsed rows, and
  # only a confirm writes transactions. Nothing reaches the user's data before
  # they say so.
  class ImportsController < Api::BaseController
    before_action :ensure_enabled

    MAX_FILE_SIZE = 10.megabytes

    FILE_ERRORS = {
      'invalid_file' => 'That file could not be read. Upload the PDF of your bank statement.',
      'not_a_pdf' => 'That file is not a PDF.',
      'file_missing' => 'The uploaded file went missing.'
    }.freeze

    def show
      import = current_user.statement_imports.find(params.expect(:id))
      render_success(import_json(import))
    end

    def create
      upload = params[:file]
      return render_file_error('invalid_file', reason: 'missing_file') if upload.blank?

      bytes = upload.read.to_s
      error = validate_upload(upload, bytes)
      return render_file_error(*error) if error

      digest = Digest::SHA256.hexdigest(bytes)
      existing = current_user.statement_imports.find_by(file_digest: digest)
      return render_success({ import_id: existing.id, status: existing.status, duplicate: true }) if existing

      import = current_user.statement_imports.create!(
        status: 'queued', bank: 'unknown', file_digest: digest, file_size: bytes.bytesize
      )
      import.source_file.attach(io: StringIO.new(bytes), filename: filename_for(upload),
                                content_type: 'application/pdf')
      ImportStatementJob.perform_async(import.id)

      render_success({ import_id: import.id, status: import.status }, status: :created)
    end

    def confirm
      import = current_user.statement_imports.find(params.expect(:id))
      return render_error('This import is not ready to confirm', status: :unprocessable_entity) unless import.status == 'done'
      return render_success({ created: import.confirmed_count.to_i, already_confirmed: true }) if import.confirmed_at.present?

      rows = params[:transactions]
      rows = [] unless rows.is_a?(Array)
      created = 0
      skipped = 0
      rejected = []

      ActiveRecord::Base.transaction do
        rows.each_with_index do |row, index|
          if row[:skip].to_s == 'true'
            skipped += 1
            next
          end

          attributes = transaction_attributes(row)
          if attributes.nil?
            rejected << { index: index, reason: 'invalid' }
            next
          end

          current_user.transactions.create!(attributes)
          created += 1
        end
        import.update!(confirmed_at: Time.current, confirmed_count: created)
      end

      render_success({ created: created, skipped: skipped, rejected: rejected })
    end

    private

    def ensure_enabled
      return if FeatureFlags.enabled?('pdf_import', user: current_user)

      render_error('Bank statement import is not enabled', status: :not_implemented)
    end

    # Returns [error_code, extra] or nil when the upload is usable.
    def validate_upload(upload, bytes)
      return ['invalid_file', { reason: 'too_large' }] if bytes.bytesize > MAX_FILE_SIZE
      return ['not_a_pdf', {}] unless pdf_mime?(upload) || pdf_name?(upload)
      return ['invalid_file', { reason: 'not_a_pdf' }] unless pdf_content?(bytes)

      nil
    end

    def pdf_mime?(upload)
      upload.content_type == 'application/pdf'
    end

    def pdf_name?(upload)
      File.extname(upload.original_filename.to_s).downcase == '.pdf'
    end

    def pdf_content?(bytes)
      bytes.start_with?('%PDF-')
    end

    def filename_for(upload)
      name = File.basename(upload.original_filename.to_s)
      name.presence || 'statement.pdf'
    end

    def render_file_error(code, extra = {})
      render json: { error: code, message: FILE_ERRORS[code], **extra }, status: :unprocessable_content
    end

    def import_json(import)
      result = import.result || {}
      transactions = result['transactions'] || []

      {
        id: import.id,
        status: import.status,
        bank: import.bank,
        trust: result['trust'],
        duplicate_count: result['duplicate_count'].to_i,
        period: period_for(transactions),
        transactions: transactions,
        error: import.error.presence,
        confirmed_at: import.confirmed_at
      }
    end

    def period_for(transactions)
      dates = transactions.filter_map { |row| row['transaction_date'] }
      return nil if dates.empty?

      { from: dates.min, to: dates.max }
    end

    # The reviewed rows come from the browser, so they are validated before
    # they are written: a row we cannot make sense of is rejected on its own,
    # it does not fail the whole import.
    def transaction_attributes(row)
      permitted = row.permit(:transaction_date, :description, :merchant, :amount,
                             :transaction_type, :budget_category_id, :category_id, :notes)
      date = parse_date(permitted[:transaction_date])
      amount = permitted[:amount].to_f
      return nil if date.nil? || amount.zero?

      category = permitted[:budget_category_id].presence || permitted[:category_id].presence

      {
        transaction_date: date,
        description: permitted[:description].presence || permitted[:merchant].presence || 'Imported transaction',
        merchant: permitted[:merchant].presence,
        amount: amount,
        transaction_type: transaction_type(permitted[:transaction_type]),
        budget_category_id: category_id(category),
        notes: permitted[:notes].presence,
        currency_code: current_user.currency.presence || 'INR'
      }
    end

    def parse_date(value)
      Date.parse(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def transaction_type(value)
      %w[expense income transfer].include?(value) ? value : 'expense'
    end

    def category_id(value)
      return nil if value.blank?
      return nil unless value.match?(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i)

      value
    end
  end
end
