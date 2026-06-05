import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
    },
    inventory: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isOutOfStock: {
      type: Boolean,
      default: false,
      index: true,
    },
    images: [String],
    categorySlug: {
      type: String,
      required: true,
      index: true,
    },
    swatches: [
      {
        name: String,
        color: String,
      },
    ],
    sizes: [String],
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: [
      {
        author: String,
        text: String,
        rating: Number,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
