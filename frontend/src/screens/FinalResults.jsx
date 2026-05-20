import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

const ResultRow = ({ match }) => {
  const homeWin = match.home_score > match.away_score;
  const awayWin = match.away_score > match.home_score;
  const draw = match.home_score === match.away_score;

  return (
    <div
      data-testid={`final-row-${match.id}`}
      className="grid grid-cols-[160px_1fr_220px_1fr_160px] items-center gap-6 border-b border-blue-400/10 py-6"
    >
      <div className="text-lg uppercase tracking-[0.3em] text-blue-300">
        {match.stage}
      </div>

      <div
        className={`flex items-center justify-end gap-5 ${
          awayWin || draw ? "opacity-60" : "opacity-100"
        }`}
      >
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.home.name}
        </span>
        <Flag code={match.home.code} size={64} />
      </div>

      <div className="flex items-center justify-center gap-4">
        <span
          data-testid={`final-home-${match.id}`}
          className={`font-display text-6xl tabular-nums ${
            homeWin ? "text-white" : "text-blue-200/70"
          }`}
        >
          {match.home_score}
        </span>
        <span className="font-display text-4xl text-blue-400/70">:</span>
        <span
          data-testid={`final-away-${match.id}`}
          className={`font-display text-6xl tabular-nums ${
            awayWin ? "text-white" : "text-blue-200/70"
          }`}
        >
          {match.away_score}
        </span>
      </div>

      <div
        className={`flex items-center gap-5 ${
          homeWin || draw ? "opacity-60" : "opacity-100"
        }`}
      >
        <Flag code={match.away.code} size={64} />
        <span className="font-display text-3xl uppercase tracking-wider text-white">
          {match.away.name}
        </span>
      </div>

      <div className="flex justify-end">
        <span className="rounded-sm bg-blue-500/10 px-3 py-1.5 text-base font-bold uppercase tracking-[0.25em] text-blue-200 ring-1 ring-blue-400/30">
          Endstand
        </span>
      </div>
    </div>
  );
};

export const FinalResults = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return (
      <ScreenFrame title="Endergebnisse" testId="screen-final">
        <div className="flex h-full items-center justify-center text-3xl text-blue-200">
          Noch keine beendeten Spiele heute.
        </div>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      title="Endergebnisse"
      subtitle={`${matches.length} abgeschlossene Spiele`}
      testId="screen-final"
    >
      <div className="h-full overflow-hidden">
        {matches.map((m) => (
          <ResultRow key={m.id} match={m} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default FinalResults;
