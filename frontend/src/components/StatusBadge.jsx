// Centralised status badge styles + German labels
// Statuses from backend: scheduled | live | halftime | finished

const STYLE = {
  upcoming: {
    label: "BEVORSTEHEND",
    cls: "bg-white/5 text-blue-100 ring-1 ring-white/15",
    dot: false,
  },
  live: {
    label: "LIVE",
    cls: "bg-red-500/15 text-red-300 ring-1 ring-red-500/40",
    dot: true,
  },
  halftime: {
    label: "HALBZEIT",
    cls: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/40",
    dot: false,
  },
  fulltime: {
    label: "ABPFIFF",
    cls: "bg-blue-500/10 text-blue-200 ring-1 ring-blue-400/30",
    dot: false,
  },
};

export function statusInfo(status) {
  if (status === "live") return STYLE.live;
  if (status === "halftime") return STYLE.halftime;
  if (status === "finished") return STYLE.fulltime;
  return STYLE.upcoming;
}

export const StatusBadge = ({ status, minute, testId }) => {
  const info = statusInfo(status);
  const showMinute = status === "live" && typeof minute === "number";
  return (
    <div
      data-testid={testId}
      className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-base font-bold uppercase tracking-[0.25em] ${info.cls}`}
    >
      {info.dot ? (
        <span className="live-dot h-2.5 w-2.5 rounded-full bg-red-500" />
      ) : null}
      <span>
        {info.label}
        {showMinute ? ` · ${minute}'` : ""}
      </span>
    </div>
  );
};

export default StatusBadge;
