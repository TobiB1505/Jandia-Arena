import { useEffect, useState } from "react";

function format(ts) {
  if (!ts) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 5) return "gerade eben";
  if (diffSec < 60) return `vor ${diffSec} s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  return `vor ${h} Std`;
}

/** Tiny, dezent indicator: "Aktualisiert · vor 12 s" */
export const LastUpdated = ({ timestamp }) => {
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      data-testid="last-updated"
      className="flex items-center gap-2 pr-3 text-[10px] uppercase tracking-[0.25em] text-blue-300/55"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
      <span>{format(timestamp)}</span>
    </div>
  );
};

export default LastUpdated;
