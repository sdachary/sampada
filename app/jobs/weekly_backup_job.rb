class WeeklyBackupJob
  include Sidekiq::Job

  def perform
    User.find_each do |user|
      GoogleSheetBackupJob.perform_async(user.id)
    end
  end
end
