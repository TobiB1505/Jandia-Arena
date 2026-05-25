import { useEffect, useMemo, useState } from "react";
import HeaderLowerThird from "./HeaderLowerThird";

/**
 * Slim header-slot cycle. Filters incoming items by slot=="header" and the
 * currently visible dashboard screen, then auto-cycles through them with the
 * configured dwell time. Same swap pattern as LowerThirdAutoCycle.
 */
const OUT_ANIMATION_MS = 400; // matches hlt-out keyframes

export default function HeaderLowerThirdCycle({
  items,
  currentScreen,
  cycleDurationMs = 25000,
}) {
  const eligible = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const list = items.filter(
      (i) =>
        i &&
        i.active &&
        (i.slot || "header") === "header" &&
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

  useEffect(() => {
    setIdx(0);
    setVisible(eligible.length > 0);
  }, [currentScreen, eligibleKey, eligible.length]);

  useEffect(() => {
    if (eligible.length === 0) return;
    if (eligible.length === 1) {
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
    <HeaderLowerThird
      key={item.id}
      label={item.label}
      title={item.title}
      subtitle={item.subtitle}
      variant={item.variant}
      visible={visible}
      testId="header-cycle-lower-third"
    />
  );
}
