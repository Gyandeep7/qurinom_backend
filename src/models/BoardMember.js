import mongoose from 'mongoose';

export const BOARD_ROLES = { ADMIN: 'admin', EDITOR: 'editor', VIEWER: 'viewer' };

const boardMemberSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: Object.values(BOARD_ROLES), required: true }
  },
  { timestamps: true }
);

boardMemberSchema.index({ board: 1, user: 1 }, { unique: true });

export const BoardMember = mongoose.models.BoardMember || mongoose.model('BoardMember', boardMemberSchema);


