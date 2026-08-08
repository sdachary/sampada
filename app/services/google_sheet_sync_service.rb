class GoogleSheetSyncService
  TAB_NAMES = {
    summary: 'Summary',
    transactions: 'Transactions',
    debts: 'Debts',
    portfolios: 'Portfolios',
    net_worth: 'Net Worth',
    budgets: 'Budgets'
  }.freeze

  def initialize(user)
    @user = user
    @sheets = GoogleAuthService.new(user).sheets_service
    @drive = GoogleAuthService.new(user).drive_service
    @spreadsheet_id = find_or_create_spreadsheet
  end

  def sync!
    populate_summary
    populate_transactions
    populate_debts
    populate_portfolios
    populate_net_worth
    populate_budgets
    { success: true, spreadsheet_id: @spreadsheet_id }
  rescue => e
    Rails.logger.error "[SheetSync] Failed for user #{@user.id}: #{e.message}"
    { success: false, error: e.message }
  end

  private

  def find_or_create_spreadsheet
    require "google/apis/sheets_v4"
    require "googleauth"
    response = @drive.list_files(q: "name='Sampada — Financial Summary' and trashed=false", spaces: 'drive')
    if response.files.any?
      return response.files.first.id
    end

    spreadsheet = Google::Apis::SheetsV4::Spreadsheet.new(
      properties: Google::Apis::SheetsV4::SpreadsheetProperties.new(
        title: 'Sampada — Financial Summary'
      )
    )
    result = @sheets.create_spreadsheet(spreadsheet)
    result.spreadsheet_id
  end

  def populate_summary
    total_assets = @user.net_worth_snapshots.last&.total_assets || 0
    total_liabilities = @user.net_worth_snapshots.last&.total_liabilities || 0
    total_debts = @user.debts.sum { |d| d.remaining_amount }
    total_invested = @user.portfolios.sum(:total_value)

    values = [
      ['Sampada — Financial Summary', "Generated: #{Time.current.strftime('%B %d, %Y %I:%M %p %Z')}"],
      [],
      ['Metric', 'Value'],
      ['Total Assets', total_assets],
      ['Total Liabilities', total_liabilities],
      ['Net Worth', total_assets - total_liabilities],
      ['Total Debt', total_debts],
      ['Total Invested', total_invested]
    ]

    write_range(TAB_NAMES[:summary], values)
  end

  def populate_transactions
    rows = @user.transactions.order(transaction_date: :desc).limit(1000).map do |t|
      [t.transaction_date, t.description, t.amount, t.transaction_type, t.currency_code]
    end
    write_range(TAB_NAMES[:transactions], [['Date', 'Description', 'Amount', 'Type', 'Currency']] + rows)
  end

  def populate_debts
    rows = @user.debts.map do |d|
      [d.name, d.amount, d.interest_rate, d.emi_amount, d.status, d.currency_code]
    end
    write_range(TAB_NAMES[:debts], [['Name', 'Amount', 'Interest Rate', 'EMI', 'Status', 'Currency']] + rows)
  end

  def populate_portfolios
    rows = @user.portfolios.map do |p|
      [p.name, p.total_value, p.goal, p.currency_code]
    end
    write_range(TAB_NAMES[:portfolios], [['Name', 'Total Value', 'Goal', 'Currency']] + rows)
  end

  def populate_net_worth
    rows = @user.net_worth_snapshots.order(snapshot_date: :asc).map do |s|
      [s.snapshot_date, s.total_assets, s.total_liabilities, s.net_worth]
    end
    write_range(TAB_NAMES[:net_worth], [['Date', 'Assets', 'Liabilities', 'Net Worth']] + rows)
  end

  def populate_budgets
    rows = @user.budgets.includes(:budget_category).map do |b|
      [b.budget_category&.name, b.monthly_limit, b.currency_code]
    end
    write_range(TAB_NAMES[:budgets], [['Category', 'Monthly Limit', 'Currency']] + rows)
  end

  def write_range(tab_name, values)
    return if values.empty?

    begin
      @sheets.get_spreadsheet(@spreadsheet_id, ranges: tab_name)
    rescue Google::Apis::ClientError
      request = Google::Apis::SheetsV4::BatchUpdateSpreadsheetRequest.new(
        requests: [{ add_sheet: { properties: { title: tab_name } } }]
      )
      @sheets.batch_update_spreadsheet(@spreadsheet_id, request)
    end

    range = "'#{tab_name}'!A1"
    value_range = Google::Apis::SheetsV4::ValueRange.new(values: values)
    @sheets.update_spreadsheet_value(@spreadsheet_id, range, value_range,
      value_input_option: 'USER_ENTERED')
  end
end
