import { useEffect, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BalloonItem {
  id: string;
  title: string;
  subtitle?: string;
  borderColor: string;
  sizeScale?: number;
  dots?: { color: string }[];
}

interface BalloonFieldProps {
  items: BalloonItem[];
  emptyLabel: string;
  renderExpanded: (item: BalloonItem, close: () => void) => ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}

const BASE_SIZE = 136;

export function BalloonField({ items, emptyLabel, renderExpanded, onAdd, addLabel }: BalloonFieldProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = items.find((i) => i.id === expandedId) ?? null;
  const close = () => setExpandedId(null);

  // Esc fecha o nível atual — útil quando há vários níveis abertos (Droste).
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-6 overflow-x-auto py-6 px-1 transition-opacity duration-300",
          "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full",
          expanded && "pointer-events-none",
        )}
      >
        {items.length === 0 && !onAdd && <p className="text-sm text-muted-foreground italic px-2">{emptyLabel}</p>}

        {items.map((item, i) => (
          <Balloon key={item.id} item={item} index={i} dimmed={!!expanded} onClick={() => setExpandedId(item.id)} />
        ))}

        {onAdd && (
          <button
            onClick={onAdd}
            style={{ width: BASE_SIZE * 0.85, height: BASE_SIZE * 0.85 }}
            className={cn(
              "shrink-0 rounded-full border-2 border-dashed border-border/60 text-muted-foreground",
              "flex flex-col items-center justify-center gap-1 transition-all hover:border-primary hover:text-primary hover:scale-[1.05]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              expanded && "opacity-30 scale-90",
            )}
          >
            <Plus className="size-5" />
            <span className="text-[11px]">{addLabel}</span>
          </button>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-balloon-scrim-in" />

          <div
            className="relative w-full max-w-3xl max-h-[85vh] overflow-auto glass-strong rounded-[2.5rem] p-8 animate-balloon-zoom-in"
            style={{ borderWidth: 3, borderColor: expanded.borderColor, boxShadow: `0 0 60px -10px ${expanded.borderColor}` }}
          >
            <span className="balloon-ripple" style={{ borderColor: expanded.borderColor }} />
            <span className="balloon-ripple balloon-ripple-delay" style={{ borderColor: expanded.borderColor }} />

            <button
              onClick={close}
              aria-label="Fechar"
              className="absolute top-5 right-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="size-4" />
            </button>

            <div className="relative">{renderExpanded(expanded, close)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Balloon({
  item,
  index,
  dimmed,
  onClick,
}: {
  item: BalloonItem;
  index: number;
  dimmed: boolean;
  onClick: () => void;
}) {
  const size = BASE_SIZE * (item.sizeScale ?? 1);

  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderColor: item.borderColor,
        boxShadow: `0 0 28px -8px ${item.borderColor}`,
        animationDelay: `${(index % 6) * 0.35}s`,
      }}
      className={cn(
        "balloon-float shrink-0 rounded-full glass border-[3px] flex flex-col items-center justify-center gap-1.5 px-4 text-center",
        "transition-all duration-300 hover:scale-[1.06] hover:brightness-110 active:scale-95",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        dimmed && "opacity-30 scale-90 saturate-50",
      )}
    >
      <span className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</span>
      {item.subtitle && <span className="text-[11px] text-muted-foreground line-clamp-1">{item.subtitle}</span>}
      {item.dots && item.dots.length > 0 && (
        <span className="flex flex-wrap items-center justify-center gap-1 mt-1 max-w-[70%]">
          {item.dots.slice(0, 8).map((d, i) => (
            <span key={i} className="size-1.5 rounded-full shrink-0" style={{ background: d.color }} />
          ))}
        </span>
      )}
    </button>
  );
}
