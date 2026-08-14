import { useEffect, useState } from 'react'
import { buildApiUrl } from '../utils/api'

export function useSiteConfig() {
  const [config, setConfig] = useState({ whatsapp: '', infoline: '', paymentNumbers: {}, minimumPayment: 0 })
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
            whatsapp: payload.whatsapp || '',
            infoline: payload.infoline || '',
            paymentNumbers: payload.paymentNumbers || {},
            minimumPayment: payload.minimumPayment || 0,
          })
        }
      } catch (_error) {
      } finally {
        if (active) setLoading(false)
      }
    }

    loadConfig()
    return () => { active = false }
  }, [])

  return { config, loading }
}
