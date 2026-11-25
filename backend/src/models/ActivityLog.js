import mongoose from 'mongoose';
import { EVENTS } from '../config/constants.js';

const activityLogSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    type: { type: String, enum: Object.values(EVENTS), required: true },
    // Event-specific details, e.g. { from: 'open', to: 'resolved' }
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });

activityLogSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
