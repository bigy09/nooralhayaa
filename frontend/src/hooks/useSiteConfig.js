import { useEffect, useState } from 'react'
import { buildApiUrl } from '../utils/api'
import { WHATSAPP_NUMBER, WHATSAPP_DISPLAY } from '../config/site'

export function useSiteConfig() {
  const [config, setConfig] = useState({ whatsapp: WHATSAPP_NUMBER, infoline: WHATSAPP_DISPLAY, paymentNumbers: {}, minimumPayment: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadConfig() {
      try {
        const response = await fetch(buildApiUrl('/api/config/contacts'))
        const payload = await response.json()
        if (!active) return
        if (response.ok) {
          setConfig({
            whatsapp: WHATSAPP_NUMBER,
            infoline: WHATSAPP_DISPLAY,
            paymentNumbers: payload.paymentNumbers || {},
            minimumPayment: payload.minimumPayment || 0,
          })
        }
      } catch (error) {
        console.debug('Site contact configuration unavailable:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadConfig()
    return () => { active = false }
  }, [])

  return { config, loading }
}
