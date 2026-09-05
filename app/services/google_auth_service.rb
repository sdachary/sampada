# GoogleAuthService — dead code (see SEC-06).
#
# Post Better-Auth, Google OAuth tokens are stored inside the external Better-Auth
# service, not on User. This service can no longer build an authorized Google client:
# the old code path (authorize → refresh_token) returned nil silently, and the
# previous drive_service referenced the unbundled google-apis-drive_v3 gem. Both
# would blow up at runtime → GoogleSheetBackupJob / the data-export step of
# ProcessDeletionJob. The callers now rescue StandardError (see
# GoogleSheetSyncService#sync!), so this raises a clear, actionable error instead
# of a confusing nil/NameError.
#
# If Google Sheets backup is still wanted, this needs a real Better-Auth token
# integration (read the Google token from Better-Auth's stored account data) —
# otherwise the whole GoogleSheetBackupJob / WeeklyBackupJob feature should be
# removed.
class GoogleAuthService
  def initialize(user)
    @user = user
  end

  def sheets_service
    require 'google/apis/sheets_v4'
    require 'googleauth'

    Google::Apis::SheetsV4::SheetsService.new.tap do |service|
      service.authorization = authorize
    end
  end

  def drive_service
    authorize # always raises — see #authorize
  end

  private

  def authorize
    raise NotSupportedError,
          'GoogleAuthService is not wired to Better-Auth Google tokens (SEC-06); ' \
          'Google Sheets backup is disabled. Either integrate Better-Auth token ' \
          'storage or remove the GoogleSheetBackupJob/GoogleSheetSyncService feature.'
  end

  class NotSupportedError < StandardError; end
end