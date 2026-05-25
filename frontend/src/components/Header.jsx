import { useEffect, useState } from "react";
import LastUpdated from "./LastUpdated";
import HeaderLowerThirdCycle from "./HeaderLowerThirdCycle";

const ROBINSON_LOGO =
  "https://customer-assets.emergentagent.com/job_match-hub-tv/artifacts/mbo5fkxu_channels4_profile.jpg";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Robinson hotel logo – round, with soft glowing ring. Clickable: toggles fullscreen.
const LogoMark = ({ onClick, isFullscreen }) => (
  <button
    type="button"
    data-testid="ja-logo"
    onClick={onClick}
    aria-label={isFullscreen ? "Vollbild beenden" : "Vollbild aktivieren"}
    title={isFullscreen ? "Vollbild beenden" : "Vollbild aktivieren"}
    className="logo-ring group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-0 p-0 outline-none focus:ring-2 focus:ring-blue-300/50"
  >
    <img
      src={ROBINSON_LOGO}
      alt="Robinson"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      draggable={false}
    />
    {/* subtle inner highlight to blend edge */}
    <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/15" />
  </button>
);

export const Header = ({
  refreshKey,
  slideDurationMs,
  onLogoClick,
  isFullscreen,
  lastUpdatedAt,
  referenceDate,
  lowerThirds,
  ltCycleMs,
  currentScreen,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  // Use simulated reference date if provided, otherwise real today
  const displayDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : now;
  const dateStr = displayDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header
      data-testid="ja-header"
      className="relative z-20 flex items-center justify-between px-12 pt-7 pb-5"
    >
      <div className="flex items-center gap-6">
        <LogoMark onClick={onLogoClick} isFullscreen={isFullscreen} />
        <div className="flex flex-col leading-none">
          <span
            className="relative inline-block font-display text-4xl tracking-[0.18em] text-white"
            data-testid="ja-title"
          >
            JANDIA ARENA
            {/* Robinson blue brand underline */}
            <span
              aria-hidden
              className="absolute -bottom-2 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[#0E47BA] via-[#3B82F6] to-transparent"
            />
          </span>
        </div>
      </div>

      {/* Header ticker – cycles admin-driven banners */}
      <div className="mx-12 flex flex-1 items-center justify-center">
        <HeaderLowerThirdCycle
          items={lowerThirds}
          currentScreen={currentScreen}
          cycleDurationMs={ltCycleMs}
        />
      </div>

      <div className="flex items-center gap-10">
        <div className="flex flex-col items-end gap-0.5">
          <div
            className="font-display text-5xl leading-none text-white"
            data-testid="ja-clock"
          >
            {time}
          </div>
          <div
            className="text-xs uppercase tracking-[0.3em] text-blue-300"
            data-testid="ja-date"
          >
            {dateStr}
          </div>
          <div className="mt-0.5 min-w-[340px]">
            <LastUpdated timestamp={lastUpdatedAt} />
          </div>
        </div>
      </div>

      {/* slide progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-900/40">
        <div
          key={refreshKey}
          className="refresh-bar h-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500"
          style={{ animationDuration: `${(slideDurationMs || 15000) / 1000}s` }}
        />
      </div>
    </header>
  );
};

export default Header;
