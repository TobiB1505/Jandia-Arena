import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import TodaysMatches from "../screens/TodaysMatches";
import NextMatch from "../screens/NextMatch";
import LiveScores from "../screens/LiveScores";
import TomorrowsMatches from "../screens/TomorrowsMatches";
import GroupTables from "../screens/GroupTables";
import {
  fetchAllMatches,
  fetchGroups,
  FALLBACK_MATCHES,
  FALLBACK_GROUPS,
} from "../lib/api";

const ROTATE_MS = 15000;
const REFRESH_MS = 60000;

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/350ac180-61fb-48e9-b8d9-50ec9465a89d/images/23f3eed9fb2fcfd8ab6a748b97925a709811830e9d7b64a20dc3c2c64c5edec7.png";

const SCREENS = ["today", "next", "live", "tomorrow", "groups"];
const SCREEN_LABELS = {
  today: "Heute",
  next: "Nächstes",
  live: "Live",
  tomorrow: "Morgen",
  groups: "Tabellen",
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
  const [groups, setGroups] = useState(FALLBACK_GROUPS);
  const [usingFallback, setUsingFallback] = useState(false);
  const [screenIdx, setScreenIdx] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [matches, grps] = await Promise.all([
        fetchAllMatches(),
        fetchGroups(),
      ]);
      if (Array.isArray(matches) && matches.length > 0) {
        setAllMatches(matches);
        setUsingFallback(false);
      } else {
        setAllMatches(FALLBACK_MATCHES);
        setUsingFallback(true);
      }
      if (Array.isArray(grps) && grps.length > 0) {
        setGroups(grps);
      } else {
        setGroups(FALLBACK_GROUPS);
      }
    } catch (e) {
      console.warn("Falling back to demo data:", e?.message);
      setAllMatches(FALLBACK_MATCHES);
      setGroups(FALLBACK_GROUPS);
      setUsingFallback(true);
    } finally {
      setRefreshKey((k) => k + 1);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(
      () => setScreenIdx((i) => (i + 1) % SCREENS.length),
      ROTATE_MS
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todayMatches = useMemo(
    () => allMatches.filter((m) => isSameDay(new Date(m.kickoff), today)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allMatches]
  );
  const tomorrowMatches = useMemo(
    () => allMatches.filter((m) => isSameDay(new Date(m.kickoff), tomorrow)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allMatches]
  );
  const liveMatches = useMemo(
    () =>
      allMatches.filter(
        (m) => m.status === "live" || m.status === "halftime"
      ),
    [allMatches]
  );
  const nextMatch = useMemo(() => {
    const upcoming = allMatches.filter((m) => m.status === "scheduled");
    upcoming.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    return upcoming[0] || null;
  }, [allMatches]);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const current = SCREENS[screenIdx];

  return (
    <div
      data-testid="ja-dashboard"
      className="relative h-screen w-screen overflow-hidden bg-[#0A1128] text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(10,17,40,0.86), rgba(10,17,40,0.94)), url(${BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="broadcast-overlay relative flex h-full w-full flex-col">
        <Header refreshKey={refreshKey} />

        <main className="relative flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {current === "today" && (
              <TodaysMatches key="today" matches={todayMatches} />
            )}
            {current === "next" && <NextMatch key="next" match={nextMatch} />}
            {current === "live" && (
              <LiveScores key="live" matches={liveMatches} />
            )}
            {current === "tomorrow" && (
              <TomorrowsMatches key="tomorrow" matches={tomorrowMatches} />
            )}
            {current === "groups" && (
              <GroupTables key="groups" groups={groups} />
            )}
          </AnimatePresence>
        </main>

        {/* Footer: screen indicator + fullscreen toggle */}
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

          <div className="flex items-center gap-6 text-sm uppercase tracking-[0.3em] text-blue-300">
            {usingFallback ? (
              <span
                data-testid="demo-badge"
                className="rounded-sm bg-amber-500/10 px-3 py-1.5 font-bold text-amber-300 ring-1 ring-amber-400/30"
              >
                Demo · Ersatzdaten
              </span>
            ) : (
              <span
                data-testid="live-badge"
                className="rounded-sm bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-300 ring-1 ring-emerald-400/30"
              >
                Daten · Live
              </span>
            )}
            <button
              data-testid="fullscreen-toggle"
              onClick={enterFullscreen}
              className="rounded-sm border border-blue-400/30 bg-blue-500/10 px-5 py-3 text-base font-bold text-blue-100 transition hover:bg-blue-500/20"
            >
              {isFullscreen ? "Vollbild beenden" : "Vollbild · TV-Modus"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
