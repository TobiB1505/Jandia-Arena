import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";
import StatusBadge from "../components/StatusBadge";

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const Row = ({ match }) => {
  const showScore =
    match.status === "live" ||
    match.status === "halftime" ||
    match.status === "finished";

  return (
    <div
      data-testid={`todays-row-${match.id}`}
      className="grid grid-cols-[130px_180px_1fr_160px_1fr_200px] items-center gap-6 border-b border-blue-400/10 py-5"
    >
      <div className="font-display text-4xl text-blue-200 tabular-nums">
        {formatTime(match.kickoff)}
      </div>

      <div className="text-base font-bold uppercase tracking-[0.3em] text-blue-300">
        {match.stage}
      </div>

      <div className="flex items-center justify-end gap-5">
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.home.name}
        </span>
        <Flag code={match.home.code} size={62} />
      </div>

      <div className="flex items-center justify-center">
        {showScore ? (
          <span className="font-display text-5xl text-white tabular-nums">
            {match.home_score} <span className="text-blue-400">:</span>{" "}
            {match.away_score}
          </span>
        ) : (
          <span className="font-display text-3xl text-blue-300">VS</span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <Flag code={match.away.code} size={62} />
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.away.name}
        </span>
      </div>

      <div className="flex justify-end">
        <StatusBadge
          status={match.status}
          minute={match.minute}
          testId={`todays-status-${match.id}`}
        />
      </div>
    </div>
  );
};

export const TodaysMatches = ({ matches }) => {
  const todayStr = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <ScreenFrame
      title="Today's Matches"
      subtitle={`${matches.length} fixtures · ${todayStr}`}
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
