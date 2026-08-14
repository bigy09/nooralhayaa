import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
  },
  name: String,
  price: Number,
  size: String,
  quantity: Number,
  image: String,
  background: String,
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: false,
        index: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    items: [orderItemSchema],
    subtotal: Number,
    shipping: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    // Choix binaire du client : payer la totalité, ou l'acompte fixe (PAYMENT_MINIMUM).
    paymentChoice: {
      type: String,
      enum: ['full', 'deposit'],
      default: 'full',
    },
    paymentMethod: {
      type: String,
      enum: ['wave', 'moov', 'mtn', 'orange'],
      required: true,
    },
    // Reliquat encore dû (acompte uniquement) — suivi côté back office.
    remainingAtDelivery: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    transactionReference: String,
    inventoryReserved: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
