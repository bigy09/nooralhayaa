import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    preferredLocation: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    refreshSessions: [
      {
        sid: {
          type: String,
          required: true,
        },
        tokenHash: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ['user', 'admin'],
          required: true,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        lastUsedAt: {
          type: Date,
          default: Date.now,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
