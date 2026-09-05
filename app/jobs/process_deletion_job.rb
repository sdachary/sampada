class ProcessDeletionJob
  include Sidekiq::Job

  def perform(deletion_request_id)
    request = DeletionRequest.find_by(id: deletion_request_id)
    return unless request && request.status == 'pending'

    request.update!(status: 'deleting')
    user = request.user

    # DPDP data export is served to the user during the 48h cancel window via
    # DpdpController#full_export and Api::ExportsController. The former
    # background export to a Google Sheet was removed with the backup feature
    # (SEC-06); deletion no longer materializes user data to a third party.
    user.email = "deleted-#{user.id}@sampada.app"
    user.first_name = 'Deleted'
    user.last_name = 'User'
    user.save!

    request.update!(status: 'deleted', deleted_at: Time.current)
    Rails.logger.info "[Deletion] User #{user.id} deleted (request: #{deletion_request_id})"
  end
end
