class RecurringExpenseService
  def initialize(expenses)
    @expenses = expenses.map(&:symbolize_keys)
  end

  def generate_events(start_date, end_date)
    start_date = Date.parse(start_date.to_s)
    end_date = Date.parse(end_date.to_s)
    events = []

    @expenses.each do |expense|
      generate_expense_events(expense, start_date, end_date).each do |event|
        events << event
      end
    end

    events.sort_by { |e| e[:date] }
  end

  private

  def generate_expense_events(expense, start_date, end_date)
    events = []
    current = next_occurrence(expense[:start_date] || start_date, expense[:frequency])

    while current <= end_date
      break if expense[:end_date] && current > Date.parse(expense[:end_date].to_s)

      events << {
        id: expense[:id],
        title: expense[:name],
        date: current,
        amount: expense[:amount],
        frequency: expense[:frequency]
      }
      current = next_occurrence(current + 1.day, expense[:frequency])
    end

    events
  end

  def next_occurrence(from_date, frequency)
    date = Date.parse(from_date.to_s)
    case frequency&.to_sym
    when :weekly
      date + ((7 - date.wday) % 7).days
    when :monthly
      date.day == 1 ? date : date.beginning_of_month.next_month
    when :yearly
      date.month == 1 && date.day == 1 ? date : date.beginning_of_year.next_year
    else
      date
    end
  end
end
