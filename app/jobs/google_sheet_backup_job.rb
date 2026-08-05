class GoogleSheetBackupJob
  include Sidekiq::Job

  sidekiq_options retry: 3, queue: :default

  def perform(user_id)
    user = User.find_by(id: user_id)
    return unless user

    result = GoogleSheetSyncService.new(user).sync!
    if result[:success]
      Rails.logger.info "[SheetBackup] Backup complete for user #{user_id} (sheet: #{result[:spreadsheet_id]})"
    else
      Rails.logger.error "[SheetBackup] Backup failed for user #{user_id}: #{result[:error]}"
    end
  end
end
