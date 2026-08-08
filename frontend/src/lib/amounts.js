const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function twoDigits(n) {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')
}

function threeDigits(n) {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  let out = ''
  if (hundreds) out += ONES[hundreds] + ' hundred'
  if (rest) out += (out ? ' ' : '') + twoDigits(rest)
  return out
}

export function inWords(amount) {
  if (amount === 0) return 'zero'
  let n = Math.floor(amount)
  let out = ''
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (crore) out += threeDigits(crore) + ' crore'
  if (lakh) out += (out ? ' ' : '') + twoDigits(lakh) + ' lakh'
  if (thousand) out += (out ? ' ' : '') + twoDigits(thousand) + ' thousand'
  if (n) out += (out ? ' ' : '') + threeDigits(n)
  return out
}

export function echoAmount(amount, symbol) {
  return `${symbol || '₹'}${amount.toLocaleString('en-IN')} — ${inWords(amount)}`
}
