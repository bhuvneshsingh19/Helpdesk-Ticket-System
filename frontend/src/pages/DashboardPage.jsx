import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion } from 'framer-motion';
import { Activity, CheckCircle2, Clock, Plus, Ticket, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { TicketFormDialog } from '@/components/TicketFormDialog';
import { useAuth } from '@/context/AuthContext';
import { ticketApi } from '@/lib/api';
import { CATEGORIES, EVENT_LABELS, PRIORITIES, STATUSES } from '@/lib/constants';
import { cn, errorMessage, timeAgo } from '@/lib/utils';

function AnimatedNumber({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

function StatCard({ icon: Icon, label, value, decimals, suffix, tint }) {
  return (
    <motion.div variants={staggerItem}>
      <Card className="relative overflow-hidden p-5">
        <div className={cn('absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl', tint)} />
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-white shadow', tint)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">
          {value === null ? '-' : <AnimatedNumber value={value} decimals={decimals} />}
          {value !== null && suffix && <span className="ml-1 text-base font-medium text-muted-foreground">{suffix}</span>}
        </p>
      </Card>
    </motion.div>
  );
}

function DistributionCard({ title, description, data, meta }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(data).map(([key, count]) => {
          const pct = total ? (count / total) * 100 : 0;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{meta[key]?.label || meta[key] || key}</span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className={cn('h-full rounded-full', meta[key]?.bar || 'bg-primary')}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function WeekChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tickets opened</CardTitle>
        <CardDescription>Last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-2">
          {days.map((d, i) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">{d.count}</span>
              <motion.div
                className="w-full rounded-t-md bg-primary/80"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (d.count / max) * 100)}px` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                style={{ opacity: d.count ? 1 : 0.25 }}
              />
              <span className="text-[10px] uppercase text-muted-foreground">
                {new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const [s, list, feed] = await Promise.all([
        ticketApi.stats(),
        ticketApi.list({ limit: 5, sort: 'newest' }),
        isAdmin ? ticketApi.recentActivity() : Promise.resolve([]),
      ]);
      setStats(s);
      setRecent(list.data);
      setActivity(feed);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  return (
    <PageTransition className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hello, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Here is how support is doing across all users.' : 'Here is a snapshot of your support requests.'}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus /> New ticket
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Ticket} label="Total tickets" value={stats.total} tint="bg-indigo-500" />
            <StatCard icon={Clock} label="Active" value={stats.active} tint="bg-amber-500" />
            <StatCard icon={CheckCircle2} label="Resolved" value={stats.byStatus.resolved} tint="bg-emerald-500" />
            <StatCard icon={TimerReset} label="Avg. resolution" value={stats.avgResolutionHours} decimals={1} suffix="hrs" tint="bg-sky-500" />
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DistributionCard title="By status" description="Where tickets are in the workflow" data={stats.byStatus} meta={STATUSES} />
            <DistributionCard title="By priority" description="How urgent they are" data={stats.byPriority} meta={PRIORITIES} />
            <WeekChart days={stats.last7Days} />
          </div>

          <div className={cn('grid gap-4', isAdmin && 'lg:grid-cols-5')}>
            <Card className={cn(isAdmin && 'lg:col-span-3')}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="space-y-1.5">
                  <CardTitle className="text-base">{isAdmin ? 'Latest tickets' : 'Recent tickets'}</CardTitle>
                  <CardDescription>The five most recent</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm"><Link to="/tickets">View all</Link></Button>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
                ) : (
                  <ul className="divide-y">
                    {recent.map((t) => (
                      <li key={t._id}>
                        <Link to={`/tickets/${t._id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 transition-colors hover:text-primary">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{t.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {CATEGORIES[t.category]} · {isAdmin && t.createdBy ? `${t.createdBy.name} · ` : ''}{timeAgo(t.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-2"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Activity feed</CardTitle>
                  <CardDescription>Generated from ticket events</CardDescription>
                </CardHeader>
                <CardContent>
                  {activity.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {activity.map((a) => (
                        <li key={a._id} className="flex gap-3 text-sm">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          <div className="min-w-0">
                            <p>
                              <span className="font-medium">{a.actor?.name}</span> {EVENT_LABELS[a.type] || a.type}
                              {a.ticket && <> on <Link to={`/tickets/${a.ticket._id}`} className="font-medium text-primary hover:underline">{a.ticket.title}</Link></>}
                            </p>
                            <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <TicketFormDialog open={creating} onOpenChange={setCreating} onSaved={load} />
    </PageTransition>
  );
}
