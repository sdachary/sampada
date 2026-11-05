require 'rails_helper'

RSpec.describe ImportStatementJob, type: :job do
  let(:user) { create(:user) }

  def statement_bytes(rows: nil, encrypted: false)
    PdfStatementBuilder.build(
      {
        rows: rows || [
          ['01-Apr-24', 'NETFLIX.COM', '649.00', '', '24,351.00'],
          ['02-Apr-24', 'SALARY', '', '50,000.00', '74,351.00']
        ],
        title: 'ICICI Bank Account Statement'
      },
      encrypted: encrypted
    )
  end

  def import_with(bytes)
    import = user.statement_imports.create!(
      status: 'queued', bank: 'unknown',
      file_digest: Digest::SHA256.hexdigest(bytes), file_size: bytes.bytesize
    )
    import.source_file.attach(io: StringIO.new(bytes), filename: 'statement.pdf', content_type: 'application/pdf')
    import
  end

  it 'parses the statement and keeps the rows' do
    import = import_with(statement_bytes)

    described_class.new.perform(import.id)

    import.reload
    expect(import.status).to eq('done')
    expect(import.bank).to eq('icici')
    expect(import.result['transactions'].size).to eq(2)
    expect(import.result['transactions'].first['description']).to eq('NETFLIX.COM')
    expect(import.result['transactions'].first['transaction_date']).to eq('2024-04-01')
    expect(import.result['trust']).to eq('high')
    expect(import.result['duplicate_count']).to eq(0)
  end

  it 'deletes the uploaded file once the statement is parsed' do
    import = import_with(statement_bytes)

    described_class.new.perform(import.id)

    expect(import.reload.source_file).not_to be_attached
  end

  it 'marks an encrypted statement as failed and deletes the file' do
    import = import_with(statement_bytes(encrypted: true))

    described_class.new.perform(import.id)

    import.reload
    expect(import.status).to eq('failed')
    expect(import.error['error']).to eq('encrypted_pdf')
    expect(import.source_file).not_to be_attached
  end

  it 'marks a file it cannot read as failed' do
    import = import_with('not a pdf')

    described_class.new.perform(import.id)

    import.reload
    expect(import.status).to eq('failed')
    expect(import.error['error']).to eq('invalid_file')
  end

  it 'flags the rows the user already has' do
    create(:transaction, user: user, description: 'NETFLIX.COM', merchant: 'NETFLIX.COM',
                         amount: 649, transaction_date: Date.new(2024, 4, 1))
    import = import_with(statement_bytes)

    described_class.new.perform(import.id)

    import.reload
    expect(import.result['duplicate_count']).to eq(1)
    expect(import.result['transactions'].first['duplicate']).to be(true)
  end

  it 'leaves an import it cannot find alone' do
    expect { described_class.new.perform('00000000-0000-0000-0000-000000000000') }.not_to raise_error
  end

  it 'does not parse an import twice' do
    import = import_with(statement_bytes)
    described_class.new.perform(import.id)
    import.update!(result: { 'transactions' => [] })

    described_class.new.perform(import.id)

    expect(import.reload.result['transactions']).to eq([])
  end
end
