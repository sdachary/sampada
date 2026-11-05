# frozen_string_literal: true

require 'stringio'

module Import
  # Extracts transactions from a bank statement PDF.
  #
  # One archetype: a tabular statement (date / description / debit / credit /
  # balance). The table is located from its header row, so the differences
  # between banks are a label map — not a class per bank.
  #
  # Pure and synchronous: bytes in, rows out. Nothing is written to the
  # database here; the caller decides what to keep.
  class BankPdfParser
    Result = Struct.new(:transactions, :bank, :trust, :duplicate_count, :error, keyword_init: true)

    # one parsed statement row
    Transaction = Struct.new(
      :transaction_date, :description, :merchant, :amount, :transaction_type,
      :confidence, :duplicate, :source, :page,
      keyword_init: true
    )

    # header label => column key
    COLUMN_LABELS = {
      date: /\A(date|txn\.?\s*date|transaction date|value date)\z/i,
      description: /\A(description|particulars|narration|details|transaction details|remarks|payee)\z/i,
      debit: /\A(debit|withdrawal|withdrawals|paid out|amount debited|dr)\z/i,
      credit: /\A(credit|deposit|deposits|paid in|amount credited|cr)\z/i,
      balance: /\A(balance|closing balance|ledger balance|running balance)\z/i
    }.freeze

    BANK_PATTERNS = {
      'icici' => /ICICI Bank/i,
      'sbi' => /State Bank of India|\bSBI\b/i,
      'hdfc' => /HDFC Bank/i,
      'axis' => /Axis Bank/i,
      'kotak' => /Kotak/i
    }.freeze

    # %y first: it matches exactly two digits, so a four digit year falls
    # through to %Y instead of being read as year 24.
    DATE_FORMATS = [
      '%d-%b-%y', '%d-%b-%Y', '%d %b %y', '%d %b %Y', '%b %d %y', '%b %d %Y',
      '%Y-%m-%d', '%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d.%m.%Y'
    ].freeze

    # clean amounts: grouped with commas, or plain
    AMOUNT_GROUPED = /\A-?\d{1,3}(,\d{3})*(\.\d{1,2})?\z/
    AMOUNT_PLAIN = /\A-?\d+(\.\d{1,2})?\z/
    # fallback amounts: spaces as thousand separators, or a decimal comma
    AMOUNT_SPACED = /\A-?\d{1,3}( \d{3})*(\.\d{1,2})?\z/
    AMOUNT_DECIMAL_COMMA = /\A-?\d+,\d{1,2}\z/

    BASE_MATCHED = 0.9
    BASE_UNMATCHED = 0.5
    BASE_NO_REFERENCE = 0.7
    PENALTY_FUZZY_DATE = 0.3
    PENALTY_FALLBACK_AMOUNT = 0.5
    FACTOR_UNKNOWN_BANK = 0.7
    FACTOR_LOW_TRUST = 0.8
    LOW_TRUST_RATE = 0.9
    MIN_YEAR = 2000
    MAX_YEAR = 2100

    # existing: transactions already stored for the user, used for the duplicate
    # check. Each entry responds to transaction_date / amount / merchant.
    def initialize(bytes, existing: [])
      @bytes = bytes
      @existing = build_duplicate_index(existing)
    end

    def call
      reader = PDF::Reader.new(StringIO.new(@bytes))
      pages = reader.pages.map { |page| rows_of(page) }
      bank = detect_bank(pages.flatten)
      columns = find_columns(pages)
      return empty_result(bank) if columns.nil?

      rows = extract_rows(pages, columns)
      return empty_result(bank) if rows.empty?

      mark_balance_matches(rows)
      trust = trust_level(rows)
      transactions = rows.map { |row| build_transaction(row, bank, trust) }

      Result.new(
        transactions: transactions,
        bank: bank,
        trust: trust,
        duplicate_count: transactions.count(&:duplicate)
      )
    rescue PDF::Reader::EncryptedPDFError
      Result.new(transactions: [], bank: 'unknown', trust: 'unknown', duplicate_count: 0, error: 'encrypted_pdf')
    rescue PDF::Reader::MalformedPDFError, PDF::Reader::UnsupportedFeatureError
      Result.new(transactions: [], bank: 'unknown', trust: 'unknown', duplicate_count: 0, error: 'invalid_file')
    end

    private

    def empty_result(bank)
      Result.new(transactions: [], bank: bank, trust: 'unknown', duplicate_count: 0)
    end

    # Runs of the page, grouped into rows by their vertical position.
    def rows_of(page)
      receiver = PDF::Reader::PageTextReceiver.new
      page.walk(receiver)
      receiver.runs
              .group_by { |run| run.y.round }
              .sort_by { |_y, runs| -runs.first.y }
              .map { |_y, runs| runs.sort_by(&:x) }
    end

    # The header row is the first row whose labels map to a date column and at
    # least one amount column.
    def find_columns(pages)
      pages.each do |page_rows|
        page_rows.each do |row|
          columns = columns_from(row)
          return columns if columns
        end
      end
      nil
    end

    def columns_from(row)
      found = row.filter_map do |run|
        key = COLUMN_LABELS.find { |_key, pattern| run.text.to_s.strip.match?(pattern) }&.first
        next if key.nil?

        [key, run.x]
      end
      return nil unless found.any? { |key, _x| key == :date }
      return nil unless found.any? { |key, _x| %i[debit credit].include?(key) }

      found.sort_by { |_key, x| x }
    end

    # A cell belongs to the nearest header to its left: statements left-align
    # their columns, and a long description may run past the next header.
    def column_for(x, columns)
      match = columns.select { |_key, header_x| x >= header_x }.last
      (match || columns.first)&.first
    end

    def extract_rows(pages, columns)
      rows = []
      header_found = false
      pages.each_with_index do |page_rows, page_index|
        page_rows.each do |row|
          unless header_found
            header_found = true if columns_from(row)
            next
          end

          cells = Hash.new { |hash, key| hash[key] = [] }
          row.each do |run|
            key = column_for(run.x, columns)
            next if key.nil?

            cells[key] << run.text.to_s.strip
          end

          parsed = parse_row(cells, page_index + 1)
          rows << parsed if parsed
        end
      end
      rows
    end

    def parse_row(cells, page)
      debit_text = cells[:debit].reject(&:empty?).join(' ')
      credit_text = cells[:credit].reject(&:empty?).join(' ')
      return nil if debit_text.empty? && credit_text.empty?

      raw_date = cells[:date].reject(&:empty?).join(' ').strip
      return nil if raw_date.empty?

      date, fuzzy_date = parse_date(raw_date)
      return nil if date.nil?

      text = debit_text.empty? ? credit_text : debit_text
      amount, fallback_amount = parse_amount(text)
      return nil if amount.nil?

      balance, = parse_amount(cells[:balance].reject(&:empty?).join(' '))

      {
        date: date,
        description: cells[:description].reject(&:empty?).join(' ').strip,
        amount: amount.abs,
        transaction_type: debit_text.empty? ? 'income' : 'expense',
        balance: balance,
        fuzzy_date: fuzzy_date,
        fallback_amount: fallback_amount,
        page: page
      }
    end

    # Returns [date, fuzzy]. A date that needed cleaning (a stray comma, a
    # trailing time) is fuzzy: it parses, but it is worth a second look.
    def parse_date(raw)
      cleaned = raw.gsub(/\d{1,2}:\d{2}(:\d{2})?/, '').gsub(',', ' ').gsub(/\s+/, ' ').strip
      fuzzy = cleaned != raw.strip
      DATE_FORMATS.each do |format|
        begin
          date = Date.strptime(cleaned, format)
        rescue ArgumentError
          next
        end
        return [nil, fuzzy] if date.year < MIN_YEAR || date.year > MAX_YEAR

        return [date, fuzzy]
      end
      [nil, fuzzy]
    end

    # Returns [amount, fallback]. The fallback flag marks an amount that had to
    # be rescued by a looser pattern (spaces as thousand separators, a decimal
    # comma) — those rows are flagged for manual review.
    def parse_amount(raw)
      text = raw.to_s.strip
      return [nil, false] if text.empty?

      negative = false
      if text.match?(/\A\(.*\)\z/)
        negative = true
        text = text[1..-2].strip
      end
      text = text.gsub(/\b(DR|CR)\b/i, '').strip
      text = text.gsub(/[₹$€£]/, '').strip
      negative ||= text.start_with?('-')
      text = text.delete_prefix('-').strip

      if text.match?(AMOUNT_GROUPED) || text.match?(AMOUNT_PLAIN)
        value = text.delete(',').to_f
      elsif text.match?(AMOUNT_SPACED)
        value = text.delete(' ').to_f
        return [negative ? -value : value, true]
      elsif text.match?(AMOUNT_DECIMAL_COMMA)
        value = text.tr(',', '.').to_f
        return [negative ? -value : value, true]
      else
        return [nil, false]
      end

      [negative ? -value : value, false]
    end

    # A row is trusted when the balance moves by the row amount. The first row
    # has no previous balance to compare, so it cannot be checked.
    def mark_balance_matches(rows)
      rows.each_with_index do |row, index|
        previous = index.zero? ? nil : rows[index - 1]
        row[:previous_balance] = previous && previous[:balance]
        row[:balance_matches] = !row[:previous_balance].nil? && !row[:balance].nil? &&
                                ((row[:previous_balance] - row[:balance]).abs - row[:amount]).abs < 0.01
      end
    end

    def trust_level(rows)
      checkable = rows.count { |row| row[:previous_balance] && row[:balance] }
      return 'unknown' if checkable.zero?

      matches = rows.count { |row| row[:balance_matches] }
      matches.to_f / checkable >= LOW_TRUST_RATE ? 'high' : 'low'
    end

    def build_transaction(row, bank, trust)
      merchant = merchant_name(row[:description])
      duplicate = @existing.include?(duplicate_key(row[:date], row[:amount], merchant))

      Transaction.new(
        transaction_date: row[:date],
        description: row[:description],
        merchant: merchant,
        amount: row[:amount],
        transaction_type: row[:transaction_type],
        confidence: confidence_for(row, bank, trust),
        duplicate: duplicate,
        source: 'bank_pdf',
        page: row[:page]
      )
    end

    def confidence_for(row, bank, trust)
      confidence = if row[:balance].nil? || row[:previous_balance].nil?
                     BASE_NO_REFERENCE
                   elsif row[:balance_matches]
                     BASE_MATCHED
                   else
                     BASE_UNMATCHED
                   end

      confidence -= PENALTY_FUZZY_DATE if row[:fuzzy_date]
      confidence -= PENALTY_FALLBACK_AMOUNT if row[:fallback_amount]
      confidence *= FACTOR_UNKNOWN_BANK if bank == 'unknown'
      confidence *= FACTOR_LOW_TRUST if trust == 'low'
      confidence.clamp(0.0, 1.0).round(2)
    end

    def detect_bank(runs)
      text = runs.map { |run| run.text.to_s }.join(' ')
      BANK_PATTERNS.each { |bank, pattern| return bank if text.match?(pattern) }
      'unknown'
    end

    # "UPI/998877/netflix/ref1" => "netflix"; long reference noise is dropped.
    def merchant_name(description)
      text = description.to_s.strip
      upi = text.match(%r{\Aupi/[^/]+/([^/]+)}i)
      text = upi[1] if upi
      text = text.gsub(/x{2,}\d+/i, ' ').gsub(/\b\d{6,}\b/, ' ').gsub(/\s+/, ' ').strip
      text[0, 60]
    end

    def duplicate_key(date, amount, merchant)
      "#{date}|#{amount.to_f.round(2)}|#{merchant.to_s.downcase[0, 12]}"
    end

    def build_duplicate_index(existing)
      Set.new(
        existing.map do |transaction|
          date = transaction.respond_to?(:transaction_date) ? transaction.transaction_date : transaction[:transaction_date]
          amount = transaction.respond_to?(:amount) ? transaction.amount : transaction[:amount]
          merchant = transaction.respond_to?(:merchant) ? transaction.merchant : transaction[:merchant]
          duplicate_key(date, amount.to_f, merchant.to_s)
        end
      )
    end
  end
end
