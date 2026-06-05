export function formatPrice(amount) {
  return amount.toLocaleString('fr-FR') + ' F CFA'
}

const MOBILE_MONEY_METHODS = {
  wave: { label: 'Wave', number: '0702396063', operator: 'Wave' },
  moov: { label: 'Moov Money', number: '0161136379', operator: 'Moov' },
  mtn: { label: 'MTN Money', number: '0500838940', operator: 'MTN' },
  orange: { label: 'Orange Money', number: '0716557419', operator: 'Orange' },
}

export function getPaymentMethodDetails(method) {
  return MOBILE_MONEY_METHODS[method] || MOBILE_MONEY_METHODS.orange
}

export function generateMobileMoneyLink(method) {
  const details = getPaymentMethodDetails(method)
  return `tel:${details.number}`
}

export function generatePaymentMessage({ orderNumber, total, method }) {
  const details = getPaymentMethodDetails(method)
  return `Commande ${orderNumber || 'N/A'} | ${formatPrice(total)} | Paiement ${details.label} au ${details.number}`
}

// Alternative: PayDunya (West African payment processor)
export function generatePaydunyaLink({ total, orderNumber }) {
  const apiKey = import.meta.env.VITE_PAYDUNYA_API_KEY
  if (!apiKey) return null
  
  return `https://paydunya.com/checkout/${apiKey}?invoice_id=${orderNumber}&amount=${total}`
}
