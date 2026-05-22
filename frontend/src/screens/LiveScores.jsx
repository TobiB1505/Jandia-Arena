import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";
import StatusBadge from "../components/StatusBadge";

const LiveCard = ({ match }) => (
  <div
    data-testid={`live-card-${match.id}`}
    className="relative flex flex-col justify-between rounded-sm border border-blue-400/25 bg-[#111A3A]/80 p-8"
  >
    <div className="flex items-center justify-between">
      <StatusBadge
        status={match.status}
        minute={match.minute}
        testId={`live-status-${match.id}`}
      />
      <span className="text-base uppercase tracking-[0.3em] text-blue-300">
        {match.stage}
      </span>
    </div>

    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <Flag code={match.home.code} size={120} />
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.home.short}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          data-testid={`live-home-score-${match.id}`}
          className="font-display text-8xl text-white tabular-nums"
        >
          {match.home_score}
        </span>
        <span className="font-display text-6xl text-blue-400/60">:</span>
        <span
          data-testid={`live-away-score-${match.id}`}
          className="font-display text-8xl text-white tabular-nums"
        >
          {match.away_score}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Flag code={match.away.code} size={120} />
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.away.short}
        </span>
      </div>
    </div>

    <div className="mt-6 flex justify-between text-base text-blue-300">
      <span>{match.home.name}</span>
      <span>{match.venue}</span>
      <span>{match.away.name}</span>
    </div>
  </div>
);

export const LiveScores = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return (
      <ScreenFrame
        title="Live-Spielstände"
        subtitle="Aktuell keine laufenden Spiele"
        testId="screen-live"
      >
        <div className="flex h-full items-center justify-center text-3xl text-blue-200">
          Aktuell keine laufenden Spiele.
        </div>
      </ScreenFrame>
    );
  }

  const gridCols =
    matches.length === 1
      ? "grid-cols-1"
      : matches.length === 2
      ? "grid-cols-2"
      : "grid-cols-2 grid-rows-2";

  return (
    <ScreenFrame
      title="Live-Spielstände"
      subtitle={`${matches.length} laufende Begegnungen`}
      testId="screen-live"
    >
      <div className={`grid h-full gap-6 ${gridCols}`}>
        {matches.map((m) => (
          <LiveCard key={m.id} match={m} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default LiveScores;
