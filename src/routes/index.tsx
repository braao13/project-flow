import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { format, isToday, parseISO, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_META, type Task } from "@/lib/types";
import { AssigneeBadge, PriorityBadge, StatusBadge } from "@/components/projetin/badges";
import { MonthCalendar, type CalendarDayItem } from "@/components/projetin/MonthCalendar";
import { TaskDialog } from "@/components/projetin/TaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Flow" },
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

function taskCounts(tasks: Task[]) {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "finalizada").length,
    progress: tasks.filter((t) => t.status === "andamento").length,
    late: tasks.filter((t) => t.status === "atrasada").length,
  };
}

function upcomingOf(tasks: Task[]) {
  return tasks
    .filter((t) => t.status !== "finalizada" && t.dueDate)
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
    .slice(0, 6);
}

/** Cartões de contagem + próximas entregas — reutilizado pelas duas abas. */
function StatsRow({ counts }: { counts: ReturnType<typeof taskCounts> }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total de tasks" value={counts.total} icon={ListTodo} accent="var(--primary)" />
      <StatCard label="Em andamento" value={counts.progress} icon={Clock} accent="var(--warning)" />
      <StatCard label="Finalizadas" value={counts.done} icon={CheckCircle2} accent="var(--success)" />
      <StatCard label="Atrasadas" value={counts.late} icon={TrendingUp} accent="var(--danger)" />
    </div>
  );
}

function UpcomingList({
  tasks,
  projects,
  emptyLabel,
  filterControl,
}: {
  tasks: Task[];
  projects: { id: string; name: string }[];
  emptyLabel: string;
  filterControl?: ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-semibold">Próximas entregas</h2>
        {filterControl}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {tasks.map((t) => {
            const project = projects.find((p) => p.id === t.projectId);
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
  );
}

const ALL_RESPONSIBLE = "todos";

function Dashboard() {
  const { state, currentUserId } = useStore();
  const tasks = state.tasks;
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  // ---------- Panorama Geral (todo o workspace) ----------
  const counts = useMemo(() => taskCounts(tasks), [tasks]);
  const upcoming = useMemo(() => upcomingOf(tasks), [tasks]);

  // Filtro por responsável — aplicado na listagem de "Próximas entregas" do Panorama Geral.
  const [responsibleFilter, setResponsibleFilter] = useState<string>(ALL_RESPONSIBLE);
  const filteredUpcoming = useMemo(
    () => (responsibleFilter === ALL_RESPONSIBLE ? upcoming : upcoming.filter((t) => t.responsibleUserId === responsibleFilter)),
    [upcoming, responsibleFilter],
  );

  const pieData = useMemo(
    () =>
      [
        { name: "Em andamento", value: counts.progress, color: "var(--warning)" },
        { name: "Finalizadas", value: counts.done, color: "var(--success)" },
        { name: "Atrasadas", value: counts.late, color: "var(--danger)" },
      ].filter((d) => d.value > 0),
    [counts],
  );

  const weekData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(start, i);
      const key = day.toISOString().slice(0, 10);
      const dayUpdates = state.updates.filter((u) => u.done && u.date === key).length;
      return { day: format(day, "EEE", { locale: ptBR }), concluidas: dayUpdates };
    });
  }, [state.updates]);

  const generalCalendarItems = useMemo<CalendarDayItem[]>(() => {
    const list: CalendarDayItem[] = [];
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const project = state.projects.find((p) => p.id === t.projectId);
      list.push({
        type: "entrega",
        label: t.name,
        taskId: t.id,
        projectId: t.projectId,
        projectName: project?.name ?? "Sem projeto",
        projectColor: project?.color ?? undefined,
        status: t.status,
        date: t.dueDate.slice(0, 10),
        done: t.status === "finalizada",
        onOpenTask: () => setEditingTask(t),
      });
    });
    state.updates.forEach((u) => {
      if (!u.date) return;
      const task = tasks.find((t) => t.id === u.taskId);
      if (!task) return;
      const project = state.projects.find((p) => p.id === task.projectId);
      list.push({
        type: "atualizacao",
        label: u.title,
        taskId: u.taskId,
        projectId: task.projectId,
        projectName: project?.name ?? "Sem projeto",
        date: u.date,
        done: u.done,
        onOpenTask: () => setEditingTask(task),
      });
    });
    return list;
  }, [tasks, state.updates, state.projects]);

  // ---------- Minhas Atribuições (só o usuário logado) ----------
  // Filtragem automática pelo usuário autenticado — nunca exibe tasks de outros.
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

  const myCounts = useMemo(() => taskCounts(myTasks), [myTasks]);
  const myUpcoming = useMemo(() => upcomingOf(myTasks), [myTasks]);

  // Calendário de "Minhas Atribuições" — só entregas das MINHAS tasks, sem atualizações de terceiros.
  const myCalendarItems = useMemo<CalendarDayItem[]>(() => {
    return myTasks
      .filter((t) => t.dueDate)
      .map((t) => {
        const project = state.projects.find((p) => p.id === t.projectId);
        return {
          type: "entrega" as const,
          label: t.name,
          taskId: t.id,
          projectId: t.projectId,
          projectName: project?.name ?? "Sem projeto",
          projectColor: project?.color ?? undefined,
          status: t.status,
          date: t.dueDate!.slice(0, 10),
          done: t.status === "finalizada",
          onOpenTask: () => setEditingTask(t),
        };
      });
  }, [myTasks, state.projects]);

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

      <Tabs defaultValue="geral">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="geral">Panorama Geral</TabsTrigger>
          <TabsTrigger value="minhas">Minhas Atribuições</TabsTrigger>
        </TabsList>

        {/* ===== Panorama Geral ===== */}
        <TabsContent value="geral" className="space-y-6 mt-5">
          <StatsRow counts={counts} />

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

          <UpcomingList
            tasks={filteredUpcoming}
            projects={state.projects}
            emptyLabel="Nenhuma entrega agendada."
            filterControl={
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_RESPONSIBLE}>Todos os responsáveis</SelectItem>
                  {state.profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        <AssigneeBadge profile={p} size="xs" />
                        {p.fullName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Calendário geral</h2>
            <MonthCalendar items={generalCalendarItems} compact />
          </section>
        </TabsContent>

        {/* ===== Minhas Atribuições — só tasks onde o usuário logado é o responsável ===== */}
        <TabsContent value="minhas" className="space-y-6 mt-5">
          <StatsRow counts={myCounts} />

          <UpcomingList tasks={myUpcoming} projects={state.projects} emptyLabel="Nenhuma entrega atribuída a você." />

          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Seu calendário de entregas</h2>
            <MonthCalendar items={myCalendarItems} compact />
          </section>

          <section className="glass rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Suas tasks</h2>
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
          </section>
        </TabsContent>
      </Tabs>

      <TaskDialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(undefined)} task={editingTask} />
    </div>
  );
}
