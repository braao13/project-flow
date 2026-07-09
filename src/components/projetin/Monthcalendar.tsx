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
import { STATUS_META, type TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarDayItem {
  type: "entrega" | "atualizacao";
  label: string;
  taskId: string;
  projectId: string;
  projectName: string;
  /** Cor do projeto (hex ou var CSS). Cai para um tom padrão quando ausente. */
  projectColor?: string;
  /** Status da task — usado no tooltip da faixa de entrega. */
  status?: TaskStatus;
  /** Data no formato yyyy-MM-dd — define em qual dia o item aparece no calendário. */
  date: string;
  done?: boolean;
  /** Abre a task correspondente. Chamado ao clicar na faixa de entrega. */
  onOpenTask?: () => void;
}

const DEFAULT_PROJECT_COLOR = "var(--chart-5)";

interface MonthCalendarProps {
  items: CalendarDayItem[];
  /** Compacta o calendário (menos altura, menos faixas visíveis) para uso embutido no Dashboard. */
  compact?: boolean;
}

/**
 * Calendário mensal reutilizável. Entregas aparecem como faixas coloridas
 * (cor do projeto) com o nome do projeto; atualizações continuam como
 * indicadores simples. O caller já filtra os itens (ex: todo o workspace ou
 * só as tasks do usuário logado).
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
  const maxVisible = compact ? 1 : 2;

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
            const entregas = dayItems.filter((it) => it.type === "entrega");
            const atualizacoes = dayItems.filter((it) => it.type === "atualizacao");
            const inMonth = isSameMonth(d, cursor);
            const isSel = isSameDay(d, selected);
            const visibleEntregas = entregas.slice(0, maxVisible);
            const hiddenCount = entregas.length - visibleEntregas.length;

            return (
              <div
                key={key}
                onClick={() => setSelected(d)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(d)}
                className={cn(
                  "rounded-lg p-1 text-left flex flex-col gap-1 border transition cursor-pointer",
                  compact ? "min-h-[64px]" : "min-h-[88px]",
                  inMonth ? "border-border/60 bg-background/30" : "border-transparent text-muted-foreground/50",
                  isSel && "border-primary shadow-glow bg-primary/10",
                  isToday(d) && !isSel && "border-primary/40",
                )}
              >
                <div className={cn("text-[11px] font-medium shrink-0", isToday(d) && "text-primary")}>{format(d, "d")}</div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  {visibleEntregas.map((it) => {
                    const color = it.projectColor || DEFAULT_PROJECT_COLOR;
                    const tooltip = [
                      it.label,
                      `Projeto: ${it.projectName}`,
                      it.status ? `Status: ${STATUS_META[it.status].label}` : null,
                      `Entrega: ${format(new Date(it.date + "T00:00:00"), "dd/MM/yyyy")}`,
                    ]
                      .filter(Boolean)
                      .join("\n");
                    return (
                      <button
                        key={it.taskId}
                        title={tooltip}
                        onClick={(e) => {
                          e.stopPropagation();
                          it.onOpenTask?.();
                        }}
                        className={cn(
                          "w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate border-l-2 transition hover:brightness-110",
                          it.done && "opacity-50 line-through",
                        )}
                        style={{
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          borderColor: color,
                          color: `color-mix(in oklab, ${color} 70%, white)`,
                        }}
                      >
                        {it.projectName}
                      </button>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(d); }}
                      className="text-[10px] text-muted-foreground hover:text-primary text-left px-1.5"
                    >
                      +{hiddenCount} mais
                    </button>
                  )}
                </div>

                {atualizacoes.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {atualizacoes.slice(0, 4).map((it, i) => (
                      <span
                        key={i}
                        title={`${it.label} · ${it.projectName}`}
                        className="size-1.5 rounded-full shrink-0"
                        style={{ background: "var(--primary)", opacity: it.done ? 0.4 : 1 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full border-l-2" style={{ background: "color-mix(in oklab, var(--danger) 18%, transparent)", borderColor: "var(--danger)" }} /> Entrega (cor do projeto)</span>
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
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ background: it.type === "entrega" ? (it.projectColor || DEFAULT_PROJECT_COLOR) : "var(--primary)" }}
                  />
                  {it.type === "entrega" ? "Entrega" : "Atualização"}
                  {it.done && <span className="text-success">· concluída</span>}
                </div>
                <button
                  onClick={() => it.onOpenTask?.()}
                  className="block mt-1 text-sm font-medium hover:text-primary text-left w-full truncate"
                >
                  {it.label}
                </button>
                <p className="text-xs text-muted-foreground truncate">{it.projectName}</p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
