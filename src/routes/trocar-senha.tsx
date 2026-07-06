import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/trocar-senha")({
  head: () => ({ meta: [{ title: "Atualize sua senha — Projetin" }] }),
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const { session, profile, loading, changePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Guarda-chuva: sem sessão -> login. Se já trocou a senha -> dashboard.
  // Isso é o que impede o usuário de "pular" a etapa (Step 4).
  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
    } else if (profile?.first_login_completed) {
      navigate({ to: "/" });
    }
  }, [loading, session, profile, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    const { error } = await changePassword(password);
    setSubmitting(false);

    if (error) {
      setError(error);
      return;
    }
    navigate({ to: "/" });
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
        <h1 className="text-xl font-semibold mb-1">Defina sua senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este é seu primeiro acesso. Por segurança, crie uma nova senha antes de continuar — essa etapa não pode ser
          pulada.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary transition"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary transition"
              placeholder="Repita a senha"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Salvar e continuar"}
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}