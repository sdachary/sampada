module Api
  class ExportsController < Api::BaseController
    FORMATS = %w[csv json].freeze
    EXPORT_TYPES = %w[debts portfolios transactions net_worth].freeze

    def index
      render_success({ formats: FORMATS, types: EXPORT_TYPES })
    end

    def csv
      type = params.dig(:export, :type) || 'transactions'
      export = ExportService.new(current_user).send("export_#{type}", format: 'csv')
      send_data export, filename: "#{type}_#{Time.zone.today}.csv", type: 'text/csv'
    end

    def export_json
      type = params.dig(:export, :type) || 'transactions'
      export = ExportService.new(current_user).send("export_#{type}", format: 'json')
      send_data export, filename: "#{type}_#{Time.zone.today}.json", type: 'application/json'
    end

    def debts
      export = ExportService.new(current_user).export_debts(format: format)
      send_data export, filename: "debts_#{Time.zone.today}.#{format}", type: content_type
    end

    def portfolios
      export = ExportService.new(current_user).export_portfolios(format: format)
      send_data export, filename: "portfolios_#{Time.zone.today}.#{format}", type: content_type
    end

    def transactions
      export = ExportService.new(current_user).export_transactions(
        format: format, start_date: params[:start_date], end_date: params[:end_date]
      )
      send_data export, filename: "transactions_#{Time.zone.today}.#{format}", type: content_type
    end

    def net_worth
      export = ExportService.new(current_user).export_net_worth(format: format)
      send_data export, filename: "net_worth_#{Time.zone.today}.#{format}", type: content_type
    end

    private

    def format
      f = params[:format] || 'csv'
      FORMATS.include?(f) ? f : 'csv'
    end

    def content_type
      format == 'csv' ? 'text/csv' : 'application/json'
    end
  end
end
