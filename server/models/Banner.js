import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    image: {
      type: String,
      required: true,
    },
    cta: {
      text: String,
      link: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Banner = mongoose.model('Banner', bannerSchema);
