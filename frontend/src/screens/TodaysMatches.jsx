import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const StatusPill = ({ status, minute }) => {
  if (status === "live") {
    return (
      <div className="flex items-center gap-2 rounded-sm bg-red-500/15 px-3 py-1.5 ring-1 ring-red-500/40">
        <span className="live-dot h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-base font-bold uppercase tracking-[0.25em] text-red-300">
          {minute}.&nbsp;Min
        </span>
      </div>
    );
  }
  if (status === "finished") {
    return (
      <div className="rounded-sm bg-blue-500/10 px-3 py-1.5 text-base font-bold uppercase tracking-[0.25em] text-blue-200 ring-1 ring-blue-400/30">
        Beendet
      </div>
    );
  }
  return (
    <div className="rounded-sm bg-white/5 px-3 py-1.5 text-base font-bold uppercase tracking-[0.25em] text-blue-100 ring-1 ring-white/15">
      Geplant
    </div>
  );
};

const Row = ({ match }) => {
  return (
    <div
      data-testid={`todays-row-${match.id}`}
      className="grid grid-cols-[120px_1fr_140px_1fr_180px] items-center gap-6 border-b border-blue-400/10 py-5"
    >
      <div className="font-display text-4xl text-blue-200">
        {formatTime(match.kickoff)}
      </div>

      <div className="flex items-center justify-end gap-5">
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.home.name}
        </span>
        <Flag code={match.home.code} size={62} />
      </div>

      <div className="flex items-center justify-center">
        {match.status === "scheduled" ? (
          <span className="font-display text-3xl text-blue-300">VS</span>
        ) : (
          <span className="font-display text-5xl text-white">
            {match.home_score} <span className="text-blue-400">:</span>{" "}
            {match.away_score}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <Flag code={match.away.code} size={62} />
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.away.name}
        </span>
      </div>

      <div className="flex justify-end">
        <StatusPill status={match.status} minute={match.minute} />
      </div>
    </div>
  );
};

export const TodaysMatches = ({ matches }) => {
  return (
    <ScreenFrame
      title="Heute im Stadion"
      subtitle={`${matches.length} Begegnungen · ${new Date().toLocaleDateString(
        "de-DE",
        { weekday: "long", day: "2-digit", month: "long" }
      )}`}
      testId="screen-todays"
    >
      <div className="h-full overflow-hidden">
        {matches.map((m) => (
          <Row key={m.id} match={m} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default TodaysMatches;
