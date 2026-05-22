import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

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

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDayBadge(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = d.toLocaleDateString("de-DE", { weekday: "short" });
  const day = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return { weekday: weekday.replace(".", ""), day };
}

const isGermanMatch = (m) => m.home.code === "DE" || m.away.code === "DE";

const MatchLine = ({ match }) => {
  const isDE = isGermanMatch(match);
  const showScore =
    match.status === "finished" ||
    match.status === "live" ||
    match.status === "halftime";
  return (
    <div
      data-testid={`schedule-match-${match.id}`}
      className={`flex flex-col gap-1 rounded-sm border-l-2 px-2 py-2 ${
        isDE ? "border-amber-400 bg-amber-400/5" : "border-blue-400/30 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm text-blue-100 tabular-nums">
          {fmtTime(match.kickoff)}
        </span>
        {showScore && (
          <span className="font-display text-sm text-white tabular-nums">
            {match.home_score}:{match.away_score}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Flag code={match.home.code} size={18} />
        <span
          className={`truncate font-display text-sm uppercase tracking-wider ${
            isDE ? "text-amber-200" : "text-white"
          }`}
        >
          {match.home.short}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
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

const DayColumn = ({ day, isToday, dateStr }) => {
  const data = day || { date: dateStr, phase: "", matches: [] };
  const { weekday, day: dayNum } = fmtDayBadge(data.date);
  const style = PHASE_STYLE[data.phase] || PHASE_STYLE["Gruppenphase"];
  const hasGerman = data.matches.some(isGermanMatch);

  return (
    <div
      data-testid={`week-day-${data.date}`}
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-sm border bg-[#111A3A]/80 p-3 ${
        hasGerman
          ? "border-amber-400/50"
          : isToday
          ? "border-blue-300/60"
          : "border-blue-400/20"
      }`}
    >
      {/* Left phase accent */}
      {data.matches.length > 0 && (
        <span
          className={`absolute left-0 top-0 h-full w-[3px] ${style.bar}`}
          aria-hidden
        />
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex flex-col leading-none">
          <span className="font-display text-2xl uppercase tracking-wider text-white">
            {weekday}
          </span>
          <span className="mt-1 font-display text-base text-blue-300 tabular-nums">
            {dayNum}
          </span>
        </div>
        {isToday && (
          <span className="rounded-sm bg-blue-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-blue-200 ring-1 ring-blue-300/40">
            Heute
          </span>
        )}
        {hasGerman && !isToday && (
          <span className="rounded-sm bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300 ring-1 ring-amber-400/40">
            🇩🇪
          </span>
        )}
      </div>

      {data.matches.length > 0 && (
        <div className={`mb-2 text-[9px] font-bold uppercase tracking-[0.25em] ${style.text}`}>
          {data.phase}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        {data.matches.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs uppercase tracking-[0.25em] text-blue-300/30">
            Spielfrei
          </div>
        ) : (
          data.matches.slice(0, 4).map((m) => <MatchLine key={m.id} match={m} />)
        )}
        {data.matches.length > 4 && (
          <div className="text-center text-[10px] text-blue-300/60">
            +{data.matches.length - 4} weitere
          </div>
        )}
      </div>
    </div>
  );
};

export const Schedule = ({ schedule }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a map of date → schedule entry (only API data we already fetched)
  const byDate = new Map();
  (schedule || []).forEach((d) => byDate.set(d.date, d));

  // Always render exactly 7 columns: today + next 6 days
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const ds = isoDate(d);
    days.push({ dateStr: ds, isToday: i === 0, data: byDate.get(ds) || null });
  }

  const fromStr = days[0].dateStr;
  const toStr = days[6].dateStr;
  const fromLabel = new Date(`${fromStr}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
  });
  const toLabel = new Date(`${toStr}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
  });

  return (
    <ScreenFrame
      title="Spielplan der Woche"
      subtitle={`${fromLabel} – ${toLabel} · Deutschland-Spiele in Gold`}
      testId="screen-schedule"
    >
      <div className="grid h-full grid-cols-7 gap-3">
        {days.map((d) => (
          <DayColumn
            key={d.dateStr}
            day={d.data}
            isToday={d.isToday}
            dateStr={d.dateStr}
          />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default Schedule;
