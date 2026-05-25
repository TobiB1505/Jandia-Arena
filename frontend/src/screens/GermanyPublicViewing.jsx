import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";
import StatusBadge from "../components/StatusBadge";
import { germanySide } from "../lib/germany";

const TeamBlock = ({ team, accent = false, testId }) => (
  <div className="flex flex-col items-center gap-6" data-testid={testId}>
    <div className={accent ? "ring-2 ring-[#FFCC00]/70 rounded-sm" : ""}>
      <Flag code={team.code} size={240} />
    </div>
    <div className="text-center">
      <div
        className={`font-display text-7xl uppercase leading-none tracking-wide ${
          accent ? "text-white" : "text-white"
        }`}
      >
        {team.name}
      </div>
      <div
        className={`mt-3 text-xl font-bold uppercase tracking-[0.4em] ${
          accent ? "text-[#FFCC00]" : "text-blue-300"
        }`}
      >
        {team.short}
      </div>
    </div>
  </div>
);

export const GermanyPublicViewing = ({ match }) => {
  if (!match) return null;

  const side = germanySide(match);
  const kickoffStr = new Date(match.kickoff).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFinished = match.status === "finished";
  const isLive = match.status === "live" || match.status === "halftime";

  let kickoffLine;
  if (isFinished) {
    kickoffLine = "Heute gespielt";
  } else if (isLive) {
    kickoffLine = `Anpfiff war um ${kickoffStr}`;
  } else {
    kickoffLine = `Anpfiff heute um ${kickoffStr}`;
  }

  const showScore =
    (isFinished || isLive) &&
    typeof match.home_score === "number" &&
    typeof match.away_score === "number";

  return (
    <ScreenFrame
      title="Deutschland Live"
      subtitle="Public Viewing in der Jandia Arena"
      testId="screen-germany"
    >
      <div className="relative flex h-full flex-col">
        {/* Subtle Germany accent stripe along the top of the body */}
        <div className="absolute inset-x-0 -top-4 flex h-1 overflow-hidden rounded-full opacity-70">
          <div className="flex-1 bg-black" />
          <div className="flex-1 bg-[#DD0000]" />
          <div className="flex-1 bg-[#FFCC00]" />
        </div>

        {/* Match showcase */}
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-10 px-4 pt-4"
          data-testid="germany-match"
        >
          <TeamBlock
            team={match.home}
            accent={side === "home"}
            testId="germany-home"
          />

          <div className="flex flex-col items-center gap-6 px-6">
            {showScore ? (
              <div
                className="flex items-center gap-8 font-display text-[9rem] leading-none text-white tabular-nums"
                data-testid="germany-score"
              >
                <span>{match.home_score}</span>
                <span className="text-blue-400/50">:</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="font-display text-[9rem] leading-none text-blue-400/80">
                VS
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <StatusBadge
                status={match.status}
                minute={match.minute}
                testId="germany-status"
              />
              <div className="text-2xl font-bold uppercase tracking-[0.35em] text-blue-100">
                {kickoffLine}
              </div>
              <div className="text-base uppercase tracking-[0.4em] text-blue-300/80">
                {match.stage} · {match.venue}
              </div>
            </div>
          </div>

          <TeamBlock
            team={match.away}
            accent={side === "away"}
            testId="germany-away"
          />
        </div>

        {/* Promo / CTA block */}
        <div className="mt-auto pt-10">
          <div
            className="relative overflow-hidden rounded-sm border border-blue-400/30 bg-gradient-to-r from-[#0F1B45]/90 via-[#142566]/85 to-[#0F1B45]/90 px-10 py-7 shadow-[0_0_60px_rgba(56,89,189,0.25)]"
            data-testid="germany-promo"
          >
            {/* Side accent bar (Germany flag, very subtle) */}
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-black via-[#DD0000] to-[#FFCC00]" />

            <div className="flex items-center justify-between gap-12 pl-6">
              <div className="flex-1">
                <p className="font-display text-4xl uppercase leading-tight tracking-wide text-white">
                  Erlebe das Spiel gemeinsam mit uns auf der grossen Leinwand.
                </p>
                <p className="mt-3 text-2xl text-blue-200">
                  Komm vorbei und sichere dir deinen Platz.
                </p>
              </div>

              <div className="hidden h-20 w-px shrink-0 bg-blue-400/30 md:block" />

              <div className="text-right">
                <div className="font-display text-3xl uppercase tracking-[0.25em] text-white">
                  Jandia Arena
                </div>
                <div className="mt-1 text-base uppercase tracking-[0.45em] text-blue-300">
                  Robinson Jandia Playa
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
};

export default GermanyPublicViewing;
