import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  name: String,
  price: Number,
  image: String,
  background: String,
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const wishlistSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [wishlistItemSchema],
  },
  { timestamps: true }
);

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
