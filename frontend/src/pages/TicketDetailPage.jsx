import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, History, Lock, Pencil, Send, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTransition } from '@/components/PageTransition';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { TicketFormDialog } from '@/components/TicketFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { ticketApi } from '@/lib/api';
import { CATEGORIES, EVENT_LABELS, PRIORITIES, STATUSES } from '@/lib/constants';
import { cn, errorMessage, formatDate, initials, timeAgo } from '@/lib/utils';

function describeEvent(a) {
  const m = a.meta || {};
  if (a.type === 'ticket.status_changed') return `changed status from ${STATUSES[m.from]?.label} to ${STATUSES[m.to]?.label}`;
  if (a.type === 'ticket.updated' && m.changes) {
    const parts = Object.entries(m.changes).map(([k, v]) =>
      v.to ? `${k} to ${k === 'priority' ? PRIORITIES[v.to]?.label : CATEGORIES[v.to] || v.to}` : k,
    );
    return `updated ${parts.join(', ')}`;
  }
  return EVENT_LABELS[a.type] || a.type;
}

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [t, c, a] = await Promise.all([ticketApi.get(id), ticketApi.comments(id), ticketApi.activity(id)]);
      setTicket(t);
      setComments(c);
      setActivity(a);
    } catch (err) {
      setError(errorMessage(err, 'Could not load ticket'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshActivity = () => ticketApi.activity(id).then(setActivity).catch(() => {});

  async function sendComment(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      const c = await ticketApi.addComment(id, draft.trim());
      setComments((prev) => [...prev, c]);
      setTicket((t) => ({ ...t, commentCount: (t.commentCount || 0) + 1 }));
      setDraft('');
      refreshActivity();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function adminChange(patch) {
    setUpdating(true);
    try {
      const t = await ticketApi.adminUpdate(id, patch);
      setTicket(t);
      toast.success('Ticket updated');
      refreshActivity();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await ticketApi.remove(id);
      toast.success('Ticket deleted');
      navigate('/tickets', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (error) {
    return (
      <PageTransition className="space-y-4">
        <Button asChild variant="ghost"><Link to="/tickets"><ArrowLeft /> Back to tickets</Link></Button>
        <Card className="p-10 text-center">
          <p className="font-semibold">{error}</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or you may not have access to it.</p>
        </Card>
      </PageTransition>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const isOwner = ticket.createdBy?._id === user._id;
  const canEdit = isOwner && ticket.status === 'open';
  const canDelete = (isOwner && ticket.status === 'open') || isAdmin;
  const canComment = isAdmin || ticket.status !== 'closed';

  return (
    <PageTransition className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/tickets"><ArrowLeft /> Back to tickets</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <Badge variant="secondary">{CATEGORIES[ticket.category]}</Badge>
              </div>
              <CardTitle className="text-2xl leading-snug">{ticket.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Opened by <span className="font-medium text-foreground">{ticket.createdBy?.name}</span> · {formatDate(ticket.createdAt)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              {(canEdit || canDelete) && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {canEdit && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button>}
                  {canDelete && <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</Button>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle className="text-base">Conversation ({comments.length})</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {comments.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No comments yet. Start the conversation below.</p>}
              <AnimatePresence initial={false}>
                {comments.map((c) => {
                  const staff = c.authorRole === 'admin';
                  const mine = c.author?._id === user._id;
                  return (
                    <motion.div key={c._id} layout initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn('flex gap-3', mine && 'flex-row-reverse')}>
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1', staff ? 'bg-primary text-primary-foreground ring-primary' : 'bg-secondary text-secondary-foreground ring-border')}>
                        {initials(c.author?.name)}
                      </span>
                      <div className={cn('max-w-[85%] space-y-1', mine && 'items-end text-right')}>
                        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', mine && 'flex-row-reverse')}>
                          <span className="font-medium text-foreground">{c.author?.name}</span>
                          {staff && <Badge className="px-1.5 py-0 text-[10px]"><Shield /> Staff</Badge>}
                          <span>{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className={cn('whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm', mine ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-secondary')}>
                          {c.body}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />

              {canComment ? (
                <form onSubmit={sendComment} className="space-y-2 border-t pt-4">
                  <Label htmlFor="comment" className="sr-only">Add a comment</Label>
                  <Textarea id="comment" maxLength={2000} placeholder={isAdmin ? 'Reply to the user...' : 'Add a comment...'} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[80px]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{draft.length}/2000</span>
                    <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}><Send /> Send</Button>
                  </div>
                </form>
              ) : (
                <p className="flex items-center justify-center gap-2 border-t pt-4 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> This ticket is closed and no longer accepts comments.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {isAdmin && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" /> Manage ticket</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={ticket.status} onValueChange={(status) => adminChange({ status })} disabled={updating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select value={ticket.priority} onValueChange={(priority) => adminChange({ priority })} disabled={updating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ['Requester', ticket.createdBy?.name],
                  ['Email', ticket.createdBy?.email],
                  ['Created', formatDate(ticket.createdAt)],
                  ['Last updated', formatDate(ticket.updatedAt)],
                  ...(ticket.resolvedAt ? [['Resolved', formatDate(ticket.resolvedAt)]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="truncate text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Activity</CardTitle></CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded.</p>
              ) : (
                <ol className="relative space-y-5 border-l pl-5">
                  {activity.map((a) => (
                    <motion.li key={a._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative text-sm">
                      <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                      <p><span className="font-medium">{a.actor?.name}</span> {describeEvent(a)}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                    </motion.li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketFormDialog open={editing} onOpenChange={setEditing} ticket={ticket} onSaved={load} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this ticket?"
        description="This permanently removes the ticket along with its comments and activity. This cannot be undone."
        confirmLabel="Delete ticket"
        loading={deleting}
        onConfirm={remove}
      />
    </PageTransition>
  );
}
