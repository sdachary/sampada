class GoogleAuthService
  def initialize(user)
    @user = user
  end

  def sheets_service
    require "google/apis/sheets_v4"
    require "googleauth"
    Google::Apis::SheetsV4::SheetsService.new.tap do |service|
      service.authorization = authorize
    end
  end

  def drive_service
    # Note: google-apis-drive_v3 is not bundled — this method is pre-existing
    # dead code (Google auth is broken post Better-Auth: authorize returns nil).
    Google::Apis::DriveV3::DriveService.new.tap do |service|
      service.authorization = authorize
    end
  end

  private

  def authorize
    # Note: With Better-Auth, Google tokens are stored in Better-Auth's database
    # This service may need updates to fetch tokens from Better-Auth instead
    return nil

    # Old code - kept for reference
    # return nil unless @user.refresh_token.present?
    #
    # authorizer = Google::Auth::UserRefreshCredentials.new(
    #   client_id: ENV.fetch('GOOGLE_CLIENT_ID'),
    #   client_secret: ENV.fetch('GOOGLE_CLIENT_SECRET'),
    #   scope: ['email', 'profile',
    #           Google::Apis::SheetsV4::AUTH_SPREADSHEETS,
    #           Google::Apis::DriveV3::AUTH_DRIVE_FILE],
    #   additional_parameters: { access_type: 'offline' }
    # )
    # authorizer.refresh_token = @user.refresh_token
    # authorizer.fetch_access_token!
    # authorizer
  end
end
