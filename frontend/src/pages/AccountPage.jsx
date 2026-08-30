import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, MapPin, Mail, Package, Shield, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/payment'

const statusLabels = {
  pending: 'En attente',
  confirmed: 'En cours',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

const statusClasses = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-violet-100 text-violet-700 border-violet-200',
  delivered: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

export default function AccountPage() {
  const { authFetch, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', preferredLocation: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      try {
        const [me, myOrders] = await Promise.all([
          authFetch('/api/auth/me'),
          authFetch('/api/orders/mine'),
        ])

        if (!active) return
        setProfile(me)
        setOrders(Array.isArray(myOrders) ? [...myOrders].reverse() : [])
        setProfileForm({
          name: me.name || '',
          preferredLocation: me.preferredLocation || '',
        })
      } catch (error) {
        console.error('Account page load failed', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [authFetch])

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending').length
    const confirmed = orders.filter((order) => order.status === 'confirmed').length
    const shipped = orders.filter((order) => order.status === 'shipped').length
    const delivered = orders.filter((order) => order.status === 'delivered').length
    const cancelled = orders.filter((order) => order.status === 'cancelled').length
    const total = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    return { pending, confirmed, shipped, delivered, cancelled, total }
  }, [orders])

  const recentOrders = orders.slice(0, 3)

  async function handleSaveProfile(event) {
    event.preventDefault()
    setFormError('')

    if (!profileForm.name.trim() || profileForm.name.trim().length < 2) {
      setFormError('Le nom doit contenir au moins 2 caractères.')
      return
    }

    setSaving(true)
    try {
      const updated = await authFetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          preferredLocation: profileForm.preferredLocation.trim(),
        }),
      })

      setProfile(updated)
      updateUser({ name: updated.name, preferredLocation: updated.preferredLocation })
      setEditMode(false)
    } catch (error) {
      setFormError(error.message || 'Impossible de mettre à jour le profil.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[1.5rem] bg-white animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#8C6239]/70 hover:text-[#C5A059] transition-colors mb-8">
          <ArrowLeft size={15} /> Retour à l'accueil
        </Link>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-[1.9rem] border border-[#C5A059]/15 bg-white p-6 shadow-[0_18px_45px_rgba(140,98,57,0.12)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Mon compte</p>
                  <h1 className="mt-3 text-3xl font-semibold text-[#8C6239]">Bonjour {profile.name || 'cher client'}</h1>
                  <p className="mt-2 text-sm text-[#8C6239]/65">Retrouve ici toutes tes informations, commandes, et préférences.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditMode((current) => !current)}
                  className="rounded-full border border-[#C5A059] bg-[#8C6239] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C5A059]"
                >
                  {editMode ? 'Annuler' : 'Modifier mon profil'}
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Nom</p>
                  <p className="mt-2 text-sm font-semibold text-[#8C6239]">{profile.name || 'Non renseigné'}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Email</p>
                  <p className="mt-2 text-sm font-semibold text-[#8C6239]">{profile.email}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Localisation préférée</p>
                  <p className="mt-2 text-sm font-semibold text-[#8C6239]">{profile.preferredLocation || 'Aucune localisation définie'}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Membre depuis</p>
                  <p className="mt-2 text-sm font-semibold text-[#8C6239]">{new Date(profile.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {editMode && (
                <form onSubmit={handleSaveProfile} className="mt-6 space-y-4 rounded-3xl border border-[#C5A059]/15 bg-[#fdf6ed] p-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#8C6239]">Nom</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-[#C5A059]/20 bg-white px-4 py-3 text-sm text-[#8C6239] outline-none focus:border-[#8C6239]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#8C6239]">Localisation préférée</label>
                    <input
                      type="text"
                      value={profileForm.preferredLocation}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, preferredLocation: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-[#C5A059]/20 bg-white px-4 py-3 text-sm text-[#8C6239] outline-none focus:border-[#8C6239]"
                    />
                  </div>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-[#8C6239] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C5A059] disabled:opacity-60"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-[1.9rem] border border-[#C5A059]/15 bg-white p-6 shadow-[0_18px_45px_rgba(140,98,57,0.12)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Commandes</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#8C6239]">Mes commandes</h2>
                </div>
                <Link
                  to="/orders"
                  className="rounded-full border border-[#C5A059] bg-[#8C6239] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C5A059]"
                >
                  Voir tout
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">En cours</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8C6239]">{stats.pending + stats.confirmed + stats.shipped}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Livrées</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8C6239]">{stats.delivered}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Annulées</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8C6239]">{stats.cancelled}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Total dépensé</p>
                  <p className="mt-2 text-2xl font-semibold text-[#C5A059]">{formatPrice(stats.total)}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Commandes</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8C6239]">{orders.length}</p>
                </div>
                <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Localisation</p>
                  <p className="mt-2 text-sm font-semibold text-[#8C6239]">{profile.preferredLocation || 'Pas de localisation définie'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-[#C5A059]/15 bg-white p-6 shadow-[0_18px_45px_rgba(140,98,57,0.12)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Commandes récentes</p>
              <div className="mt-5 space-y-4">
                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#C5A059]/35 bg-[#fffaf5] p-5 text-sm text-[#8C6239]/75">
                    Aucune commande récente. Passe ta première commande pour voir l'historique ici.
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order._id || order.id} className="rounded-3xl border border-[#C5A059]/15 bg-[#fdf6ed] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#8C6239]">Commande {order.orderNumber || `#${order.id}`}</p>
                          <p className="mt-1 text-xs text-[#8C6239]/55">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[order.status] || statusClasses.pending}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8C6239]/75">
                        <p>{order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}</p>
                        <p className="font-semibold text-[#8C6239]">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[1.9rem] border border-[#C5A059]/15 bg-white p-6 shadow-[0_18px_45px_rgba(140,98,57,0.12)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Informations</p>
              <div className="mt-5 space-y-4 text-sm text-[#8C6239]">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-[#C5A059]" />
                  <span>{profile.name || 'Nom non défini'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-[#C5A059]" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-[#C5A059]" />
                  <span>{profile.preferredLocation || 'Localisation non définie'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-[#C5A059]" />
                  <span>Mon compte protégé</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-[#C5A059]/15 bg-white p-6 shadow-[0_18px_45px_rgba(140,98,57,0.12)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Actions rapides</p>
              <div className="mt-5 space-y-3">
                <Link to="/checkout" className="block rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] px-4 py-3 text-sm font-semibold text-[#8C6239] hover:border-[#C5A059] transition-colors">
                  Finaliser une commande
                </Link>
                <Link to="/wishlist" className="block rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] px-4 py-3 text-sm font-semibold text-[#8C6239] hover:border-[#C5A059] transition-colors">
                  Voir mes favoris
                </Link>
                <Link to="/orders" className="block rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] px-4 py-3 text-sm font-semibold text-[#8C6239] hover:border-[#C5A059] transition-colors">
                  Voir l'historique complet
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
