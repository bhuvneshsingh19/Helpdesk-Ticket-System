import { Badge } from '@/components/ui/badge';
import { PRIORITIES, STATUSES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }) {
  const s = STATUSES[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <Badge className={cn(s.cls, className)}>
      <Icon /> {s.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }) {
  const p = PRIORITIES[priority];
  if (!p) return null;
  const Icon = p.icon;
  return (
    <Badge className={cn(p.cls, className)}>
      <Icon /> {p.label}
    </Badge>
  );
}
