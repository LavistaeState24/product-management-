import mongoose from 'mongoose';
const counterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;