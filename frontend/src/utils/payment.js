export function formatPrice(amount) {
  return amount.toLocaleString('fr-FR') + ' F CFA'
}

const MOBILE_MONEY_METHODS = {
  wave: { label: 'Wave', number: '0702396063', operator: 'Wave' },
  moov: { label: 'Moov Money', number: '0161136379', operator: 'Moov' },
  mtn: { label: 'MTN Money', number: '0500838940', operator: 'MTN' },
  orange: { label: 'Orange Money', number: '0716557419', operator: 'Orange' },
}

export function getPaymentMethodDetails(method, overrides = {}) {
  const methodInfo = MOBILE_MONEY_METHODS[method] || MOBILE_MONEY_METHODS.orange
  return { ...methodInfo, ...overrides }
}

export function generateMobileMoneyLink(method, number) {
  const details = number ? { number } : getPaymentMethodDetails(method)
  return details.number ? `tel:${details.number}` : null
}
