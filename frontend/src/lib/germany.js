// Utility to find a Germany match scheduled for the *actual* calendar day.
//
// Recognizes a team as Germany if any of these match (case-insensitive):
//   - name        === "Deutschland" | "Germany"
//   - short/code  === "GER" | "DE"
//
// Selection rules (in priority order, only matches on today's date qualify):
//   1) live / halftime Germany match today
//   2) upcoming Germany match today (scheduled, kickoff still today)
//   3) finished Germany match today (status "HEUTE GESPIELT")
//
// Returns null when no Germany match exists for today.
// Never falls back to another team or another day.

const GERMANY_NAMES = new Set(["deutschland", "germany"]);
const GERMANY_CODES = new Set(["ger", "de"]);

function isGermany(team) {
  if (!team) return false;
  const name = (team.name || "").trim().toLowerCase();
  const short = (team.short || "").trim().toLowerCase();
  const code = (team.code || "").trim().toLowerCase();
  return (
    GERMANY_NAMES.has(name) ||
    GERMANY_CODES.has(short) ||
    GERMANY_CODES.has(code)
  );
}

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * @param {Array} matches  – list of match objects (same shape as the rest of the app)
 * @param {string|null} referenceDate – optional "YYYY-MM-DD" used as "today" for simulation
 * @returns {object|null} a single match or null
 */
export function getTodayGermanyMatch(matches, referenceDate = null) {
  if (!Array.isArray(matches) || matches.length === 0) return null;

  const today = referenceDate
    ? new Date(`${referenceDate}T00:00:00`)
    : new Date();

  const todayGermanyMatches = matches.filter((m) => {
    if (!m || !m.kickoff) return false;
    if (!isGermany(m.home) && !isGermany(m.away)) return false;
    const kickoff = new Date(m.kickoff);
    return isSameCalendarDay(kickoff, today);
  });

  if (todayGermanyMatches.length === 0) return null;

  const liveStatuses = new Set(["live", "halftime", "in_play", "paused"]);
  const live = todayGermanyMatches.find((m) => liveStatuses.has(m.status));
  if (live) return live;

  const upcoming = todayGermanyMatches
    .filter((m) => m.status === "scheduled" || m.status === "timed")
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  if (upcoming.length > 0) return upcoming[0];

  const finished = todayGermanyMatches
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));
  if (finished.length > 0) return finished[0];

  return null;
}

/** Convenience: which side is Germany in this match? */
export function germanySide(match) {
  if (!match) return null;
  if (isGermany(match.home)) return "home";
  if (isGermany(match.away)) return "away";
  return null;
}
