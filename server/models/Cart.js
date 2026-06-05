import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  name: String,
  price: Number,
  size: String,
  quantity: {
    type: Number,
    default: 1,
  },
  image: String,
  background: String,
});

const cartSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
    total: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Cart = mongoose.model('Cart', cartSchema);
