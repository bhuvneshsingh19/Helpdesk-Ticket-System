import { Comment } from '../models/Comment.js';
import { Ticket } from '../models/Ticket.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { eventBus } from '../events/eventBus.js';
import { EVENTS, ROLES } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { loadAccessibleTicket } from './ticketController.js';

export async function listComments(req, res) {
  const ticket = await loadAccessibleTicket(req.valid.params.id, req.user);
  const comments = await Comment.find({ ticket: ticket._id })
    .sort({ createdAt: 1 })
    .limit(500)
    .populate('author', 'name role');
  res.json({ success: true, data: comments });
}

export async function addComment(req, res) {
  const ticket = await loadAccessibleTicket(req.valid.params.id, req.user);
  if (ticket.status === 'closed' && req.user.role !== ROLES.ADMIN) {
    throw ApiError.conflict('This ticket is closed and no longer accepts comments');
  }

  const comment = await Comment.create({
    ticket: ticket._id,
    author: req.user._id,
    authorRole: req.user.role,
    body: req.valid.body.body,
  });
  await Ticket.updateOne({ _id: ticket._id }, { $inc: { commentCount: 1 } });

  await eventBus.publish(EVENTS.COMMENT_ADDED, {
    ticket: { id: ticket._id, title: ticket.title, owner: ticket.createdBy },
    actor: { id: req.user._id, name: req.user.name, role: req.user.role },
    meta: { commentId: comment._id, preview: comment.body.slice(0, 80) },
  });

  await comment.populate('author', 'name role');
  res.status(201).json({ success: true, data: comment });
}

export async function listActivity(req, res) {
  const ticket = await loadAccessibleTicket(req.valid.params.id, req.user);
  const logs = await ActivityLog.find({ ticket: ticket._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('actor', 'name role');
  res.json({ success: true, data: logs });
}
