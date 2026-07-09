import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, FolderKanban, Sun, Sparkles, PanelLeft, X, LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/hoje", label: "Hoje", icon: Sun },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  // navegar fecha a barra — evita ficar aberta sobre a página seguinte.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="dark min-h-screen">
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className={cn(
          "fixed top-4 left-4 z-50 size-10 grid place-items-center rounded-full glass-strong text-foreground shadow-glow",
          "transition-all duration-300 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          open && "opacity-0 -translate-x-3 pointer-events-none",
        )}
      >
        <PanelLeft className="size-4" />
      </button>

      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-72 flex flex-col gap-1 p-4 border-r border-border/60 glass-strong",
          "transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-3 mb-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="size-9 rounded-xl grid place-items-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-lg leading-none text-gradient truncate">Projetin</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">timeline-driven</div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 mt-2">
          {nav.map((n, i) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                style={{ transitionDelay: open ? `${i * 60}ms` : "0ms" }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300",
                  open ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
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

        <div className="mt-auto flex flex-col gap-2">
          {profile && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl glass">
              <div
                className="size-8 rounded-full grid place-items-center shrink-0 text-xs font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                {profile.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{profile.fullName}</div>
                <div className="text-[11px] text-muted-foreground truncate">@{profile.username}</div>
              </div>
              <button
                onClick={handleSignOut}
                aria-label="Sair"
                title="Sair"
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary shrink-0"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
          <div className="p-3 rounded-xl glass text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Próximas fases</div>
            Integração Telegram e IA de produtividade já previstas na arquitetura.
          </div>
        </div>
      </aside>

      <main className="min-h-screen">
        <div className="p-4 pt-20 md:p-8 md:pt-24 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
