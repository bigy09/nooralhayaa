export const DELIVERY_PRICES = Object.freeze({
  Cocody: 1000,
  Plateau: 1000,
  Riviera: 1500,
  Yopougon: 1500,
  Treichville: 1500,
  Marcory: 1500,
  Koumassi: 1500,
  Anyama: 2000,
  Bingerville: 2000,
  '2 Plateaux': 1500,
  Abobo: 2000,
  Vallons: 1000,
  Adjamé: 1500,
})

function normalizeZone(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
}

export function getDeliveryPrice(zone = '') {
  if (!zone) return 0

  const lookup = normalizeZone(zone)
  const matchedZone = Object.keys(DELIVERY_PRICES).find((entry) => normalizeZone(entry) === lookup)
  return matchedZone ? DELIVERY_PRICES[matchedZone] : 0
}

export function getDeliveryZones() {
  return Object.entries(DELIVERY_PRICES).map(([zone, price]) => ({
    value: zone,
    price,
  }))
}
