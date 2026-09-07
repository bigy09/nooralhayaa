export const SITE_NAME = 'NOOR AL HAYAA'
export const WHATSAPP_NUMBER = '2250161136379'
export const WHATSAPP_DISPLAY = '+225 01 61 13 63 79'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`
export const WHATSAPP_DEFAULT_MESSAGE = 'Bonjour NoorAl Hayaa je peux avoir des informations sur vos articles'

export function buildWhatsAppLink(message = WHATSAPP_DEFAULT_MESSAGE) {
  return message ? `${WHATSAPP_URL}?text=${encodeURIComponent(message)}` : WHATSAPP_URL
}
