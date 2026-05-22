import { useEffect, useState } from "react";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Custom CSS monogram logo – solid dark-blue rounded square, no transparency artifacts.
const LogoMark = () => (
  <div
    data-testid="ja-logo"
    aria-label="Jandia Arena"
    className="relative flex h-16 w-16 items-center justify-center rounded-md bg-gradient-to-br from-[#1E3A8A] to-[#0A1128] shadow-[0_4px_24px_rgba(37,99,235,0.45)] ring-1 ring-blue-300/40"
  >
    {/* inner ring */}
    <span className="absolute inset-1 rounded-sm ring-1 ring-blue-300/25" />
    {/* monogram */}
    <span className="font-display text-3xl leading-none tracking-tight text-white">
      JA
    </span>
    {/* corner accents */}
    <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
    <span className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
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
