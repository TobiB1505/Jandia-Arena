import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { germanySide } from "../lib/germany";

/**
 * Full-screen "GOOOAL!" celebration overlay – fires for 4 seconds whenever
 * the Germany team's score in the supplied match increases.
 *
 * Strictly opt-in: the parent only mounts this component while the
 * Deutschland-Public-Viewing slide is active AND the match is live, so it can
 * never trigger on any other screen or match.
 *
 * `testTriggerKey` is an optional admin-driven counter. When it changes the
 * overlay fires once with a synthetic scoreline – used by the admin
 * "Goal-Animation testen" button. Match data is not required in test mode.
 */
const HOLD_MS = 4000;

export default function GoalOverlay({ match, testTriggerKey = 0 }) {
  const [show, setShow] = useState(false);
  const [scorelineSnapshot, setScorelineSnapshot] = useState(null);
  const prevGoalsRef = useRef(null);
  const timerRef = useRef(null);
  const armedRef = useRef(false); // prevents the first read from firing
  const prevTestKeyRef = useRef(testTriggerKey);

  // Real Germany goal detection
  useEffect(() => {
    if (!match) return;
    const side = germanySide(match);
    if (!side) return;
    const germanyGoals =
      side === "home" ? match.home_score : match.away_score;
    const opponentGoals =
      side === "home" ? match.away_score : match.home_score;

    if (typeof germanyGoals !== "number") {
      prevGoalsRef.current = null;
      armedRef.current = false;
      return;
    }

    const prev = prevGoalsRef.current;
    prevGoalsRef.current = germanyGoals;

    if (!armedRef.current) {
      armedRef.current = true;
      return;
    }

    if (typeof prev === "number" && germanyGoals > prev) {
      setScorelineSnapshot({
        germany: germanyGoals,
        opponent: typeof opponentGoals === "number" ? opponentGoals : 0,
        opponentName:
          side === "home" ? match.away?.name : match.home?.name,
      });
      setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShow(false), HOLD_MS);
    }
  }, [match?.home_score, match?.away_score, match?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin test trigger – fires once when testTriggerKey changes.
  useEffect(() => {
    if (testTriggerKey === prevTestKeyRef.current) return;
    prevTestKeyRef.current = testTriggerKey;
    if (testTriggerKey === 0) return; // initial mount, ignore
    setScorelineSnapshot({
      germany: 1,
      opponent: 0,
      opponentName: "Test-Modus",
    });
    setShow(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), HOLD_MS);
  }, [testTriggerKey]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="goal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.92) 70%)",
          }}
          data-testid="goal-overlay"
        >
          {/* Glow ring */}
          <motion.div
            aria-hidden
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut", repeat: 1 }}
            className="absolute h-[1200px] w-[1200px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,204,0,0.45) 0%, rgba(255,204,0,0) 60%)",
            }}
          />

          <motion.div
            initial={{ scale: 0.4, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 14,
              delay: 0.05,
            }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: [0, -2, 2, -2, 2, 0] }}
              transition={{ duration: 0.9, repeat: 3 }}
              className="font-display uppercase leading-none"
              style={{
                fontSize: 320,
                background:
                  "linear-gradient(180deg, #FFD200 0%, #FFCC00 45%, #FFAE00 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter:
                  "drop-shadow(0 0 30px rgba(255,204,0,0.6)) drop-shadow(0 12px 40px rgba(0,0,0,0.85))",
                letterSpacing: "0.04em",
              }}
              data-testid="goal-overlay-headline"
            >
              GOOOAL!
            </motion.div>

            <div className="mt-8 flex items-center gap-8 text-white">
              <div className="flex flex-col items-center">
                <div
                  className="text-2xl font-bold uppercase tracking-[0.4em]"
                  style={{ color: "#FFCC00" }}
                >
                  Deutschland
                </div>
                {scorelineSnapshot && (
                  <div className="mt-2 text-7xl font-black tabular-nums">
                    {scorelineSnapshot.germany}
                  </div>
                )}
              </div>

              <div className="text-5xl font-light text-blue-200/70">:</div>

              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold uppercase tracking-[0.4em] text-blue-200/80">
                  {scorelineSnapshot?.opponentName || ""}
                </div>
                {scorelineSnapshot && (
                  <div className="mt-2 text-7xl font-black tabular-nums text-blue-100/80">
                    {scorelineSnapshot.opponent}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
