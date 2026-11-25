export const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin' });

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TICKET_CATEGORIES = ['technical', 'billing', 'account', 'feature_request', 'general'];

export const PRIORITY_RANK = { low: 1, medium: 2, high: 3, urgent: 4 };

// Domain events published by controllers and consumed by event handlers.
export const EVENTS = Object.freeze({
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_DELETED: 'ticket.deleted',
  STATUS_CHANGED: 'ticket.status_changed',
  COMMENT_ADDED: 'ticket.comment_added',
  TICKET_RESOLVED: 'ticket.resolved',
});
