require 'net/http'
require 'uri'
require 'json'

class HttpDelivery
  attr_reader :settings

  def initialize(settings = {})
    @settings = settings
  end

  def deliver!(mail)
    url = settings[:http_url]
    raise ArgumentError, 'Missing http_url setting' if url.blank?

    uri = URI.parse(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')

    subject = mail.subject
    body = mail.body.raw_source

    mail.destinations.each do |recipient|
      payload = {
        to: recipient,
        subject: subject,
        text: body
      }.to_json

      request = Net::HTTP::Post.new(uri.request_uri, 'Content-Type' => 'application/json')
      request.body = payload
      response = http.request(request)
      raise "Failed to send email to #{recipient}: #{response.code} #{response.body}" unless response.code == '200'
    end
  end
end
