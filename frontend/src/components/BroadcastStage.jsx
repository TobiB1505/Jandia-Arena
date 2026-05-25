import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * 16:9 TV broadcast stage.
 *
 * Renders children inside a fixed 1920x1080 canvas, then scales the canvas
 * uniformly to fit the available viewport while preserving the 16:9 ratio.
 * The dashboard never has to know about viewport sizes – it always paints
 * onto a 1920x1080 surface.
 *
 * Query parameters
 *   ?debug=tv   → shows a small overlay with viewport size + scale + fs state
 *   ?safe=1     → applies a 24px safe-area inset for TVs with overscan
 *
 * Imperative API (via ref)
 *   enterFullscreen()  → request/exit fullscreen on the stage wrapper
 *   isFullscreen()
 */
const BASE_W = 1920;
const BASE_H = 1080;

export const BroadcastStage = forwardRef(({ children }, ref) => {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const [isFs, setIsFs] = useState(false);

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const debug = params.get("debug") === "tv";
  const safe = params.get("safe") === "1" ? 24 : 0;

  useEffect(() => {
    const measure = () => {
      const w = Math.max(0, window.innerWidth - safe * 2);
      const h = Math.max(0, window.innerHeight - safe * 2);
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      setScale(Math.min(w / BASE_W, h / BASE_H));
    };

    measure();
    window.addEventListener("resize", measure);

    const onFs = () => {
      setIsFs(!!document.fullscreenElement);
      // Re-measure on the next paint – fullscreen changes viewport sync timing
      requestAnimationFrame(measure);
    };
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [safe]);

  useImperativeHandle(ref, () => ({
    enterFullscreen: () => {
      const el = wrapperRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    },
    isFullscreen: () => !!document.fullscreenElement,
  }));

  return (
    <div
      ref={wrapperRef}
      data-testid="tv-viewport"
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black"
      style={{ padding: safe }}
    >
      <div
        data-testid="tv-stage"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>

      {debug && (
        <div
          data-testid="tv-debug"
          className="pointer-events-none fixed bottom-3 right-3 z-50 rounded-sm bg-black/70 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 ring-1 ring-emerald-500/40"
        >
          vw={vw} · vh={vh} · scale={scale.toFixed(3)} · fs={isFs ? "1" : "0"} · safe={safe}
        </div>
      )}
    </div>
  );
});

BroadcastStage.displayName = "BroadcastStage";

export default BroadcastStage;
