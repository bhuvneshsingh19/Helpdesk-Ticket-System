import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const commentSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapshot of the author's role at the time, so the UI can badge staff replies
    authorRole: { type: String, enum: Object.values(ROLES), required: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true },
);

commentSchema.index({ ticket: 1, createdAt: 1 });

commentSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Comment = mongoose.model('Comment', commentSchema);
