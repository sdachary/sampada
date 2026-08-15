# frozen_string_literal: true

module Api
  class NetWorthSnapshotsController < Api::BaseController
    def index
      snapshots = current_user.net_worth_snapshots.recent
      render_success(snapshots.map { |s| snapshot_json(s) })
    end

    def show
      snapshot = if params[:id] == 'current'
                   NetWorthSnapshot.current(current_user)
                 else
                   current_user.net_worth_snapshots.find(params[:id])
                 end
      render_success(snapshot_json(snapshot))
    end

    private

    def snapshot_json(s)
      { id: s.id, snapshot_date: s.snapshot_date,
        total_assets: s.total_assets&.to_f,
        total_liabilities: s.total_liabilities&.to_f,
        net_worth: s.net_worth&.to_f, breakdown: s.breakdown,
        created_at: s.created_at, currency_code: s.currency_code,
        currency_symbol: Currency.symbol_for(s.currency_code) }
    end
  end
end
