import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { format, isToday, parseISO, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CheckCircle2, Clock, ListTodo, TrendingUp, UserCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_META } from "@/lib/types";
import { PriorityBadge, StatusBadge } from "@/components/projetin/badges";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Projetin" },
      { name: "description", content: "Visão geral das suas tasks, entregas e produtividade." },
    ],
  }),
  component: Dashboard,
});

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent: string }) {
  return (
    <div className="glass rounded-xl p-5 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold mt-1">{value}</div>
      </div>
      <div className="size-11 rounded-xl grid place-items-center" style={{ background: `color-mix(in oklab, ${accent} 20%, transparent)`, color: accent }}>
        <Icon className="size-5" />
      </div>
    </div>
  );
}

function Dashboard() {
  const { state, currentUserId } = useStore();
  const tasks = state.tasks;

  const counts = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((t) => t.status === "finalizada").length,
    progress: tasks.filter((t) => t.status === "andamento").length,
    late: tasks.filter((t) => t.status === "atrasada").length,
  }), [tasks]);

  const upcoming = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "finalizada" && t.dueDate)
      .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
      .slice(0, 6);
  }, [tasks]);

  // Step 8 — "Minhas Atribuições": só as tasks onde o usuário logado é o responsável.
  const myTasks = useMemo(() => {
    if (!currentUserId) return [];
    const priorityOrder = { maxima: 0, alta: 1, nenhuma: 2, baixa: 3 };
    return tasks
      .filter((t) => t.responsibleUserId === currentUserId)
      .sort((a, b) => {
        if (a.status === "finalizada" && b.status !== "finalizada") return 1;
        if (b.status === "finalizada" && a.status !== "finalizada") return -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [tasks, currentUserId]);

  const myCounts = useMemo(() => ({
    total: myTasks.length,
    progress: myTasks.filter((t) => t.status === "andamento").length,
    late: myTasks.filter((t) => t.status === "atrasada").length,
  }), [myTasks]);

  const pieData = [
    { name: "Em andamento", value: counts.progress, color: "var(--warning)" },
    { name: "Finalizadas", value: counts.done, color: "var(--success)" },
    { name: "Atrasadas", value: counts.late, color: "var(--danger)" },
  ].filter((d) => d.value > 0);

  const weekData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(start, i);
      const key = day.toISOString().slice(0, 10);
      const dayUpdates = state.updates.filter((u) => u.done && u.date === key).length;
      return { day: format(day, "EEE", { locale: ptBR }), concluidas: dayUpdates };
    });
  }, [state.updates]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <Link to="/projetos" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          Ir para projetos <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* ===== Visão Geral (global, todo o time) ===== */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Visão geral</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total de tasks" value={counts.total} icon={ListTodo} accent="var(--primary)" />
          <StatCard label="Em andamento" value={counts.progress} icon={Clock} accent="var(--warning)" />
          <StatCard label="Finalizadas" value={counts.done} icon={CheckCircle2} accent="var(--success)" />
          <StatCard label="Atrasadas" value={counts.late} icon={TrendingUp} accent="var(--danger)" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Produtividade da semana</h2>
            <span className="text-xs text-muted-foreground">Atualizações concluídas por dia</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={weekData}>
                <CartesianGrid stroke="oklch(1 0 0 / 8%)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} stroke="oklch(0.65 0 0)" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="oklch(0.65 0 0)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 5%)" }}
                  contentStyle={{ background: "oklch(0.18 0.013 270)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }}
                />
                <Bar dataKey="concluidas" radius={[8, 8, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Status das tasks</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.013 270)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-3 space-y-1.5 text-sm">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1">{d.name}</span>
                <span className="text-muted-foreground">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Próximas entregas</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrega agendada.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {upcoming.map((t) => {
              const project = state.projects.find((p) => p.id === t.projectId);
              const due = parseISO(t.dueDate!);
              const meta = STATUS_META[t.status];
              return (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <span className="size-2 rounded-full shrink-0" style={{ background: meta.color }} />
                  <Link to="/projetos/$id" params={{ id: t.projectId }} className="flex-1 min-w-0 hover:text-primary">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{project?.name}</div>
                  </Link>
                  <div className={`text-sm ${isToday(due) ? "text-warning" : "text-muted-foreground"}`}>
                    {format(due, "dd MMM", { locale: ptBR })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ===== Minhas Atribuições (Step 8) — só as tasks do usuário logado ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest inline-flex items-center gap-2">
            <UserCircle2 className="size-4" /> Minhas atribuições
          </h2>
          {myTasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {myCounts.total} no total · {myCounts.progress} em andamento · {myCounts.late} atrasada(s)
            </span>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          {myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma task atribuída a você no momento.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {myTasks.map((t) => {
                const project = state.projects.find((p) => p.id === t.projectId);
                return (
                  <li key={t.id} className="py-3 flex items-center gap-3">
                    <Link to="/projetos/$id" params={{ id: t.projectId }} className="flex-1 min-w-0 hover:text-primary">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {project?.name}
                        {t.dueDate && ` · Entrega ${format(parseISO(t.dueDate), "dd MMM", { locale: ptBR })}`}
                      </div>
                    </Link>
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
