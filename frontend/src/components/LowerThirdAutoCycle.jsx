import { useEffect, useMemo, useState } from "react";
import StudioLowerThird from "./StudioLowerThird";

/**
 * Auto-cycles through admin-configured Lower Thirds for the currently active
 * screen. Cross-fades by toggling `visible` on the StudioLowerThird so its
 * existing CSS in/out animation runs cleanly between items.
 *
 * Props:
 *  - items: full list of LowerThird records from /api/lower-thirds
 *  - currentScreen: id of the screen currently visible in the rotation
 *  - cycleDurationMs: dwell time per lower-third
 */
const OUT_ANIMATION_MS = 500; // matches studio-lt-out keyframes

export default function LowerThirdAutoCycle({
  items,
  currentScreen,
  cycleDurationMs = 25000,
}) {
  // Filter to items the admin wired to this screen + active + stage slot.
  // Header-slot items are rendered separately by HeaderLowerThirdCycle.
  const eligible = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const list = items.filter(
      (i) =>
        i &&
        i.active &&
        (i.slot || "header") === "stage" &&
        Array.isArray(i.screens) &&
        i.screens.includes(currentScreen)
    );
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    return list;
  }, [items, currentScreen]);

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  // Stable identity – avoids restarting the timer on every parent re-render
  // (e.g. on screen rotation or 60s lowerThirds poll). Without this the
  // cycle never actually reaches its dwell time and looks frozen.
  const eligibleKey = eligible.map((i) => i.id).join("|");

  // Reset cycle when the screen changes or eligible list shape changes
  useEffect(() => {
    setIdx(0);
    setVisible(eligible.length > 0);
  }, [currentScreen, eligibleKey, eligible.length]);

  useEffect(() => {
    if (eligible.length === 0) return;
    if (eligible.length === 1) {
      // Single item: stay visible the whole time, no cycle
      setVisible(true);
      return;
    }
    const dwell = Math.max(3000, cycleDurationMs);
    let swap;
    const t = setTimeout(() => {
      setVisible(false);
      swap = setTimeout(() => {
        setIdx((i) => (i + 1) % eligible.length);
        setVisible(true);
      }, OUT_ANIMATION_MS);
    }, dwell);
    return () => {
      clearTimeout(t);
      if (swap) clearTimeout(swap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, eligibleKey, cycleDurationMs]);

  if (eligible.length === 0) return null;
  const item = eligible[idx] || eligible[0];

  return (
    <StudioLowerThird
      key={item.id}
      label={item.label}
      title={item.title}
      subtitle={item.subtitle}
      variant={item.variant}
      visible={visible}
      positionX={item.position_x ?? null}
      positionY={item.position_y ?? null}
      testId="auto-cycle-lower-third"
    />
  );
}
