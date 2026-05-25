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
  // Filter to items the admin wired to this screen + active
  const eligible = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const list = items.filter(
      (i) => i && i.active && Array.isArray(i.screens) && i.screens.includes(currentScreen)
    );
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    return list;
  }, [items, currentScreen]);

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  // Reset cycle when the screen changes or eligible list shape changes
  useEffect(() => {
    setIdx(0);
    setVisible(eligible.length > 0);
  }, [currentScreen, eligible.length]);

  useEffect(() => {
    if (eligible.length === 0) return;
    if (eligible.length === 1) {
      // Single item: stay visible the whole time, no cycle
      setVisible(true);
      return;
    }
    const dwell = Math.max(3000, cycleDurationMs);
    const t = setTimeout(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIdx((i) => (i + 1) % eligible.length);
        setVisible(true);
      }, OUT_ANIMATION_MS);
      // cleanup nested timer if effect re-runs
      window.__lt_swap = swap;
    }, dwell);
    return () => {
      clearTimeout(t);
      if (window.__lt_swap) clearTimeout(window.__lt_swap);
    };
  }, [idx, eligible, cycleDurationMs]);

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
      testId="auto-cycle-lower-third"
    />
  );
}
