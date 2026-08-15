class NetWorthSnapshotJob
  include Sidekiq::Job

  def perform
    User.find_each(batch_size: 100) do |user|
      next unless user.should_create_net_worth_snapshot?

      create_snapshot_for(user)
    end
  end

  private

  def create_snapshot_for(user)
    NetWorthSnapshot.create_snapshot(user)
    Rails.logger.info "[NetWorthSnapshot] Created snapshot for user #{user.id}"
  rescue StandardError => e
    Rails.logger.error "[NetWorthSnapshot] Failed for user #{user.id}: #{e.message}"
  end
end
