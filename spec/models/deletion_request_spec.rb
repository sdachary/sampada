require 'rails_helper'

RSpec.describe DeletionRequest, type: :model do
  it 'generates cancel_token and scheduled_for on create' do
    user = create(:user)
    request = described_class.create!(user: user)

    expect(request).to be_valid
    expect(request.cancel_token).to be_present
    expect(request.scheduled_for).to be_present
    expect(request.status).to eq('pending')
  end

  it 'can cancel a pending request' do
    user = create(:user)
    request = described_class.create!(user: user)

    request.cancel!
    expect(request.status).to eq('cancelled')
    expect(described_class.pending).not_to include(request)
  end
end
