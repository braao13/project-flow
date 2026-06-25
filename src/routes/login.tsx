import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — Projetin" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signInWithPassword, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" />;

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password.trim()) {
      setError("Informe e-mail e senha.");
      return;
    }
    setSubmitting(true);
    const result =
      mode === "signin"
        ? await signInWithPassword(email.trim(), password)
        : await signUp(email.trim(), password, fullName.trim() || undefined);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === "signin") navigate({ to: "/" });
    else setInfo("Conta criada. Verifique seu e-mail para confirmar o acesso.");
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm glass-strong rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div
            className="size-9 rounded-xl grid place-items-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="font-semibold text-lg text-gradient">Projetin</div>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
        </div>

        <Button className="w-full" onClick={submit} disabled={submitting}>
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </Button>

        <button
          type="button"
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "signin" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
