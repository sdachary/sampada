# frozen_string_literal: true

# Builds a minimal but valid PDF that looks like a bank statement table.
#
# The statement-import specs use this instead of committing binary fixtures:
# the statement content stays readable inside the spec, the bytes are
# deterministic, and no extra gem (Prawn) is needed to produce them.
# ponytail: minimal PDF writer — plain pages, Helvetica, positioned cells.
# It only has to be good enough for pdf-reader to extract positioned text.
module PdfStatementBuilder
  PAGE_WIDTH = 595
  PAGE_HEIGHT = 842

  # x position of each column, in points
  COLUMNS = {
    date: 40,
    description: 120,
    debit: 380,
    credit: 450,
    balance: 520
  }.freeze

  DEFAULT_HEADERS = %w[Date Description Debit Credit Balance].freeze

  # build({ rows:, headers:, title: })              -> one page
  # build({ rows: }, { rows: })                     -> several pages
  # build({ rows: }, encrypted: true)               -> an encrypted document
  #
  # rows: array of arrays (5 cells each: date, description, debit, credit, balance)
  # headers: array of 5 header labels, or nil for a page without a header row
  def self.build(*pages, encrypted: false)
    assemble(pages.map { |page| page.is_a?(Hash) ? page : { rows: page } }, encrypted: encrypted)
  end

  def self.page_content(page)
    content = +''
    content << row_ops([page[:title]], 40, 810, size: 12) if page[:title]
    content << row_ops(page[:headers] || DEFAULT_HEADERS, 40, 795) if page.fetch(:headers, DEFAULT_HEADERS)
    page[:rows].to_a.each_with_index do |cells, index|
      content << row_ops(cells, 40, 775 - (index * 14))
    end
    content
  end

  # One text block per cell, positioned absolutely so pdf-reader can tell the
  # columns apart.
  def self.row_ops(cells, _x, y, size: 9)
    ops = "BT\n/F1 #{size} Tf\n"
    COLUMNS.each_value.with_index do |column_x, index|
      text = cells[index].to_s
      next if text.empty?

      ops << "1 0 0 1 #{column_x} #{y} Tm (#{escape(text)}) Tj\n"
    end
    ops << "ET\n"
    ops
  end

  def self.escape(text)
    text.gsub('\\', '\\\\\\\\').gsub('(', '\\(').gsub(')', '\\)')
  end

  def self.assemble(pages, encrypted: false)
    contents = pages.map { |page| page_content(page) }
    page_count = contents.size
    # object layout: 1 catalog, 2 pages, then (page, content) per page, font last
    page_object_numbers = (1..page_count).map { |index| 2 + (index * 2) - 1 }
    font_object_number = 2 + (page_count * 2) + 1
    encrypt_object_number = font_object_number + 1

    objects = []
    objects << '<< /Type /Catalog /Pages 2 0 R >>'
    kids = page_object_numbers.map { |number| "#{number} 0 R" }.join(' ')
    objects << "<< /Type /Pages /Kids [#{kids}] /Count #{page_count} >>"
    contents.each_with_index do |content, index|
      page_number = page_object_numbers[index]
      content_number = page_number + 1
      objects << "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 #{PAGE_WIDTH} #{PAGE_HEIGHT}] " \
                 "/Resources << /Font << /F1 #{font_object_number} 0 R >> >> /Contents #{content_number} 0 R >>"
      objects << "<< /Length #{content.bytesize} >>\nstream\n#{content}endstream"
    end
    objects << '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    objects << '<< /Filter /Standard /V 1 /R 2 /O <00> /U <00> /P -1 >>' if encrypted

    out = +"%PDF-1.4\n"
    offsets = []
    objects.each_with_index do |body, index|
      offsets << out.bytesize
      out << "#{index + 1} 0 obj\n#{body}\nendobj\n"
    end

    xref_offset = out.bytesize
    out << "xref\n0 #{objects.size + 1}\n"
    out << "0000000000 65535 f \n"
    offsets.each { |offset| out << format("%010d 00000 n \n", offset) }

    trailer = "trailer\n<< /Size #{objects.size + 1} /Root 1 0 R"
    trailer += " /Encrypt #{encrypt_object_number} 0 R /ID [<0102> <0102>]" if encrypted
    trailer += " >>\nstartxref\n#{xref_offset}\n%%EOF\n"

    out + trailer
  end
end
