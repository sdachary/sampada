# frozen_string_literal: true

module Api
  class RecurringDetectionController < Api::BaseController
    before_action :ensure_enabled

    def index
      detection = current_detection
      return render_success({ suggestions: [], detection: nil }) if detection.nil?

      render_success({
                       suggestions: detection.suggestions,
                       detection: { id: detection.id, result_version: detection.result_version,
                                    updated_at: detection.updated_at }
                     })
    end

    def detect
      detection = current_detection
      if detection && pending?(detection) && !force?
        return render_error('Suggestions are still pending review', status: :conflict,
                            errors: { suggestions: detection.suggestions })
      end

      suggestions = RecurringDetectionService.new(current_user).call
      detection ||= current_user.recurring_detections.build(result_version: RecurringDetectionService::RESULT_VERSION)
      detection.suggestions = suggestions
      detection.save!

      render_success({ suggestions: suggestions })
    rescue RecurringDetectionService::SyncLimitError
      render_error('Too many transactions to scan synchronously', status: :unprocessable_entity)
    end

    def update_suggestion
      detection = current_detection
      return render_error('No detection found', status: :not_found) if detection.nil?

      index = params[:idx].to_i
      suggestion = detection.suggestions[index]
      return render_error('Suggestion not found', status: :not_found) if suggestion.nil?

      requested = params[:status].to_s
      unless %w[accepted rejected edited].include?(requested)
        return render_error('Unsupported status', status: :unprocessable_entity)
      end
      return render_error('Suggestion already reviewed', status: :conflict) unless suggestion['status'] == 'pending'

      updated = requested == 'edited' ? suggestion.merge(edit_params) : suggestion
      updated['status'] = requested == 'rejected' ? 'rejected' : 'accepted'

      expense = nil
      if updated['status'] == 'accepted' && create_recurring?
        expense = create_expense(updated)
        return render_error('Could not create the recurring expense from this suggestion', status: :unprocessable_entity) if expense.nil?
      end

      detection.suggestions[index] = updated
      detection.save!

      render_success({ suggestion: updated, recurring_expense: expense_json(expense) })
    end

    private

    def ensure_enabled
      return if FeatureFlags.enabled?('recurring_detection', user: current_user)

      render_error('Recurring detection is not enabled', status: :not_implemented)
    end

    def current_detection
      current_user.recurring_detections.find_by(result_version: RecurringDetectionService::RESULT_VERSION)
    end

    def pending?(detection)
      detection.suggestions.any? { |s| s['status'] == 'pending' }
    end

    def force?
      params[:force].to_s == 'true'
    end

    def create_recurring?
      params[:create_recurring].nil? || params[:create_recurring].to_s != 'false'
    end

    def edit_params
      edits = params.permit(:name, :amount, :frequency, :next_due_date, :category).to_h.compact
      edits['amount_avg'] = edits['amount'].to_f if edits.key?('amount')
      edits
    end

    def create_expense(suggestion)
      RecurringExpense.transaction do
        expense = current_user.recurring_expenses.create!(
          name: suggestion['name'],
          amount: suggestion['amount_avg'],
          frequency: suggestion['frequency'],
          next_due_date: suggestion['next_due_date'],
          category: suggestion['category'],
          active: true
        )
        current_user.transactions.where(id: suggestion['example_tx_ids']).update_all(
          recurring_expense_id: expense.id,
          recurring: true,
          recurring_frequency: expense.frequency,
          updated_at: Time.current
        )
        expense
      end
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
      nil
    end

    def expense_json(expense)
      return nil if expense.nil?

      { id: expense.id, name: expense.name, amount: expense.amount.to_f, frequency: expense.frequency,
        next_due_date: expense.next_due_date }
    end
  end
end
