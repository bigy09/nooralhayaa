import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildApiUrl } from '../utils/api'

// La navigation est gérée côté client (SPA) : le serveur ne voit jamais de
// requête par page. On envoie donc un ping léger à chaque changement de route
// pour alimenter le compteur de visites du back office (section 6).
export function usePageViewTracking() {
  const location = useLocation()

  useEffect(() => {
    globalThis
      .fetch(buildApiUrl('/api/analytics/pageview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: location.pathname }),
      })
      .catch(() => {
        // Le tracking ne doit jamais impacter l'expérience utilisateur.
      })
  }, [location.pathname])
}
