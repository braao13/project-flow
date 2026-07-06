import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";

// Rotas acessíveis sem sessão / sem first_login_completed.
const PUBLIC_ROUTES = ["/login", "/trocar-senha"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe ou foi movida.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-xl font-semibold tracking-tight">Esta página não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dashboard — Projetin" },
      { name: "description", content: "Visão geral das suas tasks, entregas e produtividade." },
      { name: "theme-color", content: "#0b0a14" },
      { property: "og:title", content: "Dashboard — Projetin" },
      { property: "og:description", content: "Visão geral das suas tasks, entregas e produtividade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Dashboard — Projetin" },
      { name: "twitter:description", content: "Visão geral das suas tasks, entregas e produtividade." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Outlet />
        </AuthGate>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Decide o que renderizar com base no estado de autenticação:
 * - /login e /trocar-senha sempre renderizam livremente (cada uma cuida do
 *   próprio redirecionamento quando não faz sentido estar ali).
 * - Sem sessão -> manda para /login.
 * - Sessão sem first_login_completed -> manda para /trocar-senha (Step 4,
 *   não pode ser pulado).
 * - Caso contrário, app completo dentro do StoreProvider + AppShell.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublicRoute) {
      navigate({ to: "/login" });
    } else if (session && profile && !profile.first_login_completed && pathname !== "/trocar-senha") {
      navigate({ to: "/trocar-senha" });
    }
  }, [loading, session, profile, pathname, isPublicRoute, navigate]);

  if (loading) {
    return (
      <div className="dark min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando…</div>
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Sem sessão válida ou senha temporária ainda ativa: o useEffect acima já
  // disparou o redirect, aqui só evitamos piscar o app por trás.
  if (!session || (profile && !profile.first_login_completed)) {
    return null;
  }

  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
