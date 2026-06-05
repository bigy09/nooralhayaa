import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, Clock3, MessageCircle, Shield, Smartphone, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice, generateMobileMoneyLink, getPaymentMethodDetails } from '../utils/payment'

const PAYMENT_METHODS = [
  {
    id: 'wave',
    label: 'Wave',
    sublabel: 'Paiement via Wave',
    icon: Smartphone,
    color: 'text-[#00D38A]',
    activeStyle: 'border-[#b8f6de] bg-[#ebfff7]',
    description: 'Paiement sur le numero 0702396063.',
  },
  {
    id: 'orange',
    label: 'Orange Money',
    sublabel: 'Paiement via Orange Money',
    icon: Smartphone,
    color: 'text-[#f67f20]',
    activeStyle: 'border-[#ffd9ba] bg-[#fff5ec]',
    description: 'Paiement sur le numero 0716557419.',
  },
  {
    id: 'moov',
    label: 'Moov Money',
    sublabel: 'Paiement via Moov Money',
    icon: MessageCircle,
    color: 'text-[#0086ff]',
    activeStyle: 'border-[#bedeff] bg-[#f0f8ff]',
    description: 'Paiement sur le numero 0161136379.',
  },
  {
    id: 'mtn',
    label: 'MTN Money',
    sublabel: 'Paiement via MTN Money',
    icon: Smartphone,
    color: 'text-[#f7c300]',
    activeStyle: 'border-[#ffe48a] bg-[#fffceb]',
    description: 'Paiement sur le numero 0500838940.',
  },
]

function TrustStrip() {
  const items = [
    { icon: Shield, title: 'Paiement protege', text: 'Flux securise et verification commande.' },
    { icon: Truck, title: 'Livraison suivie', text: 'Notification de suivi apres validation.' },
    { icon: Clock3, title: 'Support reactif', text: 'Assistance rapide pour les paiements mobile money.' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-2xl border border-[#C5A059]/15 bg-white px-4 py-3 shadow-[0_10px_25px_rgba(140,98,57,0.08)]">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#8C6239]">
            <item.icon size={14} className="text-[#C5A059]" />
            {item.title}
          </p>
          <p className="mt-1 text-xs text-[#8C6239]/65">{item.text}</p>
        </div>
      ))}
    </div>
  )
}

export default function CheckoutPage() {
  const { items, total, clear } = useCart()
  const { authFetch } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [method, setMethod] = useState('orange')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [errors, setErrors] = useState({})

  if (items.length === 0 && !order) {
    return (
      <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_12px_35px_rgba(140,98,57,0.12)]">
            <Truck size={38} className="text-[#C5A059]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#8C6239]">Aucune commande a finaliser</h1>
          <p className="mt-3 text-sm text-[#8C6239]/65">Ton panier est vide pour le moment.</p>
          <Link to="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8C6239] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#C5A059]">
            <ArrowLeft size={16} /> Retour a la boutique
          </Link>
        </div>
      </div>
    )
  }

  function validate() {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Nom requis'
    if (!form.phone.trim()) nextErrors.phone = 'Numero requis'
    else if (!/^\+?[0-9]{8,15}$/.test(form.phone.replace(/\s/g, ''))) nextErrors.phone = 'Numero invalide'
    return nextErrors
  }

  async function submitOrder() {
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      const normalizedItems = items.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        size: item.selectedSize,
        quantity: item.qty,
        image: item.image,
        background: item.background,
      }))

      const data = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: normalizedItems,
          customer: form,
          paymentMethod: method,
          total,
          subtotal: items.reduce((sum, item) => sum + (item.price * item.qty), 0),
          shipping: 0,
        }),
      })
      setOrder(data)

      const paymentLink = generateMobileMoneyLink(method)
      if (paymentLink) window.open(paymentLink, '_blank')

      clear()
      setStep(3)
    } catch (error) {
      console.error('Order submission error:', error)
      alert('Une erreur est survenue. Merci de reessayer.')
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Informations', 'Paiement', 'Confirmation']

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-[#8C6239]/70 hover:text-[#C5A059] transition-colors mb-8">
          <ArrowLeft size={15} /> Retour au panier
        </Link>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold mb-2">Finalisation</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#8C6239]">Commander en toute confiance</h1>
        </div>

        <div className="mb-6">
          <TrustStrip />
        </div>

        <div className="mb-8 flex items-center gap-2">
          {steps.map((label, index) => {
            const current = index + 1
            const done = current < step
            const active = current === step
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${done ? 'bg-[#8C6239] text-white' : active ? 'bg-[#F4DFD1] text-[#8C6239] ring-2 ring-[#C5A059]/30' : 'bg-white text-[#8C6239]/45 border border-[#C5A059]/20'}`}>
                  {done ? <Check size={13} /> : current}
                </div>
                <span className={`hidden sm:inline text-xs font-medium ${active ? 'text-[#8C6239]' : 'text-[#8C6239]/45'}`}>{label}</span>
                {index < steps.length - 1 && <div className={`h-0.5 w-8 rounded ${done ? 'bg-[#C5A059]' : 'bg-[#e8d3c2]'}`} />}
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.section key="info" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="rounded-[1.85rem] border border-[#C5A059]/18 bg-white p-7 shadow-[0_20px_45px_rgba(140,98,57,0.10)]">
                <h2 className="text-lg font-semibold text-[#8C6239] mb-5">Informations de livraison</h2>
                <div className="space-y-4">
                  {[
                    { key: 'name', label: 'Nom complet *', placeholder: 'Ton nom complet', type: 'text' },
                    { key: 'phone', label: 'Numero de telephone *', placeholder: '+225 0X XX XX XX XX', type: 'tel' },
                    { key: 'address', label: 'Adresse de livraison', placeholder: 'Rue, quartier, ville', type: 'text' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-xs font-semibold text-[#8C6239]">{field.label}</label>
                      <input
                        type={field.type}
                        value={form[field.key]}
                        onChange={(event) => {
                          setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          setErrors((prev) => ({ ...prev, [field.key]: '' }))
                        }}
                        placeholder={field.placeholder}
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${errors[field.key] ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-[#C5A059]/25 bg-[#fffdfa] text-[#8C6239] focus:border-[#C5A059]'}`}
                      />
                      {errors[field.key] && <p className="mt-1 text-xs text-red-500">{errors[field.key]}</p>}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const nextErrors = validate()
                    if (Object.keys(nextErrors).length) {
                      setErrors(nextErrors)
                      return
                    }
                    setStep(2)
                  }}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8C6239] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#C5A059]"
                >
                  Continuer vers paiement <ChevronRight size={16} />
                </button>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section key="payment" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="rounded-[1.85rem] border border-[#C5A059]/18 bg-white p-7 shadow-[0_20px_45px_rgba(140,98,57,0.10)]">
                <h2 className="text-lg font-semibold text-[#8C6239] mb-5">Choix du paiement</h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((payment) => {
                    const active = payment.id === method
                    return (
                      <button
                        key={payment.id}
                        onClick={() => setMethod(payment.id)}
                        className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${active ? payment.activeStyle : 'border-[#ead7c7] bg-white hover:border-[#dcb99f]'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#8C6239] inline-flex items-center gap-2">
                              <payment.icon size={15} className={payment.color} /> {payment.label}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8C6239]/65">{payment.sublabel}</p>
                            {active && <p className="mt-2 text-xs text-[#8C6239]/70 leading-relaxed">{payment.description}</p>}
                          </div>
                          <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-[#8C6239] bg-[#8C6239]' : 'border-[#cab39d]'}`}>
                            {active && <Check size={11} className="text-white" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 rounded-full border border-[#C5A059]/25 bg-white px-4 py-3 text-sm font-medium text-[#8C6239] hover:bg-[#F9EAE1] transition-colors">
                    Modifier infos
                  </button>
                  <button
                    onClick={submitOrder}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#8C6239] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#C5A059] disabled:opacity-60"
                  >
                    {loading ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <><Smartphone size={15} /> Finaliser</>}
                  </button>
                </div>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[1.85rem] border border-[#C5A059]/18 bg-white p-8 text-center shadow-[0_20px_45px_rgba(140,98,57,0.10)]">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf6ea]">
                  <Check size={28} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-[#8C6239]">Commande {order?.orderNumber} enregistree</h2>
                <p className="mt-2 text-sm text-[#8C6239]/65">
                  Paiement a effectuer via {getPaymentMethodDetails(method).label} sur le numero {getPaymentMethodDetails(method).number}.
                </p>
                <p className="mt-1 text-xs text-[#8C6239]/45">Reference: {order?.orderNumber}</p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <Link to="/orders" className="rounded-full border border-[#C5A059]/25 bg-white px-4 py-3 text-sm font-medium text-[#8C6239] hover:bg-[#F9EAE1] transition-colors">
                    Voir mes commandes
                  </Link>
                  <button onClick={() => navigate('/shop')} className="rounded-full bg-[#8C6239] px-4 py-3 text-sm font-semibold text-white hover:bg-[#C5A059] transition-colors">
                    Continuer mes achats
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {step < 3 && (
            <aside className="lg:sticky lg:top-28 h-fit rounded-[1.75rem] border border-[#C5A059]/20 bg-white p-6 shadow-[0_18px_50px_rgba(140,98,57,0.10)]">
              <h3 className="text-base font-semibold text-[#8C6239] mb-4">Recapitulatif</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.key} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-[#8C6239]/75">{item.name} · {item.selectedSize} x{item.qty}</span>
                    <span className="font-medium text-[#8C6239]">{formatPrice(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-[#F9EAE1] pt-4 flex items-center justify-between text-sm font-semibold">
                <span className="text-[#8C6239]">Total</span>
                <span className="text-[#C5A059]">{formatPrice(total)}</span>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
