class CheckDeletionsJob
  include Sidekiq::Job

  def perform
    DeletionRequest.pending.where(scheduled_for: ..Time.current).find_each do |request|
      ProcessDeletionJob.perform_async(request.id)
    end
  end
end
