import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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

const SOURCE_LABELS = {
  env: "Standardwert aus .env (Fallback)",
  live: "Live-Betrieb (kein Override)",
  runtime_live: "Live-Betrieb (Admin-Override)",
  runtime_simulated: "Simuliertes Datum (Admin-Override)",
};

export default function SimulateDateAdmin() {
  const [state, setState] = useState(null);
  const [draftDate, setDraftDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await fetchSimulateDate();
      setState(data);
      // Pre-fill the input with the effective date when simulated
      if (data.effective_date) {
        setDraftDate(data.effective_date);
      }
    } catch (e) {
      console.error(e);
      toast.error("Konnte Simulationseinstellung nicht laden.");
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
      if (data.error) {
        toast.error("Ungültiges Datum (Format YYYY-MM-DD).");
      } else {
        setState(data);
        toast.success(`Simuliertes Datum gesetzt: ${data.effective_date}`);
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
      toast.success("Live-Betrieb aktiviert – echte Daten werden angezeigt.");
    } catch (e) {
      console.error(e);
      toast.error("Umschalten in Live-Betrieb fehlgeschlagen.");
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
      toast.success("Override entfernt – Fallback auf .env-Standard.");
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
      toast.success("Goal-Animation wird auf allen TVs ausgelöst.");
    } catch (e) {
      console.error(e);
      toast.error("Trigger fehlgeschlagen.");
    }
  };

  const isLive = !!state?.live;
  const isRuntimeOverride =
    state?.source === "runtime_live" || state?.source === "runtime_simulated";

  return (
    <Card className="border-blue-400/20 bg-[#0c1430]" data-testid="simulate-date-admin">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-100">
          <span>Daten-Modus · Simuliertes Datum</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              isLive
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-200"
            }`}
            data-testid="simulate-date-status-badge"
          >
            {isLive ? "Live-Betrieb" : "Simulation aktiv"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {state && (
            <div className="rounded-md border border-blue-400/20 bg-[#080f24] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-blue-200">
                <span>
                  <span className="text-blue-400/70">Aktuell verwendet: </span>
                  <span
                    className="font-mono text-white"
                    data-testid="simulate-date-effective"
                  >
                    {state.live ? "ECHTZEIT" : state.effective_date}
                  </span>
                </span>
                <span>
                  <span className="text-blue-400/70">Quelle: </span>
                  <span className="text-white">
                    {SOURCE_LABELS[state.source] || state.source}
                  </span>
                </span>
                {state.env_value && (
                  <span>
                    <span className="text-blue-400/70">.env-Standard: </span>
                    <span className="font-mono text-blue-100">
                      {state.env_value}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-blue-200">Simuliertes Datum (YYYY-MM-DD)</Label>
              <Input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="mt-2 bg-[#0a112a] text-white"
                data-testid="simulate-date-input"
              />
              <p className="mt-1 text-xs text-blue-300/70">
                Verankert das Dashboard auf diesem Datum. Uhrzeit läuft real weiter.
              </p>
            </div>
            <Button
              onClick={handleSetDate}
              disabled={saving || !draftDate}
              className="bg-blue-500 hover:bg-blue-400"
              data-testid="simulate-date-save"
            >
              {saving ? "Speichere…" : "Datum übernehmen"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-blue-400/10 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  disabled={saving || isLive}
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
                    Du bist dabei, den Live-Betrieb zu aktivieren. Das Dashboard
                    verwendet ab sofort die <strong>echte aktuelle Uhrzeit und
                    das echte Datum</strong> und bezieht alle Spiele,
                    Tabellen und Ergebnisse <strong>live von der Football-API</strong>.
                    Die aktuell simulierte WM-Ansicht wird beendet.
                    <br /><br />
                    Diese Umstellung gilt sofort für alle TVs und wird in der
                    Datenbank gespeichert, bis du sie wieder änderst.
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
                    Ja, auf Live umschalten
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {isRuntimeOverride && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="border-blue-400/30 bg-transparent text-blue-100 hover:bg-white/5"
                data-testid="simulate-date-reset"
              >
                Override entfernen (Fallback .env)
              </Button>
            )}

            <div className="ml-auto flex items-center gap-3 border-l border-blue-400/10 pl-4">
              <span className="text-xs uppercase tracking-widest text-blue-300/60">
                QA
              </span>
              <Button
                variant="outline"
                onClick={handleGoalTest}
                className="border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                data-testid="goal-test-trigger"
              >
                Goal-Animation testen
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
