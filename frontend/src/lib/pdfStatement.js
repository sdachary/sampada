// Client-side PDF text extraction. The raw PDF never leaves the browser.
import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

const INCOME_WORDS = /salary|credit|deposit|refund|cashback|interest|dividend|received|paid in/i
const BANKS = [/hdfc/i, /icici/i, /sbi/i, /axis bank/i, /kotak/i, /pnb/i, /canara/i]

function parseLine(line) {
  const m = line.match(/(\d{4}-\d{2}-\d{2}|\d{2}[\/-]\d{2}[\/-]\d{2,4})\s+(.+?)\s+(?:₹|Rs\.?\s*)?([\d,]+\.\d{2})\s*(CR|DR)?/i)
  if (!m) return null
  const rawDate = m[1]
  const parts = rawDate.split(/[\/-]/)
  const iso = rawDate.includes('-') && rawDate.length === 10
    ? rawDate
    : `${parts[2].length === 2 ? '20' + parts[2] : parts[2]}-${parts[1]}-${parts[0]}`
  const description = m[2].trim().replace(/\s+/g, ' ')
  const amount = Number(m[3].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount === 0) return null
  const kind = m[4]
  const type = kind ? (kind.toUpperCase() === 'CR' ? 'income' : 'expense') : (INCOME_WORDS.test(description) ? 'income' : 'expense')
  return {
    transaction_date: iso,
    description,
    amount,
    transaction_type: type,
    confidence: kind ? 0.95 : 0.72,
    merchant: null,
  }
}

export async function parseStatement(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const rows = []
  let text = ''
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    text += pageText + '\n'
    for (const line of pageText.split(/(?=\d{4}-\d{2}-\d{2}|\d{2}[\/-]\d{2}[\/-]\d{2,4})/)) {
      const row = parseLine(line)
      if (row) rows.push(row)
    }
  }
  const bank = BANKS.find((re) => re.test(text))?.[0] || 'unknown'
  return { rows, bank: bank.replace(/\//gi, '') }
}
