# frozen_string_literal: true

module Api
  class PushSubscriptionsController < Api::BaseController
    def create
      subscription = current_user.push_subscriptions.find_or_initialize_by(
        endpoint: params[:endpoint]
      )
      subscription.assign_attributes(
        p256dh: params.dig(:keys, :p256dh),
        auth: params.dig(:keys, :auth),
        user_agent: request.user_agent,
        expires_at: params[:expirationTime] ? Time.at(params[:expirationTime].to_i) : nil
      )

      if subscription.save
        render_success({ id: subscription.id }, message: 'Push subscription registered')
      else
        render_error(subscription.errors.full_messages.join(', '))
      end
    end

    def destroy
      subscription = current_user.push_subscriptions.find(params[:id])
      subscription.destroy
      render_success({}, message: 'Push subscription removed')
    end

    def vapid_public_key
      render_success({ public_key: ENV.fetch('VAPID_PUBLIC_KEY', '') })
    end
  end
end
