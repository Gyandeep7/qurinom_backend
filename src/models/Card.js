import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true }
  },
  { timestamps: true, _id: true }
);

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    meta: { type: Object }
  },
  { timestamps: true, _id: true }
);

const cardSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date },
    labels: [{ type: String }],
    attachments: [{ name: String, url: String }],
    position: { type: Number, default: 0 },
    comments: [commentSchema],
    activity: [activitySchema]
  },
  { timestamps: true }
);

export const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);


