export function formatPrice(amount) {
  return amount.toLocaleString('fr-FR') + ' F CFA'
}

const MOBILE_MONEY_METHODS = {
  wave: {
    label: 'Wave',
    number: '0500838940',
    operator: 'Wave',
    paymentUrl: (amount = 2020) => `https://pay.wave.com/m/M_ci_R1v1vrKv7--r/c/ci/?amount=${Math.max(1, Math.round(Number(amount) || 2020))}`,
  },
  moov: {
    label: 'Moov Money',
    number: '0161136379',
    operator: 'Moov',
    paymentUrl: (amount = 2020) => `https://wa.me/225${String('0161136379').replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite payer ma commande via Moov Money de ${formatPrice(amount)}.`)}`,
  },
  mtn: {
    label: 'MTN Money',
    number: '0500838940',
    operator: 'MTN',
    paymentUrl: (amount = 2020) => `https://wa.me/225${String('0500838940').replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite payer ma commande via MTN Money de ${formatPrice(amount)}.`)}`,
  },
  orange: {
    label: 'Orange Money',
    number: '0716557419',
    operator: 'Orange',
    paymentUrl: (amount = 2020) => `https://multi.app.orange-money.com/app/v1/kapptivate/qrcode/odyssee/?id=codgen101-fc3eb5d542c847bd9a84cb84c3d45da4&v=1&amount=${Math.max(1, Math.round(Number(amount) || 2020))}`,
  },
}

export function getPaymentMethodDetails(method, overrides = {}) {
  const methodInfo = MOBILE_MONEY_METHODS[method] || MOBILE_MONEY_METHODS.orange
  const number = String(overrides.number || methodInfo.number || '').replace(/\D/g, '')
  const amount = Number(overrides.amount ?? 2020) || 2020
  const whatsappNumber = number.startsWith('225') ? number : `225${number}`

  return {
    ...methodInfo,
    ...overrides,
    number: number || methodInfo.number,
    callLink: number ? `tel:${number}` : methodInfo.number ? `tel:${methodInfo.number}` : null,
    transferLink: methodInfo.paymentUrl ? methodInfo.paymentUrl(amount) : `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour, je souhaite payer ma commande via ${methodInfo.label}.`)}`,
  }
}

export function generateMobileMoneyLink(method, number, amount = 2020) {
  const details = number ? getPaymentMethodDetails(method, { number, amount }) : getPaymentMethodDetails(method, { amount })
  return details.paymentUrl ? details.paymentUrl(amount) : details.transferLink || null
}
