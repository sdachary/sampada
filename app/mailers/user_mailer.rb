class UserMailer < ApplicationMailer
  def password_reset(user, token)
    @user = user
    @token = token
    @reset_url = "#{ENV.fetch('APP_URL', 'http://localhost:5173')}/reset-password/#{token}"
    mail to: user.email, subject: "Reset your Sampada password"
  end
end
