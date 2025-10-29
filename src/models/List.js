import mongoose from 'mongoose';

const listSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    position: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const List = mongoose.models.List || mongoose.model('List', listSchema);


