# frozen_string_literal: true

class WebPushNotificationService
  def initialize(user)
    @user = user
  end

  def send(title:, body:, url: '/', tag: nil)
    payload = { title: title, body: body, url: url, tag: tag }.to_json
    subscriptions = @user.push_subscriptions.active

    subscriptions.find_each do |sub|
      PushNotificationDeliveryJob.perform_later(sub.id, payload)
    end
  end

  def self.vapid_key
    @vapid_key ||= WebPush::VapidKey.generate
  end
end
