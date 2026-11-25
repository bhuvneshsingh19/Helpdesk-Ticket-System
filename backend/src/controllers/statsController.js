import { Ticket } from '../models/Ticket.js';
import {
  ROLES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../config/constants.js';

const toMap = (rows, keys) => {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => {
    out[r._id] = r.n;
  });
  return out;
};

/** Ticket statistics. Admins see everything, users see stats for their own tickets. */
export async function getStats(req, res) {
  const scope = req.user.role === ROLES.ADMIN ? {} : { createdBy: req.user._id };

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 6);

  const group = (field) => [{ $group: { _id: `$${field}`, n: { $sum: 1 } } }];

  const [agg] = await Ticket.aggregate([
    { $match: scope },
    {
      $facet: {
        total: [{ $count: 'n' }],
        byStatus: group('status'),
        byPriority: group('priority'),
        byCategory: group('category'),
        daily: [
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              n: { $sum: 1 },
            },
          },
        ],
        resolution: [
          { $match: { resolvedAt: { $ne: null } } },
          { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
        ],
      },
    },
  ]);

  const dailyMap = Object.fromEntries(agg.daily.map((d) => [d._id, d.n]));
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    return { date, count: dailyMap[date] || 0 };
  });

  const byStatus = toMap(agg.byStatus, TICKET_STATUSES);
  res.json({
    success: true,
    data: {
      total: agg.total[0]?.n || 0,
      active: byStatus.open + byStatus.in_progress,
      byStatus,
      byPriority: toMap(agg.byPriority, TICKET_PRIORITIES),
      byCategory: toMap(agg.byCategory, TICKET_CATEGORIES),
      last7Days,
      avgResolutionHours: agg.resolution[0]
        ? Math.round((agg.resolution[0].avgMs / 36e5) * 10) / 10
        : null,
    },
  });
}
