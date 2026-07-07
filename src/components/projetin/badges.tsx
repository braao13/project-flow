import { PRIORITY_META, STATUS_META, type TaskPriority, type TaskStatus, type Profile } from "@/lib/types";
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar circular com as iniciais do responsável — usado em tasks e updates da timeline. */
export function AssigneeBadge({ profile, className, size = "sm" }: { profile?: Profile; className?: string; size?: "sm" | "xs" }) {
  if (!profile) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-dashed border-border text-muted-foreground shrink-0",
          size === "sm" ? "size-6 text-[10px]" : "size-5 text-[9px]",
          className,
        )}
        title="Sem responsável"
      >
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0 text-primary-foreground",
        size === "sm" ? "size-6 text-[10px]" : "size-5 text-[9px]",
        className,
      )}
      style={{ background: "var(--gradient-primary)" }}
      title={profile.fullName}
    >
      {initials(profile.fullName)}
    </span>
  );
}
