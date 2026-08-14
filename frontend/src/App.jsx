import React from 'react' // eslint-disable-line no-unused-vars
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { ProtectedUserRoute } from './components/ProtectedUserRoute'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import AccountPage from './pages/AccountPage'
import WishlistPage from './pages/WishlistPage'
import FemmePage from './pages/FemmePage'
import HommePage from './pages/HommePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import { usePageViewTracking } from './hooks/usePageViewTracking'

function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  usePageViewTracking()

  return (
    <div className="min-h-screen bg-[#F9EAE1] flex flex-col">
      {!isAdminRoute && <Navbar />}
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/checkout"
          element={
            <ProtectedUserRoute>
              <CheckoutPage />
            </ProtectedUserRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedUserRoute>
              <OrdersPage />
            </ProtectedUserRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedUserRoute>
              <AccountPage />
            </ProtectedUserRoute>
          }
        />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/femme" element={<FemmePage />} />
        <Route path="/homme" element={<HommePage />} />
        {/* Accessories are a category now; no standalone page */}
      </Routes>
      {!isAdminRoute && <Footer />}
    </div>
  )
}

export default App
