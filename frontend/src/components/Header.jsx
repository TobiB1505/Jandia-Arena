import { useEffect, useState } from "react";

const LOGO_URL =
  "https://static.prod-images.emergentagent.com/jobs/350ac180-61fb-48e9-b8d9-50ec9465a89d/images/c7a3f778ac2b681eecd128e16c43e7a5c247bd23d9b82da148c421adaef3c543.png";

function pad(n) {
  return n.toString().padStart(2, "0");
}

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
        <img
          src={LOGO_URL}
          alt="Jandia Arena"
          className="h-16 w-16 object-contain drop-shadow-[0_0_20px_rgba(37,99,235,0.6)]"
          data-testid="ja-logo"
        />
        <div className="flex flex-col leading-none">
          <span
            className="font-display text-4xl tracking-[0.18em] text-white"
            data-testid="ja-title"
          >
            JANDIA ARENA
          </span>
          <span className="mt-1 text-sm font-medium uppercase tracking-[0.4em] text-blue-300">
            World Cup · Live TV
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
          <div className="text-xs uppercase tracking-[0.3em] text-blue-300">
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
