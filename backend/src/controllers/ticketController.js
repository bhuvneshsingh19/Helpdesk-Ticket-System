import { Ticket } from '../models/Ticket.js';
import { Comment } from '../models/Comment.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Notification } from '../models/Notification.js';
import { eventBus } from '../events/eventBus.js';
import { EVENTS, ROLES } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';

const isAdmin = (user) => user.role === ROLES.ADMIN;
const actorOf = (u) => ({ id: u._id, name: u.name, role: u.role });
const refOf = (t) => ({ id: t._id, title: t.title, owner: t.createdBy });

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated: { updatedAt: -1 },
  priority: { priorityRank: -1, createdAt: -1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Loads a ticket the caller may see. Non-owners get a 404 (not 403) so ticket
 * ids can't be probed for existence.
 */
export async function loadAccessibleTicket(id, user) {
  const ticket = await Ticket.findById(id);
  if (!ticket || (!isAdmin(user) && String(ticket.createdBy) !== String(user._id))) {
    throw ApiError.notFound('Ticket not found');
  }
  return ticket;
}

const populateOwner = (q) => q.populate('createdBy', 'name email');

export async function createTicket(req, res) {
  const ticket = await Ticket.create({ ...req.valid.body, createdBy: req.user._id });
  await eventBus.publish(EVENTS.TICKET_CREATED, {
    ticket: refOf(ticket),
    actor: actorOf(req.user),
    meta: { priority: ticket.priority, category: ticket.category },
  });
  await ticket.populate('createdBy', 'name email');
  res.status(201).json({ success: true, data: ticket });
}

export async function listTickets(req, res) {
  const { status, priority, category, search, sort, page, limit } = req.valid.query;

  const filter = {};
  if (!isAdmin(req.user)) filter.createdBy = req.user._id; // users only ever see their own
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const [tickets, total] = await Promise.all([
    populateOwner(Ticket.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit)),
    Ticket.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: tickets,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getTicket(req, res) {
  const ticket = await loadAccessibleTicket(req.valid.params.id, req.user);
  await ticket.populate('createdBy', 'name email');
  res.json({ success: true, data: ticket });
}

/** Owner edits their own ticket - only while it is still open (nobody is working on it yet). */
export async function updateTicket(req, res) {
  const ticket = await loadAccessibleTicket(req.valid.params.id, req.user);
  if (String(ticket.createdBy) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the ticket owner can edit its details');
  }
  if (ticket.status !== 'open') {
    throw ApiError.conflict('Tickets can only be edited while their status is "open"');
  }

  const changes = {};
  for (const [key, value] of Object.entries(req.valid.body)) {
    if (ticket[key] !== value) {
      changes[key] = key === 'description' ? { changed: true } : { from: ticket[key], to: value };
      ticket[key] = value;
    }
  }

  if (Object.keys(changes).length > 0) {
    await ticket.save();
    await eventBus.publish(EVENTS.TICKET_UPDATED, {
      ticket: refOf(ticket),
      actor: actorOf(req.user),
      meta: { changes },
    });
  }
  await ticket.populate('createdBy', 'name email');
  res.json({ success: true, data: ticket });
}

/** Owner can delete while open; admins can delete any ticket. Cascades to related records. */
export async function deleteTicket(req, res) {
  const ticket = await loadAccessibleTicket(req.valid.params.id, req.user);
  if (!isAdmin(req.user) && ticket.status !== 'open') {
    throw ApiError.conflict('Tickets can only be deleted while their status is "open"');
  }

  await Promise.all([
    Comment.deleteMany({ ticket: ticket._id }),
    ActivityLog.deleteMany({ ticket: ticket._id }),
    Notification.deleteMany({ ticket: ticket._id }),
  ]);
  await ticket.deleteOne();

  await eventBus.publish(EVENTS.TICKET_DELETED, {
    ticket: refOf(ticket),
    actor: actorOf(req.user),
  });
  res.json({ success: true, message: 'Ticket deleted' });
}

/** Admin-only: change status and/or priority of any ticket. */
export async function adminUpdateTicket(req, res) {
  const ticket = await Ticket.findById(req.valid.params.id);
  if (!ticket) throw ApiError.notFound('Ticket not found');

  const { status, priority } = req.valid.body;
  const actor = actorOf(req.user);
  const events = [];

  if (priority && priority !== ticket.priority) {
    events.push([
      EVENTS.TICKET_UPDATED,
      { changes: { priority: { from: ticket.priority, to: priority } } },
    ]);
    ticket.priority = priority;
  }

  if (status && status !== ticket.status) {
    const from = ticket.status;
    ticket.status = status;
    ticket.resolvedAt = status === 'resolved' ? new Date() : null;
    events.push([EVENTS.STATUS_CHANGED, { from, to: status }]);
    if (status === 'resolved') events.push([EVENTS.TICKET_RESOLVED, { from }]);
  }

  if (events.length > 0) {
    await ticket.save();
    for (const [type, meta] of events) {
      await eventBus.publish(type, { ticket: refOf(ticket), actor, meta });
    }
  }

  await ticket.populate('createdBy', 'name email');
  res.json({ success: true, data: ticket });
}
