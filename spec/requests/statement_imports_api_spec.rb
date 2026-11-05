require 'rails_helper'

RSpec.describe 'Statement import API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
    allow(ImportStatementJob).to receive(:perform_async).and_return('job-id')
  end

  def statement_bytes
    PdfStatementBuilder.build(
      {
        rows: [
          ['01-Apr-24', 'NETFLIX.COM', '649.00', '', '24,351.00'],
          ['02-Apr-24', 'SALARY', '', '50,000.00', '74,351.00']
        ],
        title: 'ICICI Bank Account Statement'
      }
    )
  end

  def upload(bytes = statement_bytes, filename: 'statement.pdf', content_type: 'application/pdf')
    Rack::Test::UploadedFile.new(StringIO.new(bytes), content_type, original_filename: filename)
  end

  def done_import(transactions: nil)
    rows = transactions || [
      { 'transaction_date' => '2024-04-01', 'description' => 'NETFLIX.COM', 'merchant' => 'NETFLIX.COM',
        'amount' => 649.0, 'transaction_type' => 'expense', 'confidence' => 0.9, 'duplicate' => false }
    ]
    user.statement_imports.create!(
      status: 'done', bank: 'icici', file_digest: 'digest-1', file_size: 1234,
      result: { 'transactions' => rows, 'trust' => 'high', 'duplicate_count' => 0 }
    )
  end

  it 'is 501 while the feature flag is off' do
    FeatureFlags.disable('pdf_import', user: user)

    post '/api/v1/imports/bank-statement', params: { file: upload }

    expect(response).to have_http_status(:not_implemented)
  end

  it 'queues the parse and returns the import id' do
    post '/api/v1/imports/bank-statement', params: { file: upload }

    expect(response).to have_http_status(:created)
    expect(response.parsed_body['status']).to eq('queued')
    expect(user.statement_imports.count).to eq(1)
    expect(ImportStatementJob).to have_received(:perform_async).with(user.statement_imports.first.id)
  end

  it 'keeps the uploaded file with the import and never in the result' do
    post '/api/v1/imports/bank-statement', params: { file: upload }

    import = user.statement_imports.first
    expect(import.source_file).to be_attached
    expect(import.file_digest).to eq(Digest::SHA256.hexdigest(statement_bytes))
    expect(import.file_size).to eq(statement_bytes.bytesize)
  end

  it 'returns the same import when the same file is uploaded again' do
    post '/api/v1/imports/bank-statement', params: { file: upload }
    import_id = response.parsed_body['import_id']

    post '/api/v1/imports/bank-statement', params: { file: upload }

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['import_id']).to eq(import_id)
    expect(user.statement_imports.count).to eq(1)
    expect(ImportStatementJob).to have_received(:perform_async).once
  end

  it 'rejects a file whose content is not a PDF' do
    post '/api/v1/imports/bank-statement', params: { file: upload('not a pdf') }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('invalid_file')
    expect(response.parsed_body['reason']).to eq('not_a_pdf')
    expect(user.statement_imports.count).to eq(0)
  end

  it 'rejects a file that is not a PDF at all' do
    post '/api/v1/imports/bank-statement',
         params: { file: upload('not a pdf', filename: 'notes.txt', content_type: 'text/plain') }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('not_a_pdf')
  end

  it 'rejects a file over 10 MB' do
    post '/api/v1/imports/bank-statement', params: { file: upload(statement_bytes + (' ' * (10.megabytes + 1))) }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('invalid_file')
    expect(response.parsed_body['reason']).to eq('too_large')
  end

  it 'rejects an upload without a file' do
    post '/api/v1/imports/bank-statement'

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('invalid_file')
    expect(response.parsed_body['reason']).to eq('missing_file')
  end

  it 'returns the parsed rows, the duplicates and the period' do
    import = done_import

    get "/api/v1/imports/#{import.id}"

    expect(response).to have_http_status(:success)
    body = response.parsed_body
    expect(body['status']).to eq('done')
    expect(body['bank']).to eq('icici')
    expect(body['trust']).to eq('high')
    expect(body['duplicate_count']).to eq(0)
    expect(body['period']).to eq({ 'from' => '2024-04-01', 'to' => '2024-04-01' })
    expect(body['transactions'].size).to eq(1)
  end

  it '404s an import of somebody else' do
    other = create(:user)
    import = other.statement_imports.create!(status: 'done', bank: 'icici', file_digest: 'd', file_size: 1)

    get "/api/v1/imports/#{import.id}"

    expect(response).to have_http_status(:not_found)
  end

  it 'creates the transactions the user confirmed' do
    import = done_import

    post "/api/v1/imports/#{import.id}/confirm", params: {
      transactions: [
        { transaction_date: '2024-04-01', description: 'NETFLIX.COM', merchant: 'NETFLIX.COM',
          amount: 649, transaction_type: 'expense' },
        { transaction_date: '2024-04-02', description: 'SALARY', amount: 50_000,
          transaction_type: 'income', skip: true }
      ]
    }

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['created']).to eq(1)
    expect(response.parsed_body['skipped']).to eq(1)
    expect(user.transactions.count).to eq(1)
    expect(user.transactions.first.amount).to eq(649)
    expect(user.transactions.first.transaction_date).to eq(Date.new(2024, 4, 1))
  end

  it 'does not create the transactions twice' do
    import = done_import
    params = { transactions: [{ transaction_date: '2024-04-01', description: 'NETFLIX.COM', amount: 649 }] }

    post "/api/v1/imports/#{import.id}/confirm", params: params
    post "/api/v1/imports/#{import.id}/confirm", params: params

    expect(response.parsed_body['already_confirmed']).to be(true)
    expect(user.transactions.count).to eq(1)
  end

  it 'rejects a row it cannot make sense of without failing the import' do
    import = done_import

    post "/api/v1/imports/#{import.id}/confirm", params: {
      transactions: [
        { transaction_date: '2024-04-01', description: 'NETFLIX.COM', amount: 649 },
        { transaction_date: 'not a date', description: 'BROKEN', amount: 10 }
      ]
    }

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['created']).to eq(1)
    expect(response.parsed_body['rejected'].size).to eq(1)
    expect(user.transactions.count).to eq(1)
  end

  it 'refuses to confirm an import that is not parsed yet' do
    import = user.statement_imports.create!(status: 'queued', bank: 'unknown', file_digest: 'd', file_size: 1)

    post "/api/v1/imports/#{import.id}/confirm", params: { transactions: [] }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(user.transactions.count).to eq(0)
  end

  it 'answers 401 without a session' do
    allow_any_instance_of(Api::BaseController).to receive(:authenticate_with_better_auth).and_call_original

    get "/api/v1/imports/#{done_import.id}"

    expect(response).to have_http_status(:unauthorized)
  end
end
