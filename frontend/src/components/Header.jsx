import { useEffect, useState } from "react";

const ROBINSON_LOGO =
  "https://customer-assets.emergentagent.com/job_match-hub-tv/artifacts/mbo5fkxu_channels4_profile.jpg";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Robinson hotel logo – round, with soft glowing ring, flowing into the dark header.
const LogoMark = () => (
  <div
    data-testid="ja-logo"
    aria-label="Robinson · Jandia Arena"
    className="logo-ring relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full"
  >
    <img
      src={ROBINSON_LOGO}
      alt="Robinson"
      className="h-full w-full object-cover"
      draggable={false}
    />
    {/* subtle inner highlight to blend edge */}
    <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/15" />
  </div>
);

export const Header = ({ refreshKey }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const dateStr = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header
      data-testid="ja-header"
      className="relative z-20 flex items-center justify-between px-12 pt-8 pb-4"
    >
      <div className="flex items-center gap-5">
        <LogoMark />
        <div className="flex flex-col leading-none">
          <span
            className="font-display text-4xl tracking-[0.18em] text-white"
            data-testid="ja-title"
          >
            JANDIA ARENA
          </span>
          <span
            className="mt-1 text-sm font-medium uppercase tracking-[0.4em] text-blue-300"
            data-testid="ja-subtitle"
          >
            Public-Viewing-Programm
          </span>
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="text-right">
          <div
            className="font-display text-5xl text-white"
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
        </div>
      </div>

      {/* refresh progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-900/40">
        <div
          key={refreshKey}
          className="refresh-bar h-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500"
        />
      </div>
    </header>
  );
};

export default Header;
