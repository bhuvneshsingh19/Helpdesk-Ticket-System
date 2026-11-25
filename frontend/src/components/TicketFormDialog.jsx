import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ticketApi } from '@/lib/api';
import { CATEGORIES, PRIORITIES } from '@/lib/constants';
import { errorMessage } from '@/lib/utils';

const EMPTY = { title: '', description: '', category: 'general', priority: 'medium' };

/** Create (no `ticket`) or edit (with `ticket`) a support ticket. */
export function TicketFormDialog({ open, onOpenChange, ticket, onSaved }) {
  const editing = Boolean(ticket);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        ticket
          ? { title: ticket.title, description: ticket.description, category: ticket.category, priority: ticket.priority }
          : EMPTY,
      );
    }
  }, [open, ticket]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = editing ? await ticketApi.update(ticket._id, form) : await ticketApi.create(form);
      toast.success(editing ? 'Ticket updated' : 'Ticket submitted');
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit ticket' : 'Create a support ticket'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Tickets can be edited while they are still open.' : 'Tell us what is going on and we will get back to you.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required minLength={3} maxLength={140} placeholder="Short summary of the issue" value={form.title} onChange={(e) => set('title')(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" required minLength={10} maxLength={5000} placeholder="What happened? What did you expect? Any steps to reproduce?" value={form.description} onChange={(e) => set('description')(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={set('priority')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([value, p]) => (
                    <SelectItem key={value} value={value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Submit ticket'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
