class NotificationService
  def initialize(user)
    @user = user
  end

  def notify_debt_milestone(debt, milestone)
    NotificationMailer.debt_milestone(@user, debt, milestone).deliver_later
    create_in_app_notification('debt_milestone', "#{milestone} for #{debt.name}")
  end

  def notify_sip_reminder(sip)
    NotificationMailer.sip_reminder(@user, sip).deliver_later
    create_in_app_notification('sip_reminder', "SIP due: #{sip.name}")
  end

  def send_weekly_digest(user, stats)
    NotificationMailer.weekly_digest(user, stats).deliver_later
  end

  private

  def create_in_app_notification(ntype, message)
    @user.notifications.create(notification_type: ntype, message: message)
  rescue StandardError => e
    Rails.logger.warn "[Notifications] Failed to create: #{e.message}"
  end
end
