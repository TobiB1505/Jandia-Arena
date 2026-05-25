import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import BroadcastStage from "../components/BroadcastStage";
import TodaysMatches from "../screens/TodaysMatches";
import NextMatch from "../screens/NextMatch";
import TomorrowsMatches from "../screens/TomorrowsMatches";
import Schedule from "../screens/Schedule";
import GroupTables from "../screens/GroupTables";
import GermanyPublicViewing from "../screens/GermanyPublicViewing";
import ExpertsScreen from "../screens/ExpertsScreen";
import {
  fetchAllMatches,
  fetchSchedule,
  fetchGroups,
  fetchNow,
  fetchLowerThirds,
  fetchLowerThirdsSettings,
  FALLBACK_MATCHES,
  FALLBACK_GROUPS,
} from "../lib/api";
import { getTodayGermanyMatch } from "../lib/germany";
import LowerThirdAutoCycle from "../components/LowerThirdAutoCycle";

const REFRESH_MS = 60000;

// Per-screen display duration. Group Tables stays longer because of the
// dense information density. Schedule = single 7-day week view, normal dwell.
const SCREEN_DURATION_MS = {
  today: 15000,
  next: 15000,
  germany: 18000,
  tomorrow: 15000,
  schedule: 30000,
  groups: 35000,
  experts: 45000,
};

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/350ac180-61fb-48e9-b8d9-50ec9465a89d/images/23f3eed9fb2fcfd8ab6a748b97925a709811830e9d7b64a20dc3c2c64c5edec7.png";

const BASE_SCREENS = ["today", "next", "tomorrow", "schedule", "groups", "experts"];
const SCREEN_LABELS = {
  today: "Heute",
  next: "Nächstes",
  germany: "Deutschland",
  tomorrow: "Morgen",
  schedule: "Spielplan",
  groups: "Gruppen",
  experts: "Experten",
};

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Dashboard() {
  const [allMatches, setAllMatches] = useState(FALLBACK_MATCHES);
  const [schedule, setSchedule] = useState([]);
  const [groups, setGroups] = useState(FALLBACK_GROUPS);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [referenceDate, setReferenceDate] = useState(null);
  // Anchor for the simulated/server clock. We capture the server's ISO at the
  // moment we fetched it together with the local Date.now(), and derive
  // `simulatedNow` from that delta so per-second checks (e.g. nextMatch) stay
  // accurate between 60s polls.
  const [serverClock, setServerClock] = useState({ iso: null, fetchedAt: 0 });
  const [screenIdx, setScreenIdx] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lowerThirds, setLowerThirds] = useState([]);
  const [ltCycleMs, setLtCycleMs] = useState(25000);

  // Allow the admin preview iframe to embed the dashboard without the
  // lower-third overlay (so the editor can draw its own draggable overlay
  // on top) and optionally pin to a specific screen (?screen=germany).
  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const ltSuppressed = urlParams.get("nolt") === "1";
  const pinnedScreen = urlParams.get("screen");

  const load = useCallback(async () => {
    try {
      const [matches, sched, grps, now, lts, ltSettings] = await Promise.all([
        fetchAllMatches(),
        fetchSchedule().catch(() => []),
        fetchGroups(),
        fetchNow().catch(() => null),
        fetchLowerThirds().catch(() => []),
        fetchLowerThirdsSettings().catch(() => null),
      ]);
      if (Array.isArray(matches) && matches.length > 0) {
        setAllMatches(matches);
      } else {
        setAllMatches(FALLBACK_MATCHES);
      }
      if (Array.isArray(sched)) setSchedule(sched);
      if (Array.isArray(grps) && grps.length > 0) {
        setGroups(grps);
      } else {
        setGroups(FALLBACK_GROUPS);
      }
      if (now?.date) setReferenceDate(now.date);
      if (now?.iso) {
        setServerClock({ iso: now.iso, fetchedAt: Date.now() });
      }
      if (Array.isArray(lts)) setLowerThirds(lts);
      if (ltSettings?.cycle_duration_ms) setLtCycleMs(ltSettings.cycle_duration_ms);
    } catch (e) {
      console.warn("Falling back to demo data:", e?.message);
      setAllMatches(FALLBACK_MATCHES);
      setGroups(FALLBACK_GROUPS);
    } finally {
      // Tick the "Aktualisiert"-indicator even on partial failures – it must
      // always reflect the most recent refresh attempt, otherwise users
      // think the dashboard is frozen.
      setLastUpdatedAt(Date.now());
      setRefreshKey((k) => k + 1);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (pinnedScreen) return; // editor preview: don't auto-rotate
    const duration = SCREEN_DURATION_MS[SCREENS[screenIdx]] || 15000;
    const t = setTimeout(
      () => setScreenIdx((i) => (i + 1) % SCREENS.length),
      duration
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenIdx, pinnedScreen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lock body scroll only while the TV dashboard is mounted, so /admin etc.
  // can still scroll normally.
  useEffect(() => {
    document.body.classList.add("tv-mode");
    return () => document.body.classList.remove("tv-mode");
  }, []);

  const today = referenceDate ? new Date(`${referenceDate}T00:00:00`) : new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Effective "now" for time-of-day comparisons. Falls back to the real
  // browser clock when no server anchor is available.
  const nowMs = serverClock.iso
    ? new Date(serverClock.iso).getTime() + (Date.now() - serverClock.fetchedAt)
    : Date.now();

  const todayMatches = useMemo(
    () => allMatches.filter((m) => isSameDay(new Date(m.kickoff), today)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allMatches, referenceDate]
  );
  const tomorrowMatches = useMemo(
    () => allMatches.filter((m) => isSameDay(new Date(m.kickoff), tomorrow)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allMatches, referenceDate]
  );
  const nextMatch = useMemo(() => {
    const upcoming = allMatches.filter(
      (m) => m.status === "scheduled" && new Date(m.kickoff).getTime() >= nowMs
    );
    upcoming.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    return upcoming[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatches, referenceDate, serverClock]);

  // Today-only Germany match (live > upcoming > finished). null if no match today.
  const germanyMatch = useMemo(
    () => getTodayGermanyMatch(allMatches, referenceDate),
    [allMatches, referenceDate]
  );

  // Insert the Deutschland-Public-Viewing screen into the rotation only when
  // a real Germany match exists today. Placed after "next" so it sits next to
  // the other match-spotlight screens.
  const SCREENS = useMemo(() => {
    if (!germanyMatch) return BASE_SCREENS;
    const out = [...BASE_SCREENS];
    const insertAfter = out.indexOf("next");
    out.splice(insertAfter + 1, 0, "germany");
    return out;
  }, [germanyMatch]);

  // Keep screenIdx in range when the screen list shrinks/grows.
  useEffect(() => {
    setScreenIdx((i) => (i >= SCREENS.length ? 0 : i));
  }, [SCREENS]);

  const stageRef = useRef(null);

  const enterFullscreen = useCallback(() => {
    stageRef.current?.enterFullscreen();
  }, []);

  const current = pinnedScreen && SCREENS.includes(pinnedScreen)
    ? pinnedScreen
    : SCREENS[screenIdx];

  return (
    <BroadcastStage ref={stageRef}>
      <div
        data-testid="ja-dashboard"
        className="relative overflow-hidden bg-[#0A1128] text-white"
        style={{
          width: 1920,
          height: 1080,
          backgroundImage: `linear-gradient(rgba(10,17,40,0.86), rgba(10,17,40,0.94)), url(${BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="broadcast-overlay relative flex h-full w-full flex-col">
        <Header
          refreshKey={screenIdx}
          slideDurationMs={SCREEN_DURATION_MS[SCREENS[screenIdx]] || 15000}
          onLogoClick={enterFullscreen}
          isFullscreen={isFullscreen}
          lastUpdatedAt={lastUpdatedAt}
          referenceDate={referenceDate}
          lowerThirds={lowerThirds}
          ltCycleMs={ltCycleMs}
          currentScreen={current}
        />

        <main className="relative flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {current === "today" && (
              <TodaysMatches key="today" matches={todayMatches} referenceDate={referenceDate} />
            )}
            {current === "next" && <NextMatch key="next" match={nextMatch} referenceDate={referenceDate} />}
            {current === "germany" && germanyMatch && (
              <GermanyPublicViewing key="germany" match={germanyMatch} />
            )}
            {current === "tomorrow" && (
              <TomorrowsMatches key="tomorrow" matches={tomorrowMatches} referenceDate={referenceDate} />
            )}
            {current === "schedule" && (
              <Schedule key="schedule" schedule={schedule} referenceDate={referenceDate} />
            )}
            {current === "groups" && (
              <GroupTables key="groups" groups={groups} />
            )}
            {current === "experts" && (
              <ExpertsScreen key="experts" referenceDate={referenceDate} />
            )}
          </AnimatePresence>

          {/* Admin-driven Lower Third auto-cycle (per current screen) */}
          {!ltSuppressed && (
            <LowerThirdAutoCycle
              items={lowerThirds}
              currentScreen={current}
              cycleDurationMs={ltCycleMs}
            />
          )}
        </main>

        {/* Footer: screen indicator only */}
        <footer className="relative z-20 flex items-center justify-between px-12 pb-6 pt-2">
          <div
            className="flex items-center gap-4"
            data-testid="screen-indicator"
          >
            {SCREENS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    i === screenIdx
                      ? "w-16 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]"
                      : "w-2.5 bg-blue-400/30"
                  }`}
                />
                <span
                  className={`text-sm uppercase tracking-[0.3em] ${
                    i === screenIdx ? "text-blue-200" : "text-blue-200/40"
                  }`}
                >
                  {SCREEN_LABELS[s]}
                </span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
    </BroadcastStage>
  );
}
