import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

const GroupCard = ({ group, compact = false, padClass = "p-6" }) => (
  <div
    data-testid={`group-${group.name.replace(/\s+/g, "-").toLowerCase()}`}
    className={`flex flex-col rounded-sm border border-blue-400/25 bg-[#111A3A]/80 ${padClass}`}
  >
    <div className="mb-3 flex items-center justify-between border-b border-blue-400/20 pb-2">
      <h3
        className={`font-display uppercase tracking-[0.15em] text-white ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {group.name}
      </h3>
      <span className="text-[10px] uppercase tracking-[0.3em] text-blue-300">
        Tabelle
      </span>
    </div>

    {/* Header row */}
    <div
      className={`grid items-center gap-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/80 ${
        compact
          ? "grid-cols-[24px_minmax(0,1fr)_28px_28px_28px_28px_32px_36px]"
          : "grid-cols-[36px_minmax(0,1fr)_repeat(5,40px)_56px]"
      }`}
    >
      <span>#</span>
      <span>Team</span>
      <span className="text-center">SP</span>
      <span className="text-center">S</span>
      <span className="text-center">U</span>
      <span className="text-center">N</span>
      <span className="text-center">TD</span>
      <span className="text-right">PKT</span>
    </div>

    {group.standings.map((s, i) => {
      const qualified = i < 2;
      return (
        <div
          key={`${group.name}-${s.team.short}-${i}`}
          data-testid={`row-${group.name.replace(/\s+/g, "-").toLowerCase()}-${i}`}
          className={`grid items-center gap-1 border-t border-blue-400/10 py-1.5 ${
            compact
              ? "grid-cols-[24px_minmax(0,1fr)_28px_28px_28px_28px_32px_36px]"
              : "grid-cols-[36px_minmax(0,1fr)_repeat(5,40px)_56px] py-2.5"
          } ${qualified ? "text-white" : "text-blue-200/70"}`}
        >
          <span
            className={`font-display ${compact ? "text-sm" : "text-xl"} ${
              qualified ? "text-blue-300" : "text-blue-200/50"
            }`}
          >
            {i + 1}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <Flag code={s.team.code} size={compact ? 22 : 32} />
            <span
              className={`truncate font-display uppercase tracking-wider ${
                compact ? "text-base" : "text-2xl"
              }`}
            >
              {s.team.short}
            </span>
          </div>
          <span
            className={`text-center font-primary tabular-nums ${
              compact ? "text-sm" : "text-xl"
            }`}
          >
            {s.played}
          </span>
          <span
            className={`text-center font-primary tabular-nums ${
              compact ? "text-sm" : "text-xl"
            }`}
          >
            {s.wins}
          </span>
          <span
            className={`text-center font-primary tabular-nums ${
              compact ? "text-sm" : "text-xl"
            }`}
          >
            {s.draws}
          </span>
          <span
            className={`text-center font-primary tabular-nums ${
              compact ? "text-sm" : "text-xl"
            }`}
          >
            {s.losses}
          </span>
          <span
            className={`text-center font-primary tabular-nums ${
              compact ? "text-sm" : "text-xl"
            }`}
          >
            {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
          </span>
          <span
            className={`text-right font-display tabular-nums ${
              compact ? "text-base" : "text-2xl"
            }`}
          >
            {s.points}
          </span>
        </div>
      );
    })}
  </div>
);

export const GroupTables = ({ groups }) => {
  if (!groups || groups.length === 0) {
    return (
      <ScreenFrame title="Gruppentabellen" testId="screen-groups">
        <div className="flex h-full items-center justify-center text-3xl text-blue-200">
          Keine Tabellen verfügbar.
        </div>
      </ScreenFrame>
    );
  }

  const count = groups.length;
  const gridClasses =
    count <= 4
      ? "grid h-full grid-cols-2 grid-rows-2 gap-6"
      : "grid h-full grid-cols-4 grid-rows-2 gap-4";
  const padClass = count <= 4 ? "p-6" : "p-4";

  return (
    <ScreenFrame
      title="Gruppentabellen"
      subtitle="Top 2 ziehen ins Achtelfinale ein"
      testId="screen-groups"
    >
      <div className={gridClasses}>
        {groups.map((g) => (
          <GroupCard key={g.name} group={g} compact={count > 4} padClass={padClass} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default GroupTables;
