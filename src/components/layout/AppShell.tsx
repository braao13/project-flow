import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, FolderKanban, Sun, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/hoje", label: "Hoje", icon: Sun },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="dark min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 p-4 border-r border-border/60 glass sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="size-9 rounded-xl grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-lg leading-none text-gradient">Projetin</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">timeline-driven</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1 mt-2">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  active
                    ? "bg-accent text-accent-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3 rounded-xl glass text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1">Próximas fases</div>
          Integração Telegram e IA de produtividade já previstas na arquitetura.
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border/60 glass sticky top-0 z-30">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg" style={{ background: "var(--gradient-primary)" }} />
            <span className="font-semibold text-gradient">Projetin</span>
          </Link>
          <nav className="flex gap-1">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to} className={cn("p-2 rounded-md", active ? "bg-accent" : "text-muted-foreground")}>
                  <Icon className="size-4" />
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
