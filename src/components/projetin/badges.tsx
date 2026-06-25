import { PRIORITY_META, STATUS_META, type TaskPriority, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
        className,
      )}
      style={{ color: meta.color, borderColor: `color-mix(in oklab, ${meta.color} 40%, transparent)`, background: `color-mix(in oklab, ${meta.color} 12%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)} title={meta.label}>
      <span>{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}
