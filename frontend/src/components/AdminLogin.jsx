import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { login } from "../lib/auth";
import { toast } from "sonner";

/**
 * Full-screen lock screen for the admin area. Shown when the backend reports
 * auth is configured and no valid token is stored locally.
 */
export default function AdminLogin({ onAuthed }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e?.preventDefault();
    if (!password) {
      setError("Bitte Passwort eingeben.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login(password);
      toast.success("Willkommen in der Regiezentrale");
      onAuthed?.();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Anmeldung fehlgeschlagen";
      setError(typeof detail === "string" ? detail : "Anmeldung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#06091a] text-blue-50 flex items-center justify-center px-4"
      data-testid="admin-login"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-blue-400/20 bg-[#0c1430] p-6 shadow-2xl space-y-5"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Jandia Arena</h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-blue-300/70">
            Regiezentrale · Anmeldung
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-blue-200">Admin-Passwort</Label>
          <Input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 bg-[#0a112a] text-base text-white"
            placeholder="••••••••"
            data-testid="admin-password-input"
          />
          {error && (
            <p className="text-sm text-rose-300" data-testid="admin-login-error">
              {error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting || !password}
          data-testid="admin-login-submit"
          className="h-12 w-full bg-blue-500 hover:bg-blue-400 text-base font-bold uppercase tracking-wider"
        >
          {submitting ? "Anmelden…" : "Anmelden"}
        </Button>

        <a
          href="/"
          className="block text-center text-xs uppercase tracking-widest text-blue-300/60 hover:text-blue-200"
          data-testid="admin-login-back"
        >
          ← Zur TV-Ansicht
        </a>
      </form>
    </div>
  );
}
