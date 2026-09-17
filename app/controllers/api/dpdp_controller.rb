module Api
  class DpdpController < Api::BaseController
    def consent
      record = nil
      ConsentRecord.transaction do
        # Withdrawal has to actually take effect: close the open grant(s), or the
        # `active` scope (granted AND never revoked) keeps reporting the feature as
        # consented forever, making revocation a silent no-op.
        revoke_active_grants if params[:granted] == false

        record = current_user.consent_records.create!(
          feature: params[:feature],
          granted: params[:granted],
          ip_address: request.remote_ip,
          user_agent: request.user_agent,
          granted_at: Time.current
        )
      end

      render json: { success: true, consent: record }
    end

    def consent_status
      records = current_user.consent_records.active
      status = ConsentRecord::FEATURES.index_with do |feature|
        records.any? { |r| r.feature == feature }
      end

      render json: { consent: status }
    end

    def erasure
      return render json: { error: 'A deletion request is already pending' }, status: :conflict if current_user.deletion_requests.pending.exists?

      request_record = current_user.deletion_requests.create!(
        export_data: params.fetch(:export_data, true),
        notes: params[:notes]
      )

      render json: {
        success: true,
        message: 'Deletion request submitted. You have 48 hours to cancel.',
        cancel_token: request_record.cancel_token,
        scheduled_for: request_record.scheduled_for
      }
    end

    # The 48 hour cooling-off window must survive a page reload: the cancel
    # token is otherwise only ever seen in the POST response that created it.
    def deletion_requests
      records = current_user.deletion_requests.pending.order(created_at: :desc)

      render json: {
        deletion_requests: records.map do |r|
          {
            id: r.id,
            status: r.status,
            cancel_token: r.cancel_token,
            scheduled_for: r.scheduled_for,
            created_at: r.created_at
          }
        end
      }
    end

    def cancel_deletion
      request_record = current_user.deletion_requests.pending.find_by!(cancel_token: params.expect(:cancel_token))
      request_record.cancel!

      render json: { success: true, message: 'Deletion request cancelled.' }
    end

    def full_export
      export = {
        exported_at: Time.current.iso8601,
        user: {
          id: current_user.id,
          email: current_user.email,
          first_name: current_user.first_name,
          last_name: current_user.last_name,
          currency: current_user.currency,
          locale: current_user.locale,
          timezone: current_user.timezone,
          onboarded: current_user.onboarded,
          created_at: current_user.created_at,
          updated_at: current_user.updated_at
        },
        consent_records: current_user.consent_records.order(created_at: :desc).map do |r|
          { feature: r.feature, granted: r.granted, granted_at: r.granted_at, revoked_at: r.revoked_at }
        end,
        deletion_requests: current_user.deletion_requests.order(created_at: :desc).map do |r|
          { status: r.status, scheduled_for: r.scheduled_for, created_at: r.created_at }
        end,
        debts: current_user.debts.order(created_at: :desc),
        portfolios: current_user.portfolios.order(created_at: :desc).map do |p|
          p.as_json(include: :investments)
        end,
        journeys: current_user.journeys.order(created_at: :desc),
        net_worth_snapshots: current_user.net_worth_snapshots.order(snapshot_date: :desc),
        recurring_expenses: current_user.recurring_expenses.order(created_at: :desc),
        transactions: current_user.transactions.order(transaction_date: :desc),
        budgets: current_user.budgets.order(created_at: :desc),
        trips: current_user.trips.order(created_at: :desc),
        conversations: current_user.conversations.order(created_at: :desc).map do |c|
          { id: c.id, title: c.title, messages: c.messages.order(created_at: :asc).map do |m|
            { role: m.role, content: m.content, created_at: m.created_at }
          end }
        end,
        grievances: current_user.grievances.order(created_at: :desc)
      }

      render json: export
    end

    def grievance
      record = current_user.grievances.create!(
        name: grievance_name,
        email: params[:email].presence || current_user.email,
        phone: params[:phone],
        grievance_type: params[:grievance_type],
        description: params[:description],
        acknowledged_at: Time.current
      )

      render json: {
        success: true,
        reference_number: record.reference_number,
        status: 'received',
        expected_response: '72 hours',
        expected_resolution: '90 days',
        message: 'Grievance received. We will respond within 72 hours.'
      }
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.message }, status: :unprocessable_content
    end

    private

    # Filing a grievance must never fail for want of a name: prefer an explicit
    # one, then the account name, then the email. (The old fallback interpolated
    # nil names into " ", which `presence` treats as blank and rejected.)
    def grievance_name
      account_name = [current_user.first_name, current_user.last_name].compact_blank.join(' ')
      params[:name].presence || account_name.presence || current_user.email
    end

    # A revocation lands as a new row (consent history is append-only); the grant
    # rows it supersedes are closed in place so `active` stops returning them.
    def revoke_active_grants
      current_user.consent_records.active
                  .where(feature: params[:feature])
                  .update_all(revoked_at: Time.current, updated_at: Time.current)
    end
  end
end
