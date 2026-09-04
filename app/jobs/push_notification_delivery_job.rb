# frozen_string_literal: true

class PushNotificationDeliveryJob < ApplicationJob
  queue_as :default

  def perform(subscription_id, payload_json)
    subscription = PushSubscription.find_by(id: subscription_id)
    return unless subscription

    if subscription.expired?
      subscription.destroy
      return
    end

    WebPush.payload_send(
      message: payload_json,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      vapid: {
        subject: ENV.fetch('VAPID_SUBJECT', 'mailto:notifications@sampada.app'),
        public_key: ENV.fetch('VAPID_PUBLIC_KEY'),
        private_key: ENV.fetch('VAPID_PRIVATE_KEY')
      }
    )
  rescue WebPush::ExpiredSubscription
    subscription.destroy
  rescue WebPush::Unauthorized
    subscription.destroy
  rescue StandardError => e
    Rails.logger.warn "[WebPush] Delivery failed for #{subscription_id}: #{e.message}"
  end
end
