# frozen_string_literal: true

module Api
  module V1
    module Auth
      class PasskeysController < Api::BaseController
        before_action :require_feature_flag!

        # Registration (requires authenticated session)
        def register_options
          relying_party = relying_party_config
          user_id = current_user.id.to_s
          user_name = current_user.email
          user_display_name = current_user.first_name.presence || current_user.email

          webauthn_user = WebauthnUser.new(user_id, user_name, user_display_name)

          options = relying_party.options_for_registration(
            user: webauthn_user,
            exclude: existing_credential_ids,
            authenticator_selection: {
              resident_key: "required",
              user_verification: "preferred"
            }
          )

          store_challenge("reg", options.challenge)
          render_success(options)
        end

        def register
          credential = params[:credential]
          label = params[:label] || "This device"

          relying_party = relying_party_config
          challenge = retrieve_challenge("reg")
          return render_error("Registration session expired or invalid", status: :unprocessable_entity) unless challenge

          begin
            webauthn_credential = relying_party.verify_registration(
              credential,
              challenge,
              user_verification: true
            )

            transport = extract_transport(credential)
            webauthn_credential_record = current_user.webauthn_credentials.create!(
              webauthn_id: webauthn_credential.id,
              public_key: webauthn_credential.public_key,
              label: label,
              sign_count: webauthn_credential.sign_count,
              transport: transport
            )

            clear_challenge("reg")
            render_success({ credential: serialize_credential(webauthn_credential_record) }, message: "Passkey registered successfully")
          rescue WebAuthn::Error => e
            clear_challenge("reg")
            render_error("Registration failed: #{e.message}", status: :unprocessable_entity)
          end
        end

        # Authentication (no auth required, uses email to find user)
        def auth_options
          email = params[:email]
          return render_error("Email required", status: :bad_request) unless email.present?

          user = User.find_by(email: email.downcase)
          return render_success({ allowCredentials: [] }) unless user

          relying_party = relying_party_config
          credentials = user.webauthn_credentials.map do |c|
            { id: Base64.urlsafe_decode64(c.webauthn_id), type: "public-key", transports: [c.transport] }
          end

          options = relying_party.options_for_authentication(
            allow: credentials,
            user_verification: "preferred"
          )

          # Store challenge keyed by email hash
          store_challenge("auth:#{Digest::SHA256.hexdigest(email.downcase)}", options.challenge)
          render_success(options)
        end

        def auth_verify
          email = params[:email]
          credential = params[:credential]
          return render_error("Email and credential required", status: :bad_request) unless email.present? && credential.present?

          user = User.find_by(email: email.downcase)
          return render_error("Invalid credentials", status: :unauthorized) unless user

          relying_party = relying_party_config
          challenge_key = "auth:#{Digest::SHA256.hexdigest(email.downcase)}"
          challenge = retrieve_challenge(challenge_key)
          return render_error("Authentication session expired or invalid", status: :unprocessable_entity) unless challenge

          begin
            webauthn_credential = user.webauthn_credentials.find_by!(
              webauthn_id: Base64.urlsafe_encode64(credential["rawId"]).delete("=")
            )

            relying_party.verify_authentication(
              credential,
              challenge,
              public_key: webauthn_credential.public_key,
              sign_count: webauthn_credential.sign_count,
              user_verification: true
            )

            webauthn_credential.update!(sign_count: credential["response"]["authenticatorData"][33..40].unpack1("Q>"), last_used_at: Time.current)

            clear_challenge(challenge_key)

            # Issue session token (same as password login)
            token = Session.create_for_user!(user)
            render_success({ token: token.token, user: user.as_json(only: %i[id email first_name last_name currency onboarded]) }, message: "Signed in with passkey")
          rescue WebAuthn::Error => e
            clear_challenge(challenge_key)
            render_error("Authentication failed: #{e.message}", status: :unauthorized)
          rescue ActiveRecord::RecordNotFound
            clear_challenge(challenge_key)
            render_error("Credential not found", status: :unauthorized)
          end
        end

        # Credential management (requires auth)
        def index
          credentials = current_user.webauthn_credentials.order(last_used_at: :desc)
          render_success({ credentials: credentials.map { |c| serialize_credential(c) } })
        end

        def destroy
          credential = current_user.webauthn_credentials.find(params[:id])

          if current_user.webauthn_credentials.count <= 1
            return render_error("Cannot delete your last passkey. Add another passkey first, or keep this one for passwordless sign-in.", status: :unprocessable_entity)
          end

          credential.destroy!
          render_success({}, message: "Passkey removed")
        end

        private

        def require_feature_flag!
          return render_error("Passkeys feature is disabled", status: :not_implemented) unless FeatureFlags.enabled?("passkeys", user: current_user)
        end

        def relying_party_config
          @relying_party_config ||= WebAuthn::RelyingParty.new(
            origin: ENV.fetch("WEBAUTHN_ORIGIN", "https://sampada.vayalabs.in"),
            name: "Sampada",
            id: ENV.fetch("WEBAUTHN_RP_ID", "sampada.vayalabs.in")
          )
        end

        def existing_credential_ids
          current_user.webauthn_credentials.pluck(:webauthn_id).map { |id| Base64.urlsafe_decode64(id) }
        end

        def store_challenge(key, challenge)
          Rails.cache.write("wa:#{key}", challenge, expires_in: 2.minutes)
        end

        def retrieve_challenge(key)
          Rails.cache.read("wa:#{key}")
        end

        def clear_challenge(key)
          Rails.cache.delete("wa:#{key}")
        end

        def extract_transport(credential)
          transports = credential["response"]["transports"] || []
          transports.include?("cross-platform") ? :cross_platform : :platform
        end

        def serialize_credential(c)
          {
            id: c.id,
            label: c.label,
            transport: c.transport,
            last_used_at: c.last_used_at
          }
        end

        # Helper class for WebAuthn user representation
        class WebauthnUser
          attr_reader :id, :name, :display_name

          def initialize(id, name, display_name)
            @id = Base64.urlsafe_encode64(id).delete("=")
            @name = name
            @display_name = display_name
          end

          def webauthn_id
            @id
          end
        end
      end
    end
  end
end