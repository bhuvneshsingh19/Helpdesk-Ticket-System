import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';

export async function listNotifications(req, res) {
  const { limit } = req.valid.query;
  const [items, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, data: items, unreadCount });
}

export async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate(
    { _id: req.valid.params.id, user: req.user._id }, // scoped to owner
    { read: true },
    { new: true },
  );
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, data: n });
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read' });
}
