module Providers
  class YahooFinanceAdapter
    BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'.freeze
    SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search'.freeze
    TIMEOUT = 5

    EXCHANGE_COUNTRY_MAP = {
      'NSE' => 'IN', 'BSE' => 'IN',
      'NYQ' => 'US', 'NAS' => 'US', 'PCX' => 'US',
      'LSE' => 'UK', 'LON' => 'UK',
      'TSE' => 'JP', 'OSA' => 'JP',
      'FRA' => 'DE', 'GER' => 'DE', 'XETRA' => 'DE',
      'ASX' => 'AU',
      'HKG' => 'HK', 'HKEX' => 'HK',
      'TOR' => 'CA', 'TSX' => 'CA',
      'SWX' => 'CH', 'EBS' => 'CH',
      'STO' => 'SE', 'HEL' => 'FI',
      'CPH' => 'DK', 'OSL' => 'NO',
      'MCE' => 'ES', 'MIL' => 'IT',
      'EPA' => 'FR', 'AMS' => 'NL',
      'BRU' => 'BE', 'VIE' => 'AT',
      'KRX' => 'KR', 'KOSDAQ' => 'KR',
      'TPE' => 'TW', 'TWO' => 'TW',
      'SGX' => 'SG', 'BOM' => 'IN'
    }.freeze

    def fetch_quote(symbol)
      response = Faraday.get("#{BASE_URL}/#{symbol}") do |req|
        req.headers['User-Agent'] = 'Mozilla/5.0'
        req.options.timeout = TIMEOUT
      end
      return nil unless response.success?

      parsed = JSON.parse(response.body)
      result = parsed.dig('chart', 'result', 0)
      return nil unless result

      meta = result['meta'] || {}
      quote = result.dig('indicators', 'quote', 0) || {}
      idx = (quote['close']&.compact&.length || 1) - 1

      {
        symbol: meta['symbol'],
        price: quote.dig('close', idx) || meta['regularMarketPrice'],
        currency: meta['currency'],
        market_time: meta['regularMarketTime'] ? Time.zone.at(meta['regularMarketTime']) : nil,
        previous_close: meta['previousClose'],
        day_high: quote.dig('high', idx),
        day_low: quote.dig('low', idx),
        volume: quote.dig('volume', idx),
        exchange: meta['exchangeName'],
        exchange_timezone: meta['exchangeTimezoneName']
      }
    rescue Faraday::Error, Net::OpenTimeout => e
      Rails.logger.warn "[YahooFinance] Failed to fetch #{symbol}: #{e.message}"
      nil
    end

    def search(query)
      response = Faraday.get("#{SEARCH_URL}?q=#{CGI.escape(query)}") do |req|
        req.headers['User-Agent'] = 'Mozilla/5.0'
        req.options.timeout = TIMEOUT
      end
      return [] unless response.success?

      parsed = JSON.parse(response.body)
      (parsed['quotes'] || []).select { |q| q['typeDisp'] == 'Equity' }.map do |q|
        exchange = q['exchange']
        country = EXCHANGE_COUNTRY_MAP[exchange]
        {
          symbol: q['symbol'],
          name: q['longname'] || q['shortname'],
          exchange: exchange,
          country: country,
          currency: country_currency(country)
        }
      end
    rescue Faraday::Error
      []
    end

    def fetch_dividend(symbol)
      url = "https://query1.finance.yahoo.com/v8/finance/chart/#{symbol}?range=1y&interval=1mo"
      response = Faraday.get(url) do |req|
        req.headers['User-Agent'] = 'Mozilla/5.0'
        req.options.timeout = TIMEOUT
      end
      return nil unless response.success?

      parsed = JSON.parse(response.body)
      result = parsed.dig('chart', 'result', 0)
      return nil unless result

      events = result.dig('events', 'dividends')
      return nil unless events

      annual_dividend = events.values.sum { |d| d['amount'].to_f }
      meta = result['meta'] || {}
      price = meta['regularMarketPrice'] || 0
      yield_pct = price.positive? ? ((annual_dividend / price) * 100).round(2) : 0

      { annual_dividend: annual_dividend.round(4), yield: yield_pct, occurrences: events.size }
    rescue Faraday::Error
      nil
    end

    def fetch_exchange_rate(from, to)
      symbol = "#{from}#{to}=X"
      quote = fetch_quote(symbol)
      quote ? quote[:price] : nil
    end

    CURRENCY_MAP = {
      'IN' => 'INR', 'US' => 'USD', 'UK' => 'GBP', 'JP' => 'JPY',
      'DE' => 'EUR', 'FR' => 'EUR', 'IT' => 'EUR', 'ES' => 'EUR',
      'NL' => 'EUR', 'BE' => 'EUR', 'AT' => 'EUR', 'FI' => 'EUR',
      'GR' => 'EUR', 'PT' => 'EUR', 'IE' => 'EUR', 'SK' => 'EUR',
      'SI' => 'EUR', 'LU' => 'EUR', 'CY' => 'EUR', 'MT' => 'EUR',
      'LV' => 'EUR', 'LT' => 'EUR', 'EE' => 'EUR'
    }.freeze

    private

    def country_currency(country)
      CURRENCY_MAP[country] || 'USD'
    end
  end
end
