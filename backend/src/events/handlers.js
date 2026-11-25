import { EVENTS, ROLES } from '../config/constants.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

/**
 * Event payload contract:
 *   { type, at, ticket: { id, title, owner }, actor: { id, name, role }, meta? }
 */

// ---- Action 1: activity log -------------------------------------------------
export async function logActivity(event) {
  // A deleted ticket has no timeline to attach to (its history is removed with it).
  if (event.type === EVENTS.TICKET_DELETED) return;
  await ActivityLog.create({
    ticket: event.ticket.id,
    actor: event.actor.id,
    actorRole: event.actor.role,
    type: event.type,
    meta: event.meta || {},
  });
}

// ---- Action 2: in-app notifications -----------------------------------------
async function adminIds(excludeId) {
  const admins = await User.find({ role: ROLES.ADMIN, _id: { $ne: excludeId } }).select('_id').lean();
  return admins.map((a) => a._id);
}

const MESSAGES = {
  [EVENTS.TICKET_CREATED]: (e) => `${e.actor.name} opened "${e.ticket.title}"`,
  [EVENTS.TICKET_UPDATED]: (e) => `${e.actor.name} updated "${e.ticket.title}"`,
  [EVENTS.STATUS_CHANGED]: (e) =>
    `Status of "${e.ticket.title}" changed to ${String(e.meta?.to).replace('_', ' ')}`,
  [EVENTS.COMMENT_ADDED]: (e) => `${e.actor.name} commented on "${e.ticket.title}"`,
  [EVENTS.TICKET_RESOLVED]: (e) => `Your ticket "${e.ticket.title}" was marked as resolved`,
};

export async function notify(event) {
  const makeMessage = MESSAGES[event.type];
  if (!makeMessage) return;

  const ownerId = String(event.ticket.owner);
  const actorIsOwner = String(event.actor.id) === ownerId;
  let recipients = [];

  switch (event.type) {
    case EVENTS.TICKET_CREATED:
    case EVENTS.TICKET_UPDATED:
      // Staff need to know about user activity
      recipients = actorIsOwner ? await adminIds(event.actor.id) : [event.ticket.owner];
      break;
    case EVENTS.STATUS_CHANGED:
      // Resolved gets its own, friendlier notification below
      if (event.meta?.to === 'resolved') return;
      recipients = [event.ticket.owner];
      break;
    case EVENTS.TICKET_RESOLVED:
      recipients = [event.ticket.owner];
      break;
    case EVENTS.COMMENT_ADDED:
      recipients = actorIsOwner ? await adminIds(event.actor.id) : [event.ticket.owner];
      break;
    default:
      return;
  }

  // Never notify the person who performed the action
  recipients = recipients.filter((id) => String(id) !== String(event.actor.id));
  if (recipients.length === 0) return;

  const message = makeMessage(event);
  await Notification.insertMany(
    recipients.map((user) => ({ user, ticket: event.ticket.id, type: event.type, message })),
  );
}

// ---- Wiring ---------------------------------------------------------------
let registered = false;

export function registerEventHandlers(bus) {
  if (registered) return;
  registered = true;
  Object.values(EVENTS).forEach((type) => {
    bus.on(type, logActivity);
    bus.on(type, notify);
  });
}
