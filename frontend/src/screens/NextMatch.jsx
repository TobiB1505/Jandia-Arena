import { useEffect, useState } from "react";
import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

function diffParts(target) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const total = Math.floor(diff / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { hours, minutes, seconds, total };
}

const Block = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="font-display text-8xl leading-none text-white tabular-nums">
      {value.toString().padStart(2, "0")}
    </span>
    <span className="mt-2 text-base font-bold uppercase tracking-[0.4em] text-blue-300">
      {label}
    </span>
  </div>
);

export const NextMatch = ({ match }) => {
  const [parts, setParts] = useState(
    match ? diffParts(new Date(match.kickoff)) : null
  );

  useEffect(() => {
    if (!match) return;
    const target = new Date(match.kickoff);
    setParts(diffParts(target));
    const t = setInterval(() => setParts(diffParts(target)), 1000);
    return () => clearInterval(t);
  }, [match]);

  if (!match) {
    return (
      <ScreenFrame title="Next Match" testId="screen-next">
        <div className="flex h-full items-center justify-center text-3xl text-blue-200">
          No further matches scheduled.
        </div>
      </ScreenFrame>
    );
  }

  const kickoffStr = new Date(match.kickoff).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ScreenFrame
      title="Next Match"
      subtitle={`${match.stage} · ${match.venue}`}
      testId="screen-next"
    >
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-12">
        {/* Home team */}
        <div className="flex flex-col items-center gap-6">
          <Flag code={match.home.code} size={220} />
          <div className="text-center">
            <div className="font-display text-7xl uppercase tracking-wide text-white">
              {match.home.name}
            </div>
            <div className="mt-2 text-xl uppercase tracking-[0.4em] text-blue-300">
              {match.home.short}
            </div>
          </div>
        </div>

        {/* VS + countdown */}
        <div className="flex flex-col items-center gap-8 px-8">
          <div className="font-display text-9xl text-blue-400/80">VS</div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-xl font-bold uppercase tracking-[0.4em] text-blue-200">
              Kick-off at {kickoffStr}
            </div>
            <div
              data-testid="next-countdown"
              className="flex items-end gap-6 rounded-sm border border-blue-400/30 bg-[#111A3A]/80 px-10 py-6"
            >
              <Block value={parts.hours} label="Hrs" />
              <span className="font-display text-7xl text-blue-400/60">:</span>
              <Block value={parts.minutes} label="Min" />
              <span className="font-display text-7xl text-blue-400/60">:</span>
              <Block value={parts.seconds} label="Sec" />
            </div>
          </div>
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-6">
          <Flag code={match.away.code} size={220} />
          <div className="text-center">
            <div className="font-display text-7xl uppercase tracking-wide text-white">
              {match.away.name}
            </div>
            <div className="mt-2 text-xl uppercase tracking-[0.4em] text-blue-300">
              {match.away.short}
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
};

export default NextMatch;
