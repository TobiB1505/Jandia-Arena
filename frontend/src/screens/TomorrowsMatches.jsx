import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const Row = ({ match }) => (
  <div
    data-testid={`tomorrow-row-${match.id}`}
    className="grid grid-cols-[130px_220px_1fr_120px_1fr_220px] items-center gap-6 border-b border-blue-400/10 py-5"
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
      <span className="font-display text-3xl text-blue-300">VS</span>
    </div>
    <div className="flex items-center gap-5">
      <Flag code={match.away.code} size={62} />
      <span className="font-display text-3xl uppercase tracking-wider text-white">
        {match.away.name}
      </span>
    </div>
    <div className="truncate text-right text-lg text-blue-200/80">
      {match.venue}
    </div>
  </div>
);

export const TomorrowsMatches = ({ matches }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  if (!matches || matches.length === 0) {
    return (
      <ScreenFrame
        title="Tomorrow's Matches"
        subtitle={dateStr}
        testId="screen-tomorrow"
      >
        <div className="flex h-full items-center justify-center text-3xl text-blue-200">
          Noch keine Spiele für morgen geplant.
        </div>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      title="Tomorrow's Matches"
      subtitle={`${matches.length} fixtures · ${dateStr}`}
      testId="screen-tomorrow"
    >
      <div className="h-full overflow-hidden">
        {matches.map((m) => (
          <Row key={m.id} match={m} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default TomorrowsMatches;
