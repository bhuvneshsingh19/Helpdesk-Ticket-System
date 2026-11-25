import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../config/constants.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = z.object({ id: objectId });

// ---- Auth -------------------------------------------------------------------
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const registerBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password,
  adminCode: z.string().max(100).optional(),
});

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(72),
});

// ---- Tickets ----------------------------------------------------------------
export const createTicketBody = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
  description: z.string().trim().min(10, 'Please describe the issue (10+ characters)').max(5000),
  category: z.enum(TICKET_CATEGORIES).default('general'),
  priority: z.enum(TICKET_PRIORITIES).default('medium'),
});

export const updateTicketBody = z
  .object({
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().min(10).max(5000),
    category: z.enum(TICKET_CATEGORIES),
    priority: z.enum(TICKET_PRIORITIES),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' });

export const adminUpdateTicketBody = z
  .object({
    status: z.enum(TICKET_STATUSES),
    priority: z.enum(TICKET_PRIORITIES),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'Provide status and/or priority' });

export const listTicketsQuery = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'priority', 'updated']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ---- Comments / notifications -----------------------------------------------
export const commentBody = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
