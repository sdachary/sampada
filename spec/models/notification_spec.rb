require 'rails_helper'

RSpec.describe Notification, type: :model do
  subject(:notification) { build(:notification) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:notification_type) }
    it { is_expected.to validate_presence_of(:message) }
  end

  describe 'scopes' do
    let!(:unread_notification) { create(:notification, read: false) }
    let!(:read_notification) { create(:notification, read: true) }

    describe '.unread' do
      it 'returns only unread notifications' do
        expect(described_class.unread).to include(unread_notification)
        expect(described_class.unread).not_to include(read_notification)
      end
    end

    describe '.recent' do
      it 'orders by created_at descending and limits to 50' do
        expect(described_class.recent.to_sql).to include('ORDER BY "notifications"."created_at" DESC')
        expect(described_class.recent.to_sql).to include('LIMIT 50')
      end
    end
  end

  describe '#mark_as_read!' do
    it 'marks notification as read with timestamp' do
      notification = create(:notification, read: false)
      expect { notification.mark_as_read! }
        .to change { notification.read }.from(false).to(true)
        .and change { notification.read_at }.from(nil)
    end
  end
end
