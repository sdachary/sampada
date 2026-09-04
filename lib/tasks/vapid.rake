# frozen_string_literal: true

namespace :vapid do
  desc 'Generate VAPID keys for Web Push notifications'
  task generate: :environment do
    key = WebPush::VapidKey.generate

    puts 'Add these to your .env file:'
    puts
    puts "VAPID_PUBLIC_KEY=#{key.public_key}"
    puts "VAPID_PRIVATE_KEY=#{key.private_key}"
    puts "VAPID_SUBJECT=mailto:notifications@sampada.app"
  end
end
