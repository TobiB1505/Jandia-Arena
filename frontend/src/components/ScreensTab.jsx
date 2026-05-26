import { useState } from "react";
import { toast } from "sonner";
import { controlShow, controlPin, controlUnpin } from "../lib/api";
import useControlState from "../lib/useControlState";

// These mirror SCREEN_DURATION_MS in Dashboard.jsx. Duration editing is
// currently informational only – persisting per-screen overrides is a
// future enhancement; this tab exposes the live actions.
const SCREENS = [
  { id: "today",    label: "Heute",            duration: 15 },
  { id: "next",     label: "Nächstes Spiel",   duration: 15 },
  { id: "germany",  label: "Deutschland Live", duration: 23 },
  { id: "tomorrow", label: "Morgen",           duration: 15 },
  { id: "schedule", label: "Spielplan",        duration: 22 },
  { id: "groups",   label: "Gruppen",          duration: 45 },
  { id: "experts",  label: "Experten",         duration: 20 },
];

export default function ScreensTab() {
  const ctrl = useControlState();
  const [busy, setBusy] = useState(false);

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

  const pinnedId = ctrl?.pinned_screen || null;

  return (
    <div className="space-y-3" data-testid="screens-tab">
      <p className="text-sm text-blue-300/70">
        Reihenfolge und Dauer der Screens. Anpinnen blockiert die Rotation auf einem Screen.
      </p>
      {SCREENS.map((s, i) => (
        <div
          key={s.id}
          className={`rounded-2xl border bg-[#0c1430] p-4 ${
            pinnedId === s.id ? "border-amber-400/50" : "border-blue-400/15"
          }`}
          data-testid={`screen-row-${s.id}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-sm font-bold text-blue-200">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">
                  {s.label}
                </div>
                <div className="text-xs text-blue-300/70">
                  Dauer: {s.duration} s
                  {pinnedId === s.id && (
                    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                      Angepinnt
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => wrap(() => controlShow(s.id), `${s.label} wird angezeigt`)}
              className="min-h-[44px] rounded-lg bg-blue-500 px-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-blue-400"
              data-testid={`screen-${s.id}-show`}
            >
              Anzeigen
            </button>
            {pinnedId === s.id ? (
              <button
                onClick={() => wrap(controlUnpin, "Pin gelöst")}
                className="min-h-[44px] rounded-lg bg-rose-500 px-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-rose-400"
                data-testid={`screen-${s.id}-unpin`}
              >
                Pin lösen
              </button>
            ) : (
              <button
                onClick={() => wrap(() => controlPin(s.id), `${s.label} angepinnt`)}
                className="min-h-[44px] rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 text-sm font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-500/20"
                data-testid={`screen-${s.id}-pin`}
              >
                Pinnen
              </button>
            )}
            <a
              href={`/?screen=${s.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-blue-400/30 bg-transparent px-3 text-sm font-bold uppercase tracking-wider text-blue-200 hover:bg-white/5"
              data-testid={`screen-${s.id}-preview`}
            >
              Test
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
