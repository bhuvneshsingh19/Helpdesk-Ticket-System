import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpDown, Inbox, MessageSquare, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { Pagination } from '@/components/Pagination';
import { TicketFormDialog } from '@/components/TicketFormDialog';
import { useAuth } from '@/context/AuthContext';
import { ticketApi } from '@/lib/api';
import { CATEGORIES, PRIORITIES, STATUSES } from '@/lib/constants';
import { errorMessage, timeAgo } from '@/lib/utils';

const ALL = 'all';

export function TicketsPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState({ data: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchText, setSearchText] = useState(params.get('search') || '');

  const filters = {
    status: params.get('status') || ALL,
    priority: params.get('priority') || ALL,
    category: params.get('category') || ALL,
    sort: params.get('sort') || 'newest',
    page: Number(params.get('page')) || 1,
    search: params.get('search') || '',
  };

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (!v || v === ALL || (k === 'sort' && v === 'newest') || (k === 'page' && v === 1)) next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in patch)) next.delete('page'); // any filter change resets paging
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // Debounce the search box
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchText !== filters.search) update({ search: searchText.trim() });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = { sort: filters.sort, page: filters.page, limit: 8 };
      if (filters.status !== ALL) query.status = filters.status;
      if (filters.priority !== ALL) query.priority = filters.priority;
      if (filters.category !== ALL) query.category = filters.category;
      if (filters.search) query.search = filters.search;
      setResult(await ticketApi.list(query));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = filters.status !== ALL || filters.priority !== ALL || filters.category !== ALL || filters.search;

  // Plain render function (not a component) so the Select isn't remounted on every render
  const filterSelect = (name, label, options) => (
    <Select value={filters[name]} onValueChange={(v) => update({ [name]: v })}>
      <SelectTrigger className="w-full sm:w-40" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map(([value, text]) => (
          <SelectItem key={value} value={value}>{text}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isAdmin ? 'All tickets' : 'My tickets'}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Review, prioritise and resolve tickets from every user.' : 'Everything you have raised with support.'}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus /> New ticket
          </Button>
        )}
      </div>

      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title or description..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterSelect('status', 'Status', Object.entries(STATUSES).map(([k, v]) => [k, v.label]))}
          {filterSelect('priority', 'Priority', Object.entries(PRIORITIES).map(([k, v]) => [k, v.label]))}
          {filterSelect('category', 'Category', Object.entries(CATEGORIES))}
          <Select value={filters.sort} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Sort">
              <ArrowUpDown className="h-4 w-4 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="priority">Highest priority</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" onClick={() => { setSearchText(''); setParams({}, { replace: true }); }}>
              <X /> Clear
            </Button>
          )}
        </div>
      </Card>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {loading && result.data.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : result.data.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Inbox className="h-7 w-7" />
          </span>
          <div>
            <p className="font-semibold">{hasFilters ? 'No tickets match your filters' : 'No tickets yet'}</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? 'Try adjusting or clearing the filters.' : isAdmin ? 'New tickets will show up here.' : 'Create your first support ticket to get started.'}
            </p>
          </div>
          {!hasFilters && !isAdmin && <Button onClick={() => setCreating(true)}><Plus /> Create ticket</Button>}
        </Card>
      ) : (
        <motion.ul key={params.toString()} variants={staggerContainer} initial="hidden" animate="show" className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {result.data.map((t) => (
            <motion.li key={t._id} variants={staggerItem} whileHover={{ y: -2 }}>
              <Link to={`/tickets/${t._id}`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="p-4 transition-shadow hover:shadow-md sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{t.title}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{t.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">{CATEGORIES[t.category]}</span>
                    {isAdmin && t.createdBy && <span>by {t.createdBy.name}</span>}
                    <span>opened {timeAgo(t.createdAt)}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {t.commentCount}</span>
                  </div>
                </Card>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <Pagination pagination={result.pagination} onPage={(page) => update({ page })} />

      <TicketFormDialog open={creating} onOpenChange={setCreating} onSaved={load} />
    </PageTransition>
  );
}
