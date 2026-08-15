class ProcessDeletionJob
  include Sidekiq::Job

  def perform(deletion_request_id)
    request = DeletionRequest.find_by(id: deletion_request_id)
    return unless request&.pending?

    request.update!(status: 'deleting')
    user = request.user

    if request.export_data
      request.update!(status: 'exporting')
      GoogleSheetSyncService.new(user).sync!
      request.update!(status: 'exported')
    end

    user.email = "deleted-#{user.id}@kubera.app"
    user.first_name = 'Deleted'
    user.last_name = 'User'
    user.save!

    request.update!(status: 'deleted', deleted_at: Time.current)
    Rails.logger.info "[Deletion] User #{user.id} deleted (request: #{deletion_request_id})"
  end
end
