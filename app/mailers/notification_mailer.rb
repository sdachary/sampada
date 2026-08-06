class NotificationMailer < ApplicationMailer
  def debt_milestone(user, debt, milestone)
    @user = user
    @debt = debt
    @milestone = milestone
    mail(to: user.email, subject: "🎯 Debt Milestone: #{milestone}")
  end

  def sip_reminder(user, sip)
    @user = user
    @sip = sip
    mail(to: user.email, subject: "💼 SIP Reminder: #{sip.name}")
  end

  def weekly_digest(user, stats)
    @user = user
    @stats = stats
    mail(to: user.email, subject: "📊 Your Weekly Sampada Digest")
  end
end
