import { useEffect, useState } from "react";
import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

const PAGE_SIZE = 6;
const PAGE_MS = 10000; // 10s per page

// Phase → accent color (left bar + text accent)
const PHASE_STYLE = {
  "Gruppenphase":     { bar: "bg-blue-400",   text: "text-blue-300" },
  "Vorrunde":         { bar: "bg-blue-400",   text: "text-blue-300" },
  "Achtelfinale":     { bar: "bg-cyan-400",   text: "text-cyan-300" },
  "Viertelfinale":    { bar: "bg-violet-400", text: "text-violet-300" },
  "Halbfinale":       { bar: "bg-amber-400",  text: "text-amber-300" },
  "Spiel um Platz 3": { bar: "bg-amber-400",  text: "text-amber-300" },
  "Finale":           { bar: "bg-red-500",    text: "text-red-300" },
};

function fmtTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function fmtDayBadge(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = d.toLocaleDateString("de-DE", { weekday: "short" });
  const day = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return { weekday: weekday.replace(".", ""), day };
}

const isGermanMatch = (m) =>
  m.home.code === "DE" || m.away.code === "DE";

const MatchLine = ({ match }) => {
  const isDE = isGermanMatch(match);
  return (
    <div
      data-testid={`schedule-match-${match.id}`}
      className={`grid grid-cols-[58px_minmax(0,1fr)_22px_minmax(0,1fr)] items-center gap-2 rounded-sm border-l-2 py-1.5 pl-2 pr-2 ${
        isDE
          ? "border-amber-400 bg-amber-400/5"
          : "border-transparent"
      }`}
    >
      <span className="font-display text-base text-blue-100 tabular-nums">
        {fmtTime(match.kickoff)}
      </span>
      <div className="flex items-center justify-end gap-1.5 min-w-0">
        <span
          className={`truncate text-right font-display text-sm uppercase tracking-wider ${
            isDE ? "text-amber-200" : "text-white"
          }`}
        >
          {match.home.short}
        </span>
        <Flag code={match.home.code} size={18} />
      </div>
      <span className="text-center text-xs font-bold text-blue-400/70">
        {match.status === "finished" || match.status === "live" || match.status === "halftime"
          ? `${match.home_score ?? ""}:${match.away_score ?? ""}`
          : "vs"}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <Flag code={match.away.code} size={18} />
        <span
          className={`truncate font-display text-sm uppercase tracking-wider ${
            isDE ? "text-amber-200" : "text-white"
          }`}
        >
          {match.away.short}
        </span>
      </div>
    </div>
  );
};

const DayCard = ({ day }) => {
  const { weekday, day: dayNum } = fmtDayBadge(day.date);
  const style = PHASE_STYLE[day.phase] || PHASE_STYLE["Gruppenphase"];
  const hasGerman = day.matches.some(isGermanMatch);

  return (
    <div
      data-testid={`schedule-day-${day.date}`}
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-sm border bg-[#111A3A]/80 p-4 ${
        hasGerman ? "border-amber-400/40" : "border-blue-400/20"
      }`}
    >
      {/* Left phase accent */}
      <span
        className={`absolute left-0 top-0 h-full w-[3px] ${style.bar}`}
        aria-hidden
      />
      {hasGerman && (
        <span
          className="absolute right-3 top-3 rounded-sm bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 ring-1 ring-amber-400/40"
          data-testid="schedule-de-tag"
        >
          🇩🇪 DEUTSCHLAND
        </span>
      )}

      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {weekday}
        </span>
        <span className="font-display text-xl text-blue-300 tabular-nums">
          {dayNum}
        </span>
      </div>
      <div className={`mb-2 text-[10px] font-bold uppercase tracking-[0.3em] ${style.text}`}>
        {day.phase}
      </div>

      <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
        {day.matches.slice(0, 5).map((m) => (
          <MatchLine key={m.id} match={m} />
        ))}
        {day.matches.length > 5 && (
          <div className="pt-1 text-center text-xs text-blue-300/70">
            + {day.matches.length - 5} weitere
          </div>
        )}
      </div>
    </div>
  );
};

export const Schedule = ({ schedule }) => {
  const days = schedule || [];
  const totalPages = Math.max(1, Math.ceil(days.length / PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(
      () => setPage((p) => (p + 1) % totalPages),
      PAGE_MS
    );
    return () => clearInterval(t);
  }, [totalPages]);

  if (days.length === 0) {
    return (
      <ScreenFrame title="Spielplan" testId="screen-schedule">
        <div className="flex h-full items-center justify-center text-3xl text-blue-200">
          Spielplan wird geladen…
        </div>
      </ScreenFrame>
    );
  }

  const start = page * PAGE_SIZE;
  const visible = days.slice(start, start + PAGE_SIZE);

  return (
    <ScreenFrame
      title="Spielplan"
      subtitle={`${days.length} Spieltage · Seite ${page + 1} von ${totalPages} · Deutschland-Spiele in Gold`}
      testId="screen-schedule"
    >
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-4">
        {visible.map((d) => (
          <DayCard key={d.date} day={d} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default Schedule;
