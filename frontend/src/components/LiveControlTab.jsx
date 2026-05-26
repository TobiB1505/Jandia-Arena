import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  controlPause,
  controlResume,
  controlNext,
  controlPrev,
  controlShow,
  controlPin,
  controlUnpin,
  controlReload,
  controlOverlays,
  triggerGoalTest,
  fetchAllMatches,
  fetchSimulateDate,
} from "../lib/api";
import useControlState from "../lib/useControlState";
import { getTodayGermanyMatch } from "../lib/germany";

const SCREEN_DEFS = [
  { id: "today",     label: "Heute" },
  { id: "next",      label: "Nächstes Spiel" },
  { id: "germany",   label: "Deutschland Live", requiresGermanyMatch: true },
  { id: "tomorrow",  label: "Morgen" },
  { id: "schedule",  label: "Spielplan" },
  { id: "groups",    label: "Gruppen" },
  { id: "experts",   label: "Experten" },
];

const SCREEN_LABEL_BY_ID = Object.fromEntries(SCREEN_DEFS.map((s) => [s.id, s.label]));

export default function LiveControlTab() {
  const ctrl = useControlState();
  const [busy, setBusy] = useState(false);
  const [germanyAvailable, setGermanyAvailable] = useState(false);
  const [dateMode, setDateMode] = useState(null);

  // Periodically refresh the auxiliary data (matches list + date mode).
  // Control state itself is pushed over WS by useControlState.
  useEffect(() => {
    const refreshAux = async () => {
      try {
        const [matches, dm] = await Promise.all([
          fetchAllMatches().catch(() => []),
          fetchSimulateDate().catch(() => null),
        ]);
        const gMatch = getTodayGermanyMatch(matches || [], dm?.effective_date || null);
        setGermanyAvailable(!!gMatch && gMatch.status !== "finished");
        setDateMode(dm);
      } catch (e) {
        console.error(e);
      }
    };
    refreshAux();
    const t = setInterval(refreshAux, 15000);
    return () => clearInterval(t);
  }, []);

  const wrap = async (action, msg) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      if (msg) toast.success(msg);
    } catch (e) {
      console.error(e);
      toast.error("Aktion fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  if (!ctrl) {
    return (
      <div className="rounded-2xl border border-blue-400/15 bg-[#0c1430] p-6 text-blue-200">
        Lade Live-Status…
      </div>
    );
  }

  const isPaused    = !!ctrl.rotation_paused;
  const isPinned    = !!ctrl.pinned_screen;
  const overlaysHidden = !!ctrl.hide_overlays;
  const liveDate = dateMode?.live;

  return (
    <div className="space-y-5" data-testid="live-control-tab">
      {/* Status hero */}
      <section className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0c1430] to-[#0a112a] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/70">TV-Status</p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {SCREEN_LABEL_BY_ID[ctrl.pinned_screen] ||
                (isPinned ? ctrl.pinned_screen : "Rotation läuft")}
            </h2>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
              isPaused
                ? "bg-amber-500/20 text-amber-200"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
            data-testid="live-status-badge"
          >
            {isPaused ? "Pausiert" : "LIVE"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <StatusPill label="Datum">
            <span className="font-mono text-white">
              {liveDate ? "ECHTZEIT" : (dateMode?.effective_date || "—")}
            </span>
          </StatusPill>
          <StatusPill label="Pin">
            {isPinned ? (
              <span className="text-amber-200">{SCREEN_LABEL_BY_ID[ctrl.pinned_screen] || ctrl.pinned_screen}</span>
            ) : (
              <span className="text-blue-300/70">—</span>
            )}
          </StatusPill>
          <StatusPill label="Overlays">
            {overlaysHidden ? (
              <span className="text-rose-300">Versteckt</span>
            ) : (
              <span className="text-emerald-300">Sichtbar</span>
            )}
          </StatusPill>
          <StatusPill label="Update">
            <span className="text-blue-100">
              {ctrl.updated_at ? new Date(ctrl.updated_at).toLocaleTimeString("de-DE") : "—"}
            </span>
          </StatusPill>
        </div>
      </section>

      {/* Primary remote */}
      <section className="space-y-3">
        <SectionTitle>Rotation</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {isPaused ? (
            <BigButton
              tone="emerald"
              onClick={() => wrap(controlResume, "Rotation fortgesetzt")}
              testId="ctrl-resume"
              full
            >
              ▶ Fortsetzen
            </BigButton>
          ) : (
            <BigButton
              tone="amber"
              onClick={() => wrap(controlPause, "Rotation pausiert")}
              testId="ctrl-pause"
              full
            >
              ❚❚ Pausieren
            </BigButton>
          )}
          <BigButton tone="blue" onClick={() => wrap(controlPrev,  "Vorheriger Screen")} testId="ctrl-prev">‹ Vorheriger</BigButton>
          <BigButton tone="blue" onClick={() => wrap(controlNext,  "Nächster Screen")}   testId="ctrl-next">Nächster ›</BigButton>
        </div>
      </section>

      {/* Direct screen jump */}
      <section className="space-y-3">
        <SectionTitle>Direkt anzeigen</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {SCREEN_DEFS.map((s) => {
            const disabled = s.requiresGermanyMatch && !germanyAvailable;
            return (
              <ScreenButton
                key={s.id}
                label={s.label}
                disabled={disabled}
                disabledHint="Heute nicht verfügbar"
                pinned={ctrl.pinned_screen === s.id}
                onShow={() => wrap(() => controlShow(s.id), `${s.label} wird angezeigt`)}
                onPin={() => wrap(() => controlPin(s.id), `${s.label} angepinnt`)}
                testId={`screen-${s.id}`}
              />
            );
          })}
        </div>
      </section>

      {/* Pin/overlay controls */}
      <section className="space-y-3">
        <SectionTitle>Steuerung</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {isPinned && (
            <BigButton tone="rose" onClick={() => wrap(controlUnpin, "Pin gelöst")} testId="ctrl-unpin" full>
              📌 Pin lösen
            </BigButton>
          )}
          <BigButton
            tone={overlaysHidden ? "emerald" : "slate"}
            onClick={() => wrap(() => controlOverlays(!overlaysHidden), overlaysHidden ? "Overlays sichtbar" : "Overlays ausgeblendet")}
            testId="ctrl-overlays"
            full={!isPinned}
          >
            {overlaysHidden ? "Overlays einblenden" : "Overlays ausblenden"}
          </BigButton>
          <BigButton tone="slate" onClick={() => wrap(controlReload, "TV wird neu geladen")} testId="ctrl-reload">
            ⟳ TV neu laden
          </BigButton>
          <BigButton tone="amber" onClick={() => wrap(triggerGoalTest, "Goal-Animation getriggert")} testId="ctrl-goal">
            ⚽ Goal-Test
          </BigButton>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-300/60">
      {children}
    </h3>
  );
}

function StatusPill({ label, children }) {
  return (
    <div className="rounded-xl border border-blue-400/10 bg-[#080f24] px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-blue-400/60">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{children}</div>
    </div>
  );
}

const TONE_CLASSES = {
  blue:    "bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white",
  emerald: "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-950",
  amber:   "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950",
  rose:    "bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white",
  slate:   "bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white",
};

function BigButton({ tone = "blue", onClick, children, testId, full = false }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`min-h-[52px] rounded-xl px-4 py-3 text-base font-semibold uppercase tracking-wider shadow active:scale-[0.98] transition ${TONE_CLASSES[tone]} ${full ? "col-span-2" : ""}`}
    >
      {children}
    </button>
  );
}

function ScreenButton({ label, disabled, disabledHint, pinned, onShow, onPin, testId }) {
  return (
    <div
      data-testid={testId}
      className={`relative flex flex-col gap-2 rounded-xl border bg-[#0a112a] p-3 ${
        pinned ? "border-amber-400/60 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]" : "border-blue-400/15"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white text-sm">{label}</span>
        {pinned && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
            Pin
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={disabled}
          onClick={onShow}
          data-testid={`${testId}-show`}
          className="min-h-[40px] rounded-lg bg-blue-500/90 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Anzeigen
        </button>
        <button
          disabled={disabled}
          onClick={onPin}
          data-testid={`${testId}-pin`}
          className="min-h-[40px] rounded-lg border border-amber-400/40 bg-amber-500/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Pinnen
        </button>
      </div>
      {disabled && (
        <p className="text-[10px] text-rose-300/80">{disabledHint}</p>
      )}
    </div>
  );
}
