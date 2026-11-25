import { ActivityLog } from '../models/ActivityLog.js';

/** Latest activity across all tickets (admin dashboard feed). */
export async function recentActivity(req, res) {
  const { limit } = req.valid.query;
  const logs = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'name role')
    .populate('ticket', 'title status');
  res.json({ success: true, data: logs });
}
