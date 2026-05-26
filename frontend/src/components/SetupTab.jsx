import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  fetchSimulateDate,
  setSimulateDate,
  enableLiveMode,
  resetSimulateDate,
  triggerGoalTest,
} from "../lib/api";
import { logout } from "../lib/auth";

const SOURCE_LABELS = {
  env: "Standardwert (.env)",
  live: "Live-Betrieb",
  runtime_live: "Live-Betrieb (Override)",
  runtime_simulated: "Simuliertes Datum",
};

/**
 * Mobile-first redesign of the Setup tab.
 *  - Status as 3 large pills
 *  - Stacked full-width buttons (touch targets ≥ 48px)
 *  - Sektion: Daten-Modus, Schnellaktionen (QA), Anmeldung (Abmelden)
 *  - System-Info als kompakte Liste am Ende
 */
export default function SetupTab() {
  const [state, setState] = useState(null);
  const [draftDate, setDraftDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await fetchSimulateDate();
      setState(data);
      if (data.effective_date) setDraftDate(data.effective_date);
    } catch (e) {
      console.error(e);
      toast.error("Konnte Einstellungen nicht laden.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSetDate = async () => {
    if (!draftDate) {
      toast.error("Bitte ein Datum auswählen.");
      return;
    }
    setSaving(true);
    try {
      const data = await setSimulateDate(draftDate);
      if (data.error) toast.error("Ungültiges Datum (YYYY-MM-DD).");
      else {
        setState(data);
        toast.success(`Datum gesetzt: ${data.effective_date}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async () => {
    setSaving(true);
    try {
      const data = await enableLiveMode();
      setState(data);
      setDraftDate("");
      toast.success("Live-Betrieb aktiv.");
    } catch (e) {
      console.error(e);
      toast.error("Umschalten fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const data = await resetSimulateDate();
      setState(data);
      if (data.effective_date) setDraftDate(data.effective_date);
      toast.success("Override entfernt.");
    } catch (e) {
      console.error(e);
      toast.error("Zurücksetzen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoalTest = async () => {
    try {
      await triggerGoalTest();
      toast.success("Goal-Animation ausgelöst.");
    } catch (e) {
      console.error(e);
      toast.error("Trigger fehlgeschlagen.");
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Abgemeldet.");
    window.location.reload();
  };

  const isLive = !!state?.live;
  const isRuntimeOverride =
    state?.source === "runtime_live" || state?.source === "runtime_simulated";

  return (
    <div className="space-y-6" data-testid="setup-tab">
      {/* --- Daten-Modus Section --- */}
      <section
        className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0c1430] to-[#0a112a] p-5 shadow-lg"
        data-testid="setup-data-mode"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/70">
              Daten-Modus
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {isLive ? "Live-Betrieb" : "Simuliertes Datum"}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
              isLive
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-200"
            }`}
            data-testid="simulate-date-status-badge"
          >
            {isLive ? "Echtzeit" : "Sim"}
          </span>
        </header>

        {/* Status pills */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatusPill label="Aktiv">
            <span
              className="font-mono text-white text-sm"
              data-testid="simulate-date-effective"
            >
              {state?.live ? "ECHT" : state?.effective_date || "—"}
            </span>
          </StatusPill>
          <StatusPill label="Quelle">
            <span className="text-white text-[11px] leading-tight">
              {(state && SOURCE_LABELS[state.source]) || "—"}
            </span>
          </StatusPill>
          <StatusPill label=".env">
            <span className="font-mono text-blue-100 text-sm">
              {state?.env_value || "—"}
            </span>
          </StatusPill>
        </div>

        {/* Datum setzen */}
        <div className="mt-5 space-y-3">
          <div>
            <Label className="text-blue-200">Simuliertes Datum</Label>
            <Input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="mt-2 h-12 bg-[#0a112a] text-base text-white"
              data-testid="simulate-date-input"
            />
            <p className="mt-1.5 text-xs text-blue-300/70">
              Verankert das Dashboard auf diesem Datum (Uhrzeit läuft real).
            </p>
          </div>
          <Button
            onClick={handleSetDate}
            disabled={saving || !draftDate}
            className="h-12 w-full bg-blue-500 hover:bg-blue-400 text-base font-bold uppercase tracking-wider"
            data-testid="simulate-date-save"
          >
            {saving ? "Speichere…" : "Datum übernehmen"}
          </Button>
        </div>

        {/* Live / Reset Aktionen */}
        <div className="mt-3 space-y-2 border-t border-blue-400/10 pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={saving || isLive}
                className="h-12 w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 text-base font-bold uppercase tracking-wider disabled:opacity-40"
                data-testid="simulate-date-live-btn"
              >
                Live-Betrieb aktivieren
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="border-emerald-400/40 bg-[#0c1430] text-blue-50"
              data-testid="simulate-date-live-confirm"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-emerald-200">
                  Auf Live-Daten umstellen?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-blue-200">
                  Das Dashboard verwendet ab sofort die echte aktuelle Uhrzeit
                  und das echte Datum und bezieht alle Spiele, Tabellen und
                  Ergebnisse live von der Football-API.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="bg-transparent text-blue-200 hover:bg-white/5"
                  data-testid="simulate-date-live-cancel"
                >
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleGoLive}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  data-testid="simulate-date-live-confirm-btn"
                >
                  Ja, umschalten
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isRuntimeOverride && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
              className="h-12 w-full border-blue-400/30 bg-transparent text-blue-100 hover:bg-white/5"
              data-testid="simulate-date-reset"
            >
              Override entfernen (.env-Fallback)
            </Button>
          )}
        </div>
      </section>

      {/* --- QA Section --- */}
      <section
        className="rounded-2xl border border-amber-400/20 bg-[#0c1430] p-5"
        data-testid="setup-qa"
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
          QA-Schnellaktion
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">
          Goal-Animation testen
        </h3>
        <p className="mt-1 text-sm text-blue-300/70">
          Löst auf allen aktiven TVs die „GOOOAL!"-Animation aus.
        </p>
        <Button
          onClick={handleGoalTest}
          className="mt-4 h-12 w-full border border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 text-base font-bold uppercase tracking-wider"
          data-testid="goal-test-trigger"
        >
          ⚽ Goal-Animation triggern
        </Button>
      </section>

      {/* --- Auth Section --- */}
      <section
        className="rounded-2xl border border-blue-400/20 bg-[#0c1430] p-5"
        data-testid="setup-auth"
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/70">
          Anmeldung
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Regie-Sitzung</h3>
        <p className="mt-1 text-sm text-blue-300/70">
          Du bist eingeloggt. Token ist 7 Tage gültig.
        </p>
        <Button
          onClick={handleLogout}
          className="mt-4 h-12 w-full bg-rose-500 hover:bg-rose-400 text-base font-bold uppercase tracking-wider"
          data-testid="admin-logout"
        >
          Abmelden
        </Button>
      </section>

      {/* --- System Info Section --- */}
      <section
        className="rounded-2xl border border-blue-400/15 bg-[#0a112a] p-5"
        data-testid="setup-sysinfo"
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/70">
          System-Info
        </p>
        <ul className="mt-3 space-y-2 text-sm text-blue-200">
          <InfoRow k="Broadcast-Stage" v="1920×1080 fix, auto-skaliert" />
          <InfoRow k="API-Polling (Normal)" v="60 s" />
          <InfoRow k="API-Polling (DE-Live)" v="15 s" />
          <InfoRow k="Live-Control" v="SSE-Push + Polling-Fallback" />
          <InfoRow k="Rate-Limit" v="max. 9 Calls / Min." />
        </ul>
      </section>
    </div>
  );
}

function StatusPill({ label, children }) {
  return (
    <div className="rounded-xl border border-blue-400/10 bg-[#080f24] px-2 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-blue-400/70">
        {label}
      </div>
      <div className="mt-1 flex min-h-[20px] items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ k, v }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-blue-400/5 pb-2 last:border-b-0 last:pb-0">
      <span className="text-blue-300/70">{k}</span>
      <span className="text-right text-white">{v}</span>
    </li>
  );
}
