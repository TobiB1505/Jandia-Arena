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
  fetchExperts,
  adaptExpert,
  FALLBACK_MATCHES,
  FALLBACK_GROUPS,
} from "../lib/api";
import { getTodayGermanyMatch } from "../lib/germany";
import LowerThirdAutoCycle from "../components/LowerThirdAutoCycle";
import GoalOverlay from "../components/GoalOverlay";
import useControlState from "../lib/useControlState";

const REFRESH_MS = 60000;
// When a Germany match is in progress we poll significantly more often so
// the score / minute on the Public-Viewing slide is always fresh.
const REFRESH_MS_LIVE = 15000;

const LIVE_STATUSES = new Set(["live", "in_play", "halftime", "paused"]);

// Per-screen display duration. Group Tables stays longer because of the
// dense information density. Schedule = single 7-day week view, normal dwell.
const SCREEN_DURATION_MS = {
  today: 15000,
  next: 15000,
  germany: 23000,
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
  const [experts, setExperts] = useState([]);
  // Admin "Test Goal-Animation" trigger – incremented when /api/now reports
  // a new goal_test_at timestamp. The GoalOverlay watches this and fires a
  // synthetic celebration once per change.
  const [goalTestKey, setGoalTestKey] = useState(0);
  const lastGoalTestAtRef = useRef(null);

  // Live-control state from admin remote (POST /api/control/*). Polled every
  // 3s alongside the goal-test ping. The dashboard reacts to:
  //   • rotation_paused  → freeze the rotation timer
  //   • pinned_screen    → snap to that screen, lock rotation
  //   • forced_action    → one-shot show/next/previous, gated by token
  //   • reload_token     → window.location.reload()
  //   • hide_overlays    → suppress lower-thirds & studio overlay
  // Live-control state pushed via Server-Sent Events (with REST poll as
  // fallback). See `useControlState` – the hook handles reconnects and keeps
  // the UI fresh even when the stream is dropping in and out.
  const ctrlState = useControlState();
  const ctrl = ctrlState || {
    rotation_paused: false,
    pinned_screen: null,
    forced_action: null,
    reload_token: null,
    hide_overlays: false,
  };
  const lastForcedTokenRef = useRef(0);
  const lastReloadTokenRef = useRef(null);
  const ctrlPrimedRef = useRef(false);

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
      const [matches, sched, grps, now, lts, ltSettings, exps] = await Promise.all([
        fetchAllMatches(),
        fetchSchedule().catch(() => []),
        fetchGroups(),
        fetchNow().catch(() => null),
        fetchLowerThirds().catch(() => []),
        fetchLowerThirdsSettings().catch(() => null),
        fetchExperts().catch(() => []),
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
      if (now?.goal_test_at && now.goal_test_at !== lastGoalTestAtRef.current) {
        // First poll just snapshots the value; subsequent changes trigger.
        if (lastGoalTestAtRef.current !== null) {
          setGoalTestKey((k) => k + 1);
        }
        lastGoalTestAtRef.current = now.goal_test_at;
      }
      if (Array.isArray(lts)) setLowerThirds(lts);
      if (ltSettings?.cycle_duration_ms) setLtCycleMs(ltSettings.cycle_duration_ms);
      if (Array.isArray(exps)) setExperts(exps.map(adaptExpert));
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

  // Live-lock: while the Germany match is in play we pin the dashboard to the
  // Deutschland-Public-Viewing slide so the bar audience never misses a goal,
  // and we kick the data poll into a faster cadence (see REFRESH_MS_LIVE).
  const germanyLive = !!germanyMatch && LIVE_STATUSES.has(germanyMatch.status);
  const germanyFinished = !!germanyMatch && germanyMatch.status === "finished";

  // Insert the Deutschland-Public-Viewing screen into the rotation only when
  // a real Germany match exists today AND it has not finished yet. Once the
  // API reports the match as "finished" the slide disappears and the normal
  // rotation resumes automatically. When the *next* match also happens to
  // be that Germany match, drop the generic "Nächstes Spiel" screen so the
  // dashboard doesn't show the same fixture twice in a row.
  const nextIsGermanyToday =
    !!germanyMatch && !!nextMatch && nextMatch.id === germanyMatch.id;

  const SCREENS = useMemo(() => {
    const base = nextIsGermanyToday
      ? BASE_SCREENS.filter((s) => s !== "next")
      : [...BASE_SCREENS];
    if (!germanyMatch || germanyFinished) return base;
    // Place "germany" where "next" would have been so the rotation still
    // shows the upcoming match where viewers expect it.
    const idx = nextIsGermanyToday
      ? base.indexOf("today")
      : base.indexOf("next");
    base.splice(idx + 1, 0, "germany");
    return base;
  }, [germanyMatch, germanyFinished, nextIsGermanyToday]);

  // Keep screenIdx in range when the screen list shrinks/grows.
  // Stable string key – avoids spurious resets whenever the parent re-renders
  // and the SCREENS useMemo gets a fresh (but identical) array reference
  // (which happens on every 30s data poll because germanyMatch is a fresh
  // object). Same trick we use for the Lower-Thirds cycle.
  const screensKey = SCREENS.join("|");

  useEffect(() => {
    setScreenIdx((i) => (i >= SCREENS.length ? 0 : i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screensKey]);

  // Data polling – switches to a faster cadence while the Germany match is
  // live so scores / minutes refresh roughly every 15s.
  useEffect(() => {
    load();
    const refreshMs = germanyLive ? REFRESH_MS_LIVE : REFRESH_MS;
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, germanyLive]);

  // Lightweight QA poll – hits /api/now every 3s to pick up admin
  // goal-test triggers. Control-state is handled by useControlState (WS+poll).
  useEffect(() => {
    const tick = async () => {
      try {
        const now = await fetchNow().catch(() => null);
        if (
          now?.goal_test_at &&
          now.goal_test_at !== lastGoalTestAtRef.current
        ) {
          if (lastGoalTestAtRef.current !== null) {
            setGoalTestKey((k) => k + 1);
          }
          lastGoalTestAtRef.current = now.goal_test_at;
        }
      } catch {
        /* ignore */
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, []);

  // Screen rotation timer. Disabled while:
  //   • a URL ?screen= override is set (editor preview)
  //   • the Germany match is live (live-lock)
  //   • the admin has pinned a screen from the control panel
  //   • the admin has paused rotation
  useEffect(() => {
    if (pinnedScreen) return;
    if (germanyLive) return;
    if (ctrl.pinned_screen) return;
    if (ctrl.rotation_paused) return;
    const duration = SCREEN_DURATION_MS[SCREENS[screenIdx]] || 15000;
    const t = setTimeout(
      () => setScreenIdx((i) => (i + 1) % SCREENS.length),
      duration
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenIdx, pinnedScreen, germanyLive, screensKey, ctrl.rotation_paused, ctrl.pinned_screen]);

  // Snap to admin-pinned screen whenever it changes (or whenever the screen
  // list updates and the pin is still in range).
  useEffect(() => {
    if (!ctrl.pinned_screen) return;
    const idx = SCREENS.indexOf(ctrl.pinned_screen);
    if (idx >= 0) setScreenIdx(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl.pinned_screen, screensKey]);

  // One-shot forced action (Show / Next / Previous). Gated by token so the
  // same action can fire multiple times if the admin spams the button.
  // ALSO: ignore the server's persisted token on first hydration, otherwise
  // we'd replay the last admin action every page reload.
  useEffect(() => {
    const fa = ctrl.forced_action;
    if (!fa || typeof fa.token !== "number") return;
    if (!ctrlPrimedRef.current) {
      ctrlPrimedRef.current = true;
      lastForcedTokenRef.current = fa.token;
      return;
    }
    if (fa.token <= lastForcedTokenRef.current) return;
    lastForcedTokenRef.current = fa.token;
    if (fa.type === "show" && fa.screen) {
      const idx = SCREENS.indexOf(fa.screen);
      if (idx >= 0) setScreenIdx(idx);
    } else if (fa.type === "next") {
      setScreenIdx((i) => (i + 1) % Math.max(SCREENS.length, 1));
    } else if (fa.type === "previous") {
      setScreenIdx((i) => (i - 1 + SCREENS.length) % Math.max(SCREENS.length, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl.forced_action, screensKey]);

  // TV reload from admin – ignores the initial snapshot, only fires when the
  // admin actively pushes a NEW reload_token after we've seen the first one.
  useEffect(() => {
    if (ctrl.reload_token === null || typeof ctrl.reload_token !== "number") return;
    if (lastReloadTokenRef.current === null) {
      lastReloadTokenRef.current = ctrl.reload_token;
      return;
    }
    if (ctrl.reload_token !== lastReloadTokenRef.current) {
      lastReloadTokenRef.current = ctrl.reload_token;
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }, [ctrl.reload_token]);

  // Force-pin to the Germany slide whenever the match goes live (or stays
  // live across polls). Snaps even if the rotation was mid-slide.
  useEffect(() => {
    if (!germanyLive) return;
    const idx = SCREENS.indexOf("germany");
    if (idx >= 0) setScreenIdx(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [germanyLive, screensKey]);

  const stageRef = useRef(null);

  const enterFullscreen = useCallback(() => {
    stageRef.current?.enterFullscreen();
  }, []);

  // Effective pinned screen: URL override (dev) > admin remote.
  const effectivePin = pinnedScreen || ctrl.pinned_screen;
  const current = effectivePin && SCREENS.includes(effectivePin)
    ? effectivePin
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
          hideOverlays={ctrl.hide_overlays}
        />

        <main className="relative flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {current === "today" && (
              <TodaysMatches key="today" matches={todayMatches} referenceDate={referenceDate} />
            )}
            {current === "next" && <NextMatch key="next" match={nextMatch} referenceDate={referenceDate} />}
            {current === "germany" && germanyMatch && (
              <GermanyPublicViewing key="germany" match={germanyMatch} referenceDate={referenceDate} experts={experts} />
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
          {!ltSuppressed && !ctrl.hide_overlays && (
            <LowerThirdAutoCycle
              items={lowerThirds}
              currentScreen={current}
              cycleDurationMs={ltCycleMs}
            />
          )}

          {/* Goal celebration – two trigger paths:
              1) Real Germany goal during live-lock (only fires when
                 current === "germany" + germanyLive + score increase)
              2) Admin "Goal-Animation testen" button bumps goalTestKey;
                 in test mode it fires on any screen.
              Always mounted so the prev-ref initialises at 0 from the
              start, otherwise the first admin trigger would silently
              de-dupe against an already-matching initial value. The
              component renders null until one of the triggers fires. */}
          <GoalOverlay
            match={
              current === "germany" && germanyLive ? germanyMatch : null
            }
            testTriggerKey={goalTestKey}
          />
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
