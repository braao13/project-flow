import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarDayItem {
  type: "entrega" | "atualizacao";
  label: string;
  taskId: string;
  projectId: string;
  /** Data no formato yyyy-MM-dd — define em qual dia o item aparece no calendário. */
  date: string;
  done?: boolean;
}

interface MonthCalendarProps {
  items: CalendarDayItem[];
  /** Compacta o calendário (menos altura) para uso embutido, ex: dentro do Dashboard. */
  compact?: boolean;
}

/**
 * Calendário mensal reutilizável — recebe os itens já filtrados pelo caller
 * (ex: todas as tasks do workspace, ou só as do usuário logado), o que mantém
 * a regra de filtragem fora do componente de apresentação.
 */
export function MonthCalendar({ items, compact = false }: MonthCalendarProps) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarDayItem[]>();
    for (const it of items) {
      const arr = map.get(it.date) ?? [];
      arr.push(it);
      map.set(it.date, arr);
    }
    return map;
  }, [items]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedItems = itemsByDay.get(selectedKey) ?? [];

  return (
    <div className={cn("grid gap-4", compact ? "lg:grid-cols-[1fr_260px]" : "lg:grid-cols-[1fr_320px]")}>
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold capitalize text-sm">{format(cursor, "MMMM yyyy", { locale: ptBR })}</h3>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon" className="size-7" onClick={() => setCursor(subMonths(cursor, 1))}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="size-7" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
          {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayItems = itemsByDay.get(key) ?? [];
            const inMonth = isSameMonth(d, cursor);
            const isSel = isSameDay(d, selected);
            return (
              <button
                key={key}
                onClick={() => setSelected(d)}
                className={cn(
                  "aspect-square rounded-lg p-1 text-left flex flex-col gap-1 border transition",
                  compact ? "min-h-9" : "min-h-14",
                  inMonth ? "border-border/60 bg-background/30" : "border-transparent text-muted-foreground/50",
                  isSel && "border-primary shadow-glow bg-primary/10",
                  isToday(d) && !isSel && "border-primary/40",
                )}
              >
                <div className={cn("text-[11px] font-medium", isToday(d) && "text-primary")}>{format(d, "d")}</div>
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {dayItems.slice(0, 4).map((it, i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full"
                      style={{ background: it.type === "entrega" ? "var(--danger)" : "var(--primary)", opacity: it.done ? 0.4 : 1 }}
                    />
                  ))}
                  {dayItems.length > 4 && <span className="text-[9px] text-muted-foreground">+{dayItems.length - 4}</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "var(--danger)" }} /> Entrega</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Atualização</span>
        </div>
      </div>

      <aside className={cn("glass rounded-2xl p-4 space-y-3", compact ? "lg:max-h-[360px]" : "lg:max-h-[600px]", "lg:overflow-auto")}>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Selecionado</p>
          <h4 className="font-semibold capitalize text-sm">{format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h4>
        </div>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada agendado.</p>
        ) : (
          <ul className="space-y-2">
            {selectedItems.map((it, i) => (
              <li key={i} className="rounded-lg p-2.5 border border-border/60 bg-background/30">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="size-1.5 rounded-full" style={{ background: it.type === "entrega" ? "var(--danger)" : "var(--primary)" }} />
                  {it.type === "entrega" ? "Entrega" : "Atualização"}
                  {it.done && <span className="text-success">· concluída</span>}
                </div>
                <Link to="/projetos/$id" params={{ id: it.projectId }} className="block mt-1 text-sm font-medium hover:text-primary">
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
