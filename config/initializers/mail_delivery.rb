# Use HTTP delivery method for emails via the mail relay service
require 'http_delivery'

if Rails.env.production?
  ActionMailer::Base.add_delivery_method :http_delivery, HttpDelivery
  ActionMailer::Base.delivery_method = :http_delivery
  ActionMailer::Base.http_delivery_settings = {
    http_url: 'http://localhost:4001/send'
  }
else
  # In development, use letter_opener or default
  ActionMailer::Base.delivery_method = :letter_opener
end
