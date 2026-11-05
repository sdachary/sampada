require 'rails_helper'

RSpec.describe Import::BankPdfParser do
  # A statement page: date, description, debit, credit, balance
  def statement(rows, headers: nil, title: nil)
    { rows: rows, headers: headers || PdfStatementBuilder::DEFAULT_HEADERS, title: title }
  end

  let(:icici_rows) do
    [
      ['01-Apr-24', 'NETFLIX.COM', '649.00', '', '24,351.00'],
      ['02-Apr-24', 'UPI/998877/netflix/ref1', '', '649.00', '25,000.00'],
      ['03-Apr-24', 'SALARY CREDIT', '', '50,000.00', '75,000.00']
    ]
  end

  def parse(bytes, existing: [])
    described_class.new(bytes, existing: existing).call
  end

  it 'extracts the transactions of a tabular statement' do
    result = parse(PdfStatementBuilder.build(statement(icici_rows)))

    expect(result.error).to be_nil
    expect(result.transactions.size).to eq(3)
    expect(result.transactions.map(&:amount)).to eq([649.0, 649.0, 50_000.0])
    expect(result.transactions.map(&:transaction_type)).to eq(%w[expense income income])
    expect(result.transactions.first.transaction_date).to eq(Date.new(2024, 4, 1))
    expect(result.transactions.first.description).to eq('NETFLIX.COM')
    expect(result.transactions.first.source).to eq('bank_pdf')
    expect(result.transactions.first.page).to eq(1)
  end

  it 'reads the amount and the date the way the statement prints them' do
    rows = [
      ['01-Apr-24', 'RENT', '12,500.00', '', '1,00,000.00'],
      ['02-Apr-24', 'GROCERY', '2,250.50', '', '97,749.50']
    ]
    result = parse(PdfStatementBuilder.build(statement(rows)))

    expect(result.transactions.map(&:amount)).to eq([12_500.0, 2_250.5])
    expect(result.transactions.map(&:transaction_date)).to eq([Date.new(2024, 4, 1), Date.new(2024, 4, 2)])
  end

  it 'trusts a statement whose balance moves by the row amount' do
    result = parse(PdfStatementBuilder.build(statement(icici_rows, title: 'ICICI Bank Account Statement')))

    expect(result.trust).to eq('high')
    expect(result.transactions.last.confidence).to be >= 0.8
  end

  it 'cuts the confidence when the balance does not add up' do
    rows = icici_rows.map(&:dup)
    rows[1][4] = '99,999.00' # the balance does not follow from the rows

    result = parse(PdfStatementBuilder.build(statement(rows)))

    expect(result.trust).to eq('low')
    expect(result.transactions.last.confidence).to be < 0.6
  end

  it 'detects the bank from the statement header' do
    result = parse(PdfStatementBuilder.build(statement(icici_rows, title: 'ICICI Bank Account Statement')))
    expect(result.bank).to eq('icici')
  end

  it 'keeps parsing an unknown bank but shaves the confidence' do
    result = parse(PdfStatementBuilder.build(statement(icici_rows, title: 'Some Fintech Bank')))

    expect(result.bank).to eq('unknown')
    expect(result.transactions.size).to eq(3)
    expect(result.transactions.last.confidence).to be < 0.8
  end

  it 'reads a statement that uses other column labels' do
    headers = %w[Date Particulars Withdrawal Deposit Balance]
    result = parse(PdfStatementBuilder.build(statement(icici_rows, headers: headers, title: 'State Bank of India')))

    expect(result.bank).to eq('sbi')
    expect(result.transactions.size).to eq(3)
    expect(result.transactions.first.amount).to eq(649.0)
  end

  it 'flags a fuzzy date so the user can check it' do
    rows = [
      ['01 Apr, 24', 'NETFLIX.COM', '649.00', '', '24,351.00'],
      ['02-Apr-24', 'OTHER', '100.00', '', '24,251.00']
    ]
    result = parse(PdfStatementBuilder.build(statement(rows)))

    expect(result.transactions.first.transaction_date).to eq(Date.new(2024, 4, 1))
    expect(result.transactions.first.confidence).to be < 0.8
    expect(result.transactions.last.confidence).to be >= result.transactions.first.confidence
  end

  it 'flags an amount it had to rescue with a looser pattern' do
    rows = [
      ['01-Apr-24', 'NETFLIX.COM', '1 234.56', '', '24,351.00'],
      ['02-Apr-24', 'OTHER', '100.00', '', '23,116.44']
    ]
    result = parse(PdfStatementBuilder.build(statement(rows)))

    expect(result.transactions.first.amount).to eq(1234.56)
    expect(result.transactions.first.confidence).to be < 0.6
  end

  it 'marks the rows the user already has' do
    existing = [{ transaction_date: Date.new(2024, 4, 1), amount: 649.0, merchant: 'NETFLIX.COM' }]

    result = parse(PdfStatementBuilder.build(statement(icici_rows)), existing: existing)

    expect(result.duplicate_count).to eq(1)
    expect(result.transactions.first.duplicate).to be(true)
    expect(result.transactions.last.duplicate).to be(false)
  end

  it 'reads a statement whose second page has no header row' do
    bytes = PdfStatementBuilder.build(
      statement(icici_rows),
      { rows: [['04-Apr-24', 'SPOTIFY', '119.00', '', '74,881.00']], headers: nil }
    )

    result = parse(bytes)

    expect(result.transactions.size).to eq(4)
    expect(result.transactions.last.description).to eq('SPOTIFY')
    expect(result.transactions.last.page).to eq(2)
  end

  it 'reports an encrypted statement' do
    bytes = PdfStatementBuilder.build(statement(icici_rows), encrypted: true)

    result = parse(bytes)

    expect(result.error).to eq('encrypted_pdf')
    expect(result.transactions).to be_empty
  end

  it 'reports a file that is not a readable statement' do
    result = parse('this is not a pdf')

    expect(result.error).to eq('invalid_file')
    expect(result.transactions).to be_empty
  end

  it 'returns nothing when the statement has no table' do
    result = parse(PdfStatementBuilder.build({ rows: [], headers: nil, title: 'Statement of account' }))

    expect(result.error).to be_nil
    expect(result.transactions).to be_empty
  end

  it 'skips rows it cannot read instead of guessing' do
    rows = [
      ['01-Apr-24', 'NETFLIX.COM', '649.00', '', '24,351.00'],
      ['', 'TOTAL', '', '', '24,351.00']
    ]
    result = parse(PdfStatementBuilder.build(statement(rows)))

    expect(result.transactions.size).to eq(1)
  end
end
