import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as tickets from '../controllers/ticketController.js';
import * as comments from '../controllers/commentController.js';
import * as admin from '../controllers/adminController.js';
import * as stats from '../controllers/statsController.js';
import * as notifications from '../controllers/notificationController.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));

// ---- Auth (rate limited: brute-force protection) ----------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many attempts, please try again later' },
});
router.post('/auth/register', authLimiter, validate({ body: S.registerBody }), auth.register);
router.post('/auth/login', authLimiter, validate({ body: S.loginBody }), auth.login);
router.get('/auth/me', authenticate, auth.me);

// Everything below requires a valid JWT
router.use(authenticate);

// ---- Tickets ----------------------------------------------------------------
router.get('/tickets', validate({ query: S.listTicketsQuery }), tickets.listTickets);
router.post('/tickets', validate({ body: S.createTicketBody }), tickets.createTicket);
router.get('/tickets/:id', validate({ params: S.idParam }), tickets.getTicket);
router.patch(
  '/tickets/:id',
  validate({ params: S.idParam, body: S.updateTicketBody }),
  tickets.updateTicket,
);
router.delete('/tickets/:id', validate({ params: S.idParam }), tickets.deleteTicket);

// ---- Comments & activity ----------------------------------------------------
router.get('/tickets/:id/comments', validate({ params: S.idParam }), comments.listComments);
router.post(
  '/tickets/:id/comments',
  validate({ params: S.idParam, body: S.commentBody }),
  comments.addComment,
);
router.get('/tickets/:id/activity', validate({ params: S.idParam }), comments.listActivity);

// ---- Stats & notifications --------------------------------------------------
router.get('/stats', stats.getStats);
router.get(
  '/notifications',
  validate({ query: S.paginationQuery }),
  notifications.listNotifications,
);
router.post('/notifications/read-all', notifications.markAllRead);
router.patch('/notifications/:id/read', validate({ params: S.idParam }), notifications.markRead);

// ---- Admin only -------------------------------------------------------------
router.patch(
  '/admin/tickets/:id',
  authorize(ROLES.ADMIN),
  validate({ params: S.idParam, body: S.adminUpdateTicketBody }),
  tickets.adminUpdateTicket,
);
router.get(
  '/admin/activity',
  authorize(ROLES.ADMIN),
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }) }),
  admin.recentActivity,
);

export default router;
