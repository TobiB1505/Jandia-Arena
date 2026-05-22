import ScreenFrame from "../components/ScreenFrame";
import Flag from "../components/Flag";

const GroupCard = ({ group }) => (
  <div
    data-testid={`group-${group.name.replace(/\s+/g, "-").toLowerCase()}`}
    className="flex flex-col rounded-sm border border-blue-400/25 bg-[#111A3A]/80 p-6"
  >
    <div className="mb-4 flex items-center justify-between border-b border-blue-400/20 pb-3">
      <h3 className="font-display text-3xl uppercase tracking-[0.15em] text-white">
        {group.name}
      </h3>
      <span className="text-xs uppercase tracking-[0.3em] text-blue-300">
        Tabelle
      </span>
    </div>

    {/* Header row */}
    <div className="grid grid-cols-[36px_minmax(0,1fr)_repeat(5,40px)_56px] items-center gap-2 pb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-300/80">
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
          key={`${group.name}-${s.team.short}`}
          data-testid={`row-${group.name.replace(/\s+/g, "-").toLowerCase()}-${i}`}
          className={`grid grid-cols-[36px_minmax(0,1fr)_repeat(5,40px)_56px] items-center gap-2 border-t border-blue-400/10 py-2.5 ${
            qualified ? "text-white" : "text-blue-200/70"
          }`}
        >
          <span
            className={`font-display text-xl ${
              qualified ? "text-blue-300" : "text-blue-200/50"
            }`}
          >
            {i + 1}
          </span>
          <div className="flex items-center gap-3 min-w-0">
            <Flag code={s.team.code} size={32} />
            <span className="truncate font-display text-2xl uppercase tracking-wider">
              {s.team.short}
            </span>
          </div>
          <span className="text-center font-primary text-xl tabular-nums">{s.played}</span>
          <span className="text-center font-primary text-xl tabular-nums">{s.wins}</span>
          <span className="text-center font-primary text-xl tabular-nums">{s.draws}</span>
          <span className="text-center font-primary text-xl tabular-nums">{s.losses}</span>
          <span className="text-center font-primary text-xl tabular-nums">
            {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
          </span>
          <span className="text-right font-display text-2xl tabular-nums">
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

  return (
    <ScreenFrame
      title="Gruppentabellen"
      subtitle="Top 2 ziehen ins Achtelfinale ein"
      testId="screen-groups"
    >
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-6">
        {groups.slice(0, 4).map((g) => (
          <GroupCard key={g.name} group={g} />
        ))}
      </div>
    </ScreenFrame>
  );
};

export default GroupTables;
