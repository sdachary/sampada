class NotificationMailer < ApplicationMailer
  def debt_milestone(user, debt, milestone)
    @user = user
    @debt = debt
    @milestone = milestone
    mail(
      to: user.email,
      subject: "Debt Milestone: #{milestone}",
      body: "Hi #{user.email},\n\nYou've reached a debt milestone: #{milestone} for #{debt.name}.\n\nKeep going!\n\nThanks,\nSampada Team"
    )
  end

  def sip_reminder(user, sip)
    @user = user
    @sip = sip
    mail(
      to: user.email,
      subject: "SIP Reminder: #{sip.name}",
      body: "Hi #{user.email},\n\nThis is a reminder for your SIP: #{sip.name}.\n\nHappy investing!\n\nThanks,\nSampada Team"
    )
  end

  def weekly_digest(user, stats)
    @user = user
    @stats = stats
    mail(
      to: user.email,
      subject: "Your Weekly Sampada Digest",
      body: "Hi #{user.email},\n\nHere's your weekly Sampada digest:\n\n#{stats}\n\nThanks,\nSampada Team"
    )
  end
end
