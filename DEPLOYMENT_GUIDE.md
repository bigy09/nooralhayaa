# Noor Al Hayaa - Production Deployment Guide

## ✅ Phase 1: Database Migration Complete

You now have:
- ✅ Mongoose schemas for all entities (Product, Category, Banner, Cart, Wishlist, Order)
- ✅ MongoDB-ready server with async/await patterns
- ✅ Environment variables configured (.env file)
- ✅ Seeding endpoint for initial data (`POST /api/seed`)

---

## 📊 Step 1: Set Up MongoDB Atlas (Free Tier)

### Create Free Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with your email
3. Create a free cluster (M0 tier - 512MB storage, perfect for MVP)

### Get Connection String
1. **Create Project**: Click "New Project" → name it "noor-al-hayaa"
2. **Create Cluster**: Choose AWS region closest to your users (e.g., Frankfurt, Dublin, or N. Virginia)
3. **Security**: 
   - Create database user:
     - Username: `admin`
     - Password: Generate strong password (save this!)
     - Built-in roles: `Atlas admin`
   - Click "Add IP Address" → "Allow Access from Anywhere" (or add your IP)
4. **Get Connection String**:
   - Cluster → Connect → "Drivers"
   - Copy connection string → looks like:
   ```
   mongodb+srv://admin:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password
   - Update database name to: `noor-al-hayaa`

### Update `.env` File
```env
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster0.mongodb.net/noor-al-hayaa?retryWrites=true&w=majority
PORT=5000
NODE_ENV=production

# Wave Payment (see Step 2)
WAVE_API_KEY=your_wave_api_key_here
WAVE_BUSINESS_ID=your_wave_business_id_here

# Email (optional, for Step 4)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here

FRONTEND_URL=https://yourdomain.com
```

### Seed Database
Once MongoDB is connected:

```bash
# Start server with npm run dev
# Then in your browser/Postman, call:
POST http://localhost:5000/api/seed
```

This will populate all 12 products, 3 categories, and 3 banners.

---

## 💳 Step 2: Real Payment Gateway - Wave Integration

### Why Wave?
- Popular in Senegal/West Africa
- Simple API
- No upfront fees (2-3% per transaction)
- Supports mobile money, bank transfers, cards

### Set Up Wave Account
1. Go to [Wave.com](https://wave.com/) (business payment)
2. Sign up with your business details
3. Verify your account (bank transfer or ID)
4. Dashboard → Developers → API Keys
5. Generate API key → save in `.env`

### Wave API Implementation

#### Current Setup (Deep Links - No Backend)
- WhatsApp payment link goes to your WhatsApp
- Wave payment link opens Wave app with amount

#### Advanced Setup (Coming Soon)
- Accept payments directly in app
- Auto-confirm orders
- Send payment notifications to admin WhatsApp

### Minimal Integration Now
Update [client/src/utils/payment.js](../client/src/utils/payment.js):

```javascript
export function generateWaveLink(order) {
  const phone = process.env.REACT_APP_MERCHANT_PHONE || '2250702396063'; // Your Wave business phone number
  const amount = order.total;
  const description = `Commande ${order.id}`;
  
  // Deep link to Wave (user opens app and sends manually)
  return `https://app.wave.com/send?destination=${phone}&amount=${amount}`;
}

export function generateWhatsAppLink(order) {
  const phone = process.env.REACT_APP_MERCHANT_PHONE || '2250702396063';
  const message = `Commande: ${order.id}\nMontant: ${order.total} XOF\n\nVeuillez confirmer le paiement par WhatsApp`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
```

---

## 🚀 Step 3: Deployment

### Option A: Render.com (Recommended - Free Tier)

#### Deploy Backend
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. **New Web Service** → Connect your repo
4. **Configure**:
   - Name: `noor-al-hayaa-api`
   - Environment: Node
   - Build: `npm install`
   - Start: `npm start`
   - Instance: Free (0.5 CPU, 512MB RAM)
5. **Environment Variables**: Add all from `.env`
6. Deploy → Get URL (e.g., `https://noor-al-hayaa-api.onrender.com`)

#### Deploy Frontend
1. **New Static Site** → Connect your repo
2. **Configure**:
   - Name: `noor-al-hayaa`
   - Build command: `npm run build --prefix client`
   - Publish directory: `client/dist`
3. **Environment**:
   ```env
   VITE_API_URL=https://noor-al-hayaa-api.onrender.com
   ```
4. Deploy → Get URL (e.g., `https://noor-al-hayaa.onrender.com`)

#### Update Frontend `.env.production`
```env
VITE_API_URL=https://noor-al-hayaa-api.onrender.com
VITE_MERCHANT_PHONE=2250702396063
```

---

### Option B: Vercel + Render (Alternative)

**Frontend** → Vercel (faster, free, unlimited)
**Backend** → Render (simpler Express setup)

---

## 📧 Step 4: Email Notifications (Optional but Recommended)

### Order Confirmation Email

Install dependency:
```bash
npm install nodemailer
```

Create [server/services/emailService.js](../server/services/emailService.js):

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Gmail App Password, not your normal password
  },
});

export async function sendOrderConfirmation(order) {
  const htmlContent = `
    <h2>Commande Confirmée - ${order.orderNumber}</h2>
    <p>Bonjour ${order.customer.name},</p>
    <p>Merci pour votre commande!</p>
    <h3>Détails:</h3>
    <ul>
      ${order.items.map(item => `<li>${item.name} × ${item.quantity} = ${item.price * item.quantity} XOF</li>`).join('')}
    </ul>
    <h3>Total: ${order.total} XOF</h3>
    <p>Nous vous contacterons bientôt au ${order.customer.phone}</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `Nouvelle Commande - ${order.orderNumber}`,
    html: htmlContent,
  });
}
```

Update server/index.js POST /api/orders:
```javascript
import { sendOrderConfirmation } from './services/emailService.js';

// After order.save():
try {
  await sendOrderConfirmation(order);
} catch (err) {
  console.warn('Email failed:', err.message);
  // Don't fail the order if email fails
}
```

### Get Gmail App Password
1. Enable 2-Factor Authentication on your Google account
2. Account → Security → App Passwords
3. Select "Mail" → "Windows Computer"
4. Google generates 16-char password → use in `.env`

---

## 👨‍💼 Step 5: Admin Back-office (Coming Next)

Simple admin dashboard to:
- View all orders
- Update order status (pending → confirmed → shipped → delivered)
- View cart/wishlist stats
- Add/edit products
- View revenue

---

## 🔐 Security Checklist

- [ ] Remove `.env` from git (add to `.gitignore`)
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Add CORS whitelist for frontend domain
- [ ] Validate all user inputs on backend
- [ ] Hash sensitive data (future: user passwords)
- [ ] Set `NODE_ENV=production` on hosting
- [ ] Enable MongoDB encryption (Atlas free tier has basic encryption)
- [ ] Rotate API keys regularly

---

## 📊 Monitoring

### Render Dashboard
- See error logs in real-time
- Monitor CPU/memory usage
- Auto-restart on crashes

### Simple Health Check
```bash
curl https://noor-al-hayaa-api.onrender.com/api/health
# Response: { "status": "ok", "database": "connected" }
```

---

## 🆘 Troubleshooting

### MongoDB Connection Timeout
- Check IP whitelist in MongoDB Atlas
- Verify connection string (password special chars need URL encoding)
- Restart Render service

### Frontend API 404
- Verify `VITE_API_URL` in production environment
- Check CORS settings in server
- Inspect browser console Network tab

### Email Not Sending
- Use 16-character App Password from Google, not your normal password
- Enable "Less secure app access" (or use Gmail App Password)
- Check spam folder

---

## ✨ Next Steps

1. **Today**: Set up MongoDB Atlas + deploy to Render
2. **Tomorrow**: Wire up Wave payments + email notifications
3. **Next**: Build admin dashboard for order management
4. **Future**: Add user authentication, order history persistence, inventory management

---

**Status**: Production-ready (MVP level) ✅
**Timeline**: 2-3 hours for full production setup
