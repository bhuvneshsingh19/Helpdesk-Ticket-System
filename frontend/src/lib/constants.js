import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, CircleDot, Loader, Lock, Minus } from 'lucide-react';

export const STATUSES = {
  open: { label: 'Open', icon: CircleDot, cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20', bar: 'bg-blue-500' },
  in_progress: { label: 'In progress', icon: Loader, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20', bar: 'bg-amber-500' },
  resolved: { label: 'Resolved', icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20', bar: 'bg-emerald-500' },
  closed: { label: 'Closed', icon: Lock, cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20', bar: 'bg-slate-400' },
};

export const PRIORITIES = {
  low: { label: 'Low', icon: ArrowDown, cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20', bar: 'bg-slate-400' },
  medium: { label: 'Medium', icon: Minus, cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20', bar: 'bg-sky-500' },
  high: { label: 'High', icon: ArrowUp, cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20', bar: 'bg-orange-500' },
  urgent: { label: 'Urgent', icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20', bar: 'bg-red-500' },
};

export const CATEGORIES = {
  technical: 'Technical',
  billing: 'Billing',
  account: 'Account',
  feature_request: 'Feature request',
  general: 'General',
};

export const EVENT_LABELS = {
  'ticket.created': 'created the ticket',
  'ticket.updated': 'updated the ticket',
  'ticket.status_changed': 'changed the status',
  'ticket.comment_added': 'added a comment',
  'ticket.resolved': 'resolved the ticket',
};
