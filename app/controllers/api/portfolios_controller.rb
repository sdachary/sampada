module Api
  class PortfoliosController < Api::BaseController
    include ScopedCrud

    crud_for :portfolios, serialize: :portfolio_json, params: :portfolio_params

    def rebalance
      portfolio = current_user.portfolios.find(params.expect(:id))
      investments = portfolio.investments
      stocks = investments.select { |i| %w[stock etf].include?(i.investment_type.to_s) }

      return render_success({ message: 'No stock or ETF investments to rebalance' }) if stocks.empty?

      assets = stocks.map do |inv|
        {
          symbol: inv.symbol,
          expected_return: inv.expected_return || 0.10,
          volatility: inv.volatility || 0.20
        }
      end

      service = PortfolioService.new(assets, risk_tolerance: portfolio.risk_tolerance || 0.5)
      result = service.optimize

      render_success(result)
    end

    def rebalance_v2
      portfolio = current_user.portfolios.find(params.expect(:id))
      config = portfolio.rebalance_config_or_build
      config.assign_attributes(rebalance_config_params) if params[:rebalance_config].present?
      config.save!

      holdings = portfolio.holdings_for_rebalance
      return render_success({ rows: [], summary: {}, warnings: ['No priced holdings found'] }) if holdings.empty?

      engine_config = config.to_engine_config.merge(
        contribution: params[:contribution]&.to_f || config.contribution.to_f
      )

      # TODO: Load rebalance_v2 engine here (currently frontend-only)
      # For now return config + holdings for frontend engine
      render_success({
        config: config.to_engine_config,
        holdings: portfolio.holdings_for_rebalance,
        warnings: [],
      })
    end

    def rebalance_config
      portfolio = current_user.portfolios.find(params.expect(:id))
      config = portfolio.rebalance_config_or_build
      render_success(config.to_engine_config)
    end

    def update_rebalance_config
      portfolio = current_user.portfolios.find(params.expect(:id))
      config = portfolio.rebalance_config_or_build
      config.assign_attributes(rebalance_config_params)
      config.save!
      render_success(config.to_engine_config)
    end

    def prices
      portfolio = current_user.portfolios.find(params.expect(:id))
      PriceRefreshJob.perform_async(portfolio.id)
      prices = Rails.cache.read("#{PriceRefreshJob::QUOTE_CACHE_PREFIX}#{portfolio.id}") || []
      render_success({ portfolio_id: portfolio.id, prices: prices, updated_at: Time.current })
    end

    def import_investments
      portfolio = current_user.portfolios.find(params.expect(:id))
      preview = params[:preview] == 'true'

      file = params[:file]
      return render_error('No file provided') unless file

      result = parse_csv(file)
      return render_error(result[:error]) if result[:error]

      if preview
        render_success({ preview: result[:rows], warnings: result[:warnings] })
      else
        created = import_rows(portfolio, result[:rows])
        render_success({ created: created.count, errors: result[:warnings] })
      end
    end

    private

    def portfolio_params
      source = params[:portfolio].presence || params
      source.permit(:name, :goal, :risk_tolerance, :currency_code, :description,
                    target_allocation: {}, current_allocation: {})
    end

    def rebalance_config_params
      params.require(:rebalance_config).permit(
        :contribution, :dividend_ratio, :growth_ratio,
        :dip_threshold, :dip_boost, :trend_down_penalty, :momentum_tilt,
        :max_position_weight, :max_sector_weight, :max_add_share,
        :fee_reserve_pct, :min_order_value, :max_orders, :target_mode
      )
    end

    def portfolio_json(p)
      total_value = p.respond_to?(:total_value) ? p.total_value.to_f : p.amount.to_f
      all_sectors = p.allocation_summary

      {
        id: p.id, name: p.name, goal: p.goal, risk_tolerance: p.risk_tolerance&.to_f,
        total_value: total_value,
        allocation_summary: all_sectors,
        investments: p.investments.map { |i| investment_json(i) },
        dividend_sips: p.dividend_sips.map do |ds|
          { id: ds.id, amount: ds.amount.to_f, frequency: ds.frequency, status: ds.status,
            target_income: ds.target_income.to_f, next_execution: ds.next_execution }
        end,
        rebalance_config: p.rebalance_config&.to_engine_config,
        created_at: p.created_at
      }
    end

    def investment_json(i)
      {
        id: i.id, symbol: i.symbol, name: i.name,
        investment_type: i.investment_type, exchange: i.exchange,
        shares: i.shares, buy_price: i.buy_price.to_f,
        current_price: i.current_price.to_f,
        current_value: i.current_value.round(2),
        cost_basis: i.cost_basis.round(2),
        gain_loss: i.gain_loss.round(2),
        gain_loss_pct: i.gain_loss_percentage,
        dividend_yield: i.dividend_yield.to_f,
        sector: i.sector&.name,
        sector_id: i.sector_id,
        currency_code: i.currency_code,
        instrument_sub_type: i.instrument_sub_type,
        rebalance_settings: i.rebalance_settings,
      }
    end

    def parse_csv(file)
      require 'csv'
      rows = []
      warnings = []

      CSV.foreach(file.path, headers: true, header_converters: :symbol) do |row|
        r = row.to_h.transform_keys(&:to_s)
        errors = validate_csv_row(r)
        if errors.any?
          warnings << { row: r, errors: errors }
          next
        end
        rows << normalize_csv_row(r)
      end

      { rows: rows, warnings: warnings }
    end

    def validate_csv_row(r)
      errors = []
      errors << 'Symbol required' if r['symbol'].blank?
      errors << 'Shares must be a positive number' if r['shares'].blank? || r['shares'].to_f < 0
      errors << 'Buy price required' if r['buy_price'].blank? || r['buy_price'].to_f < 0
      errors
    end

    def normalize_csv_row(r)
      {
        symbol: r['symbol']&.upcase,
        name: r['name'],
        shares: r['shares'].to_f,
        buy_price: r['buy_price'].to_f,
        investment_type: r['investment_type']&.downcase || 'stock',
        exchange: r['exchange']&.upcase || 'NSE',
        sector: r['sector'],
        currency_code: r['currency_code'] || 'INR',
        current_price: r['current_price']&.to_f,
        current_price_as_of: r['current_price_as_of']&.to_time,
        dividend_yield: r['dividend_yield']&.to_f,
        instrument_sub_type: r['instrument_sub_type']&.capitalize,
        rebalance_settings: {
          targetWeight: r['target_weight']&.to_f,
          conviction: r['conviction'] == 'true',
          paused: r['paused'] == 'true',
          trend: r['trend'],
          mom6m: r['mom6m']&.to_f,
        }.compact,
      }
    end

    def import_rows(portfolio, rows)
      created = []
      rows.each do |attrs|
        sector_name = attrs.delete(:sector)
        sector = Sector.find_by(name: sector_name) if sector_name.present?
        investment = portfolio.investments.create!(attrs.merge(sector: sector))
        created << investment
      end
      created
    end
  end
end