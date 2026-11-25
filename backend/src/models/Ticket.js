import mongoose from 'mongoose';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  PRIORITY_RANK,
} from '../config/constants.js';

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'general' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    // Numeric mirror of priority so "sort by priority" is correct (low < urgent)
    priorityRank: { type: Number, default: PRIORITY_RANK.medium },
    status: { type: String, enum: TICKET_STATUSES, default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commentCount: { type: Number, default: 0 },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ticketSchema.pre('validate', function setPriorityRank() {
  if (this.isModified('priority') || this.isNew) {
    this.priorityRank = PRIORITY_RANK[this.priority];
  }
});

// Common query paths: "my tickets", admin filters, newest first
ticketSchema.index({ createdBy: 1, createdAt: -1 });
ticketSchema.index({ status: 1, priorityRank: -1, createdAt: -1 });
ticketSchema.index({ category: 1 });

ticketSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Ticket = mongoose.model('Ticket', ticketSchema);
