import { useEffect, useState } from "react";
import ExpertsAdmin from "../components/ExpertsAdmin";
import SetupTab from "../components/SetupTab";
import AdminLogin from "../components/AdminLogin";
import LiveControlTab from "../components/LiveControlTab";
import ScreensTab from "../components/ScreensTab";
import LowerThirdsManager from "../components/LowerThirdsManager";
import { fetchAuthStatus, checkAuth, getToken, clearToken, onAuthLost } from "../lib/auth";

const TABS = [
  { id: "live",     label: "Live",     icon: "●" },
  { id: "screens",  label: "Screens",  icon: "▦" },
  { id: "lt",       label: "Lower Thirds", icon: "▤" },
  { id: "experts",  label: "Experten", icon: "✦" },
  { id: "settings", label: "Setup",    icon: "⚙" },
];

function useIsDesktop() {
  const [is, setIs] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(min-width: 1024px)").matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => setIs(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
  return is;
}

export default function Admin() {
  const isDesktop = useIsDesktop();
  const [authState, setAuthState] = useState("checking"); // "checking" | "authed" | "locked"
  const [tab, setTab] = useState("live");

  // Auth bootstrap: confirm whether auth is configured, then validate token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchAuthStatus();
        if (cancelled) return;
        if (!status.configured) {
          setAuthState("authed"); // dev mode – open access
          return;
        }
        if (!getToken()) {
          setAuthState("locked");
          return;
        }
        try {
          await checkAuth();
          setAuthState("authed");
        } catch {
          clearToken();
          setAuthState("locked");
        }
      } catch (e) {
        // Status endpoint unreachable – fail-open so the UI stays usable
        console.error("auth status failed", e);
        setAuthState("authed");
      }
    })();
    onAuthLost(() => setAuthState("locked"));
    return () => { cancelled = true; };
  }, []);

  if (authState === "checking") {
    return (
      <div
        className="min-h-screen bg-[#06091a] text-blue-200 flex items-center justify-center"
        data-testid="admin-loading"
      >
        <span className="text-sm uppercase tracking-[0.3em]">Lade Regiezentrale…</span>
      </div>
    );
  }
  if (authState === "locked") {
    return <AdminLogin onAuthed={() => setAuthState("authed")} />;
  }

  /* ---------- Desktop layout (≥ lg) ---------- */
  if (isDesktop) {
    return (
      <div
        className="min-h-screen bg-[#06091a] text-blue-50"
        data-testid="admin-desktop"
      >
        <header className="sticky top-0 z-40 border-b border-blue-400/15 bg-[#06091a]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                Jandia Arena · Regiezentrale
              </h1>
              <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/70">
                Desktop-Steuerung
              </p>
            </div>
            <a
              href="/"
              className="rounded-lg border border-blue-400/30 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-200 hover:bg-white/5"
              data-testid="admin-back"
            >
              Zur TV-Ansicht
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-8 py-8">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_1fr]">
            {/* Sticky live control rail */}
            <aside
              className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-2"
              data-testid="desktop-live-rail"
            >
              <LiveControlTab />
            </aside>

            {/* Scrollable main content */}
            <section className="space-y-10" data-testid="desktop-main">
              <SectionHeading title="Screens" subtitle="Reihenfolge, Dauer und Direkt-Steuerung der TV-Slides." />
              <ScreensTab />

              <SectionHeading title="Lower Thirds" subtitle="Banner-Inhalte, Cycle und Live-Positionierung." />
              <LowerThirdsManager />

              <SectionHeading title="Experten" subtitle="Studio-Talk-Gäste und ihre Profilbilder." />
              <ExpertsAdmin />

              <SectionHeading title="Einstellungen" subtitle="Simuliertes Datum, QA-Aktionen, Anmeldung und System-Info." />
              <SetupTab />
            </section>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Mobile layout (< lg) ---------- */
  return (
    <div
      className="min-h-screen bg-[#06091a] pb-24 text-blue-50"
      data-testid="admin-mobile"
    >
      <header className="sticky top-0 z-40 border-b border-blue-400/15 bg-[#06091a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">
              Jandia Arena
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-300/70">
              Live-Regie
            </p>
          </div>
          <a
            href="/"
            className="rounded-lg border border-blue-400/30 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-blue-200 hover:bg-white/5"
            data-testid="admin-back"
          >
            TV
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-6">
        {tab === "live"     && <LiveControlTab />}
        {tab === "screens"  && <ScreensTab />}
        {tab === "lt"       && <LowerThirdsManager />}
        {tab === "experts"  && <ExpertsAdmin />}
        {tab === "settings" && <SetupTab />}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-blue-400/20 bg-[#06091a]/95 backdrop-blur"
        data-testid="admin-bottom-nav"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`admin-tab-${t.id}`}
                className={`flex flex-col items-center justify-center py-2.5 transition ${
                  active
                    ? "text-blue-100"
                    : "text-blue-400/60 hover:text-blue-200"
                }`}
              >
                <span
                  className={`text-base ${
                    active ? "text-blue-300" : "text-blue-400/50"
                  }`}
                >
                  {t.icon}
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {t.label}
                </span>
                {active && (
                  <span className="mt-0.5 h-[3px] w-6 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </nav>
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="border-b border-blue-400/10 pb-3">
      <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-blue-100">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-blue-300/70">{subtitle}</p>
      )}
    </div>
  );
}
