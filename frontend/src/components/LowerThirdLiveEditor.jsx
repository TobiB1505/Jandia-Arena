import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import StudioLowerThird from "./StudioLowerThird";
import { patchLowerThirdPosition } from "../lib/api";

/**
 * Live editor:
 *   – Renders the real dashboard inside an iframe (`?nolt=1` so the dashboard
 *     itself doesn't paint any lower thirds).
 *   – Overlays a 1920x1080 stage on top with draggable StudioLowerThird
 *     elements for every active item assigned to the currently visible
 *     dashboard screen.
 *   – On drop, persists the new pixel coords via PATCH and re-fetches.
 *
 * Coordinates are stored as top-left within the un-scaled 1920x1080 stage.
 * Defaults (null/undefined) fall back to the CSS preset (centered, bottom: 96).
 */
const STAGE_W = 1920;
const STAGE_H = 1080;
const DEFAULT_X = 280; // a comfy left margin
const DEFAULT_Y = STAGE_H - 280; // ~96px above bottom indicator

export default function LowerThirdLiveEditor({
  items,
  meta,
  onPersisted,
  selectedScreen,
  onScreenChange,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const [selectedId, setSelectedId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [draftPositions, setDraftPositions] = useState({}); // id -> {x,y}

  // Recompute the iframe/stage scale to fit the container width
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const s = Math.max(0.2, Math.min(0.9, cw / STAGE_W));
      setScale(s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Items eligible for the currently-previewed screen
  const eligible = useMemo(() => {
    return (items || []).filter(
      (i) =>
        i &&
        i.active &&
        Array.isArray(i.screens) &&
        i.screens.includes(selectedScreen)
    );
  }, [items, selectedScreen]);

  const screenButtons = useMemo(() => meta.screens || [], [meta]);

  // Resolve effective position (draft → saved → default)
  const posOf = (item) => {
    const draft = draftPositions[item.id];
    if (draft) return draft;
    const x = typeof item.position_x === "number" ? item.position_x : DEFAULT_X;
    const y = typeof item.position_y === "number" ? item.position_y : DEFAULT_Y;
    return { x, y };
  };

  // ---- Drag handling ---------------------------------------------------
  const startDrag = (item) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const { x, y } = posOf(item);
    // Offset of pointer inside the element (in stage coords)
    const pointerStageX = (e.clientX - rect.left) / scale;
    const pointerStageY = (e.clientY - rect.top) / scale;
    const grabOffset = { dx: pointerStageX - x, dy: pointerStageY - y };

    setSelectedId(item.id);
    setDragId(item.id);

    // Capture the pointer so subsequent move/up events fire on this element
    // even when the cursor leaves the LT (and crosses over the iframe area).
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) {
      /* not supported */
    }
    const captureTarget = e.currentTarget;

    let lastPos = { x, y };

    const onMove = (ev) => {
      const r = stage.getBoundingClientRect();
      const sx = (ev.clientX - r.left) / scale;
      const sy = (ev.clientY - r.top) / scale;
      const nx = Math.max(0, Math.min(STAGE_W - 50, Math.round(sx - grabOffset.dx)));
      const ny = Math.max(0, Math.min(STAGE_H - 50, Math.round(sy - grabOffset.dy)));
      lastPos = { x: nx, y: ny };
      setDraftPositions((p) => ({ ...p, [item.id]: lastPos }));
    };

    const onUp = async () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        captureTarget?.releasePointerCapture?.(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      setDragId(null);
      // Only persist if the position actually changed
      const original = posOf(item);
      if (lastPos.x === original.x && lastPos.y === original.y) return;
      try {
        await patchLowerThirdPosition(item.id, lastPos.x, lastPos.y);
        toast.success("Position gespeichert");
        await onPersisted?.();
        setDraftPositions((p) => {
          const { [item.id]: _ignored, ...rest } = p;
          return rest;
        });
      } catch (err) {
        toast.error("Position-Speichern fehlgeschlagen: " + err.message);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // Reset position to defaults
  const resetPosition = async (item) => {
    try {
      await patchLowerThirdPosition(item.id, null, null);
      toast.success("Position zurückgesetzt");
      setDraftPositions((p) => {
        const { [item.id]: _, ...rest } = p;
        return rest;
      });
      await onPersisted?.();
    } catch (e) {
      toast.error("Reset fehlgeschlagen: " + e.message);
    }
  };

  // ---- Snap helpers ----------------------------------------------------
  const snapBottomCenter = (item) => {
    const x = Math.round((STAGE_W - 1382) / 2); // approx LT width
    const y = STAGE_H - 256;
    setDraftPositions((p) => ({ ...p, [item.id]: { x, y } }));
    patchLowerThirdPosition(item.id, x, y)
      .then(() => {
        toast.success("Position: unten zentriert");
        onPersisted?.();
        setDraftPositions((p) => {
          const { [item.id]: _, ...rest } = p;
          return rest;
        });
      })
      .catch((e) => toast.error(e.message));
  };

  // Iframe URL points at the same origin / dashboard with the LT overlay
  // suppressed. We append a screen hint via query so the dashboard can land
  // on the chosen screen if needed (not enforced yet – cycle continues
  // normally so the editor reflects the live experience).
  const iframeSrc = `/?nolt=1&screen=${encodeURIComponent(selectedScreen)}`;

  return (
    <div className="space-y-4">
      {/* Screen tabs */}
      <div className="flex flex-wrap gap-2">
        {screenButtons.map((s) => {
          const active = s.id === selectedScreen;
          return (
            <button
              key={s.id}
              onClick={() => onScreenChange?.(s.id)}
              data-testid={`editor-screen-tab-${s.id}`}
              className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
                active
                  ? "border-blue-400 bg-blue-500/20 text-white"
                  : "border-blue-400/20 bg-white/5 text-blue-200 hover:bg-white/10"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Stage container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-blue-400/30 bg-black"
        style={{ aspectRatio: "16 / 9" }}
        data-testid="live-editor-stage"
      >
        {/* 1) Real dashboard iframe */}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="TV Vorschau"
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            pointerEvents: "none",
          }}
        />

        {/* 2) Draggable overlay – same 1920x1080 stage, scaled identically */}
        <div
          ref={stageRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
          }}
          onPointerDown={() => setSelectedId(null)}
        >
          {eligible.length === 0 ? (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-blue-400/30 bg-black/60 px-6 py-4 text-blue-200">
              Keine aktiven Lower Thirds für{" "}
              <strong className="text-white">{screenButtons.find((s) => s.id === selectedScreen)?.label}</strong>.
            </div>
          ) : (
            eligible.map((item) => {
              const pos = posOf(item);
              return (
                <StudioLowerThird
                  key={item.id}
                  label={item.label}
                  title={item.title}
                  subtitle={item.subtitle}
                  variant={item.variant}
                  visible
                  positionX={pos.x}
                  positionY={pos.y}
                  draggable
                  selected={selectedId === item.id || dragId === item.id}
                  onPointerDown={startDrag(item)}
                  testId={`editor-lt-${item.id}`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Selected item toolbar */}
      {selectedId &&
        eligible.find((i) => i.id === selectedId) &&
        (() => {
          const item = eligible.find((i) => i.id === selectedId);
          const pos = posOf(item);
          return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-400/20 bg-[#0a112a] px-4 py-3">
              <div className="text-sm">
                <div className="text-white">
                  Ausgewählt: <strong>{item.title}</strong>
                </div>
                <div className="text-blue-300">
                  Position x={pos.x} px · y={pos.y} px
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => snapBottomCenter(item)}
                  data-testid="snap-bottom-center-btn"
                  className="rounded-md border border-blue-400/30 px-3 py-1.5 text-xs uppercase tracking-widest text-blue-100 hover:bg-white/5"
                >
                  Unten zentrieren
                </button>
                <button
                  onClick={() => resetPosition(item)}
                  data-testid="reset-position-btn"
                  className="rounded-md border border-blue-400/30 px-3 py-1.5 text-xs uppercase tracking-widest text-blue-100 hover:bg-white/5"
                >
                  Auf Standard zurücksetzen
                </button>
              </div>
            </div>
          );
        })()}

      <p className="text-xs text-blue-300/70">
        Tipp: Wähle oben einen Screen, ziehe einen Lower Third auf der Vorschau
        an die gewünschte Position – die Koordinaten werden automatisch
        gespeichert.
      </p>
    </div>
  );
}
