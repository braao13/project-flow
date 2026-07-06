import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Projetin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, profile, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Se já estiver logado, redireciona (para troca de senha, se for o primeiro
  // acesso, ou para o dashboard).
  useEffect(() => {
    if (loading || !session) return;
    if (profile && !profile.first_login_completed) {
      navigate({ to: "/trocar-senha" });
    } else if (profile) {
      navigate({ to: "/" });
    }
  }, [loading, session, profile, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError("E-mail ou senha inválidos.");
  }

  return (
    <div
      className="dark min-h-screen grid place-items-center px-4"
      style={{
        background:
          "radial-gradient(circle at 50% -20%, oklch(0.22 0.05 280 / 40%), transparent 60%), oklch(0.08 0.01 280)",
      }}
    >
      <div className="w-full max-w-sm glass-strong rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <div
            className="size-9 rounded-xl grid place-items-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-lg leading-none text-gradient">Projetin</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">timeline-driven</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">E-mail</label>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary transition"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary transition"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}