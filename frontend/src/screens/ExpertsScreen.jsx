import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScreenFrame from "../components/ScreenFrame";
import { EXPERTS as STATIC_EXPERTS, initialsOf, isExpertCurrentlyHere } from "../data/experts";

const PER_PAGE = 3;
const PAGE_DURATION_MS = 15000;

const AccentTints = [
  { ring: "ring-[#3B82F6]/40", glow: "shadow-[0_0_60px_rgba(59,130,246,0.18)]", chip: "from-[#0E47BA]/80 to-[#3B82F6]/60" },
  { ring: "ring-[#06B6D4]/40", glow: "shadow-[0_0_60px_rgba(6,182,212,0.18)]",  chip: "from-[#0E7490]/80 to-[#06B6D4]/60" },
  { ring: "ring-[#8B5CF6]/40", glow: "shadow-[0_0_60px_rgba(139,92,246,0.18)]", chip: "from-[#6D28D9]/80 to-[#8B5CF6]/60" },
];

const ExpertCard = ({ expert, accentIdx, index, isHere }) => {
  const accent = AccentTints[accentIdx % AccentTints.length];
  const fit = expert.imageFit === "contain" ? "object-contain" : "object-cover";
  return (
    <motion.article
      data-testid={`expert-card-${expert.id}`}
      data-here={isHere ? "true" : "false"}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex h-full flex-col overflow-hidden rounded-sm border ${
        isHere
          ? "border-emerald-400/50 shadow-[0_0_70px_rgba(52,211,153,0.28)]"
          : `border-blue-400/20 ${accent.glow}`
      } bg-gradient-to-b from-[#0B1535]/95 via-[#0E1B45]/90 to-[#06091a]/95`}
    >
      {/* Top accent stripe */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${
          isHere
            ? "bg-gradient-to-r from-emerald-400 via-emerald-300 to-transparent"
            : `bg-gradient-to-r ${accent.chip}`
        }`}
      />

      {/* Photo / placeholder */}
      <div className="relative h-[440px] w-full overflow-hidden bg-[#0A1128]">
        {expert.imageUrl ? (
          <>
            {/* Blurred backdrop fills the area when using object-contain */}
            {expert.imageFit === "contain" ? (
              <img
                src={expert.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl"
              />
            ) : null}
            <img
              src={expert.imageUrl}
              alt={expert.name}
              className={`relative h-full w-full ${fit}`}
              style={{ objectPosition: expert.imagePosition || "center top" }}
            />
          </>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            {/* Decorative grid */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
            {/* Initials disc */}
            <div
              className={`flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br ${accent.chip} ring-4 ${accent.ring}`}
            >
              <span className="font-display text-7xl tracking-wide text-white drop-shadow-lg">
                {initialsOf(expert.name)}
              </span>
            </div>
            <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.4em] text-blue-300/70">
              Pressefoto folgt
            </div>
          </div>
        )}
        {/* Gradient bottom fade for legibility on real photos */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#06091a] via-[#06091a]/70 to-transparent" />

        {/* "Jetzt vor Ort" live badge */}
        {isHere ? (
          <div
            className="absolute right-4 top-4 flex items-center gap-2 rounded-sm border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-emerald-200 backdrop-blur-sm"
            data-testid={`expert-here-badge-${expert.id}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Jetzt vor Ort
          </div>
        ) : null}
      </div>

      {/* Text block */}
      <div className="flex flex-1 flex-col gap-4 px-8 py-7">
        <div
          className={`inline-flex w-fit items-center gap-3 rounded-sm border px-3 py-1.5 text-sm font-bold uppercase tracking-[0.3em] ${
            isHere
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              : "border-blue-400/30 bg-[#0a112a] text-blue-200"
          }`}
          data-testid={`expert-period-${expert.id}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isHere ? "bg-emerald-300" : "bg-blue-300"
            }`}
          />
          {expert.period.from} – {expert.period.to}
        </div>

        <h3
          className="font-display text-4xl uppercase leading-none tracking-wide text-white"
          data-testid={`expert-name-${expert.id}`}
        >
          {expert.name}
        </h3>

        <p
          className="text-lg leading-snug text-blue-200"
          data-testid={`expert-role-${expert.id}`}
        >
          {expert.role}
        </p>
      </div>
    </motion.article>
  );
};

export const ExpertsScreen = ({ referenceDate = null, experts = null }) => {
  // Resolve "today" from the simulated/server date if provided so the
  // highlight matches what the rest of the dashboard considers "today".
  const today = referenceDate
    ? new Date(`${referenceDate}T12:00:00`)
    : new Date();

  // Parent supplies the (already-adapted) experts list so screen switches
  // never trigger a fresh API call → no visual pop-in. Fall back to the
  // bundled static list while the parent is still loading.
  const effective = Array.isArray(experts) && experts.length > 0
    ? experts
    : STATIC_EXPERTS;

  // Sort experts so currently-on-site ones lead the rotation.
  const orderedExperts = [...effective].sort((a, b) => {
    const ah = isExpertCurrentlyHere(a, today) ? 1 : 0;
    const bh = isExpertCurrentlyHere(b, today) ? 1 : 0;
    return bh - ah;
  });
  const totalPages = Math.ceil(orderedExperts.length / PER_PAGE);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setTimeout(
      () => setPage((p) => (p + 1) % totalPages),
      PAGE_DURATION_MS
    );
    return () => clearTimeout(t);
  }, [page, totalPages]);

  const start = page * PER_PAGE;
  const visible = orderedExperts.slice(start, start + PER_PAGE);
  const hereCount = orderedExperts.filter((e) => isExpertCurrentlyHere(e, today)).length;

  return (
    <ScreenFrame
      title="Experten in der Jandia Arena"
      subtitle="Fußballgeschichten, Analysen und echte Profierfahrung live vor Ort"
      testId="screen-experts"
    >
      <div className="flex h-full flex-col">
        {/* Card row */}
        <div className="grid flex-1 grid-cols-3 gap-8 min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              className="col-span-3 grid grid-cols-3 gap-8 min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {visible.map((expert, i) => (
                <ExpertCard
                  key={expert.id}
                  expert={expert}
                  accentIdx={i + start}
                  index={i}
                  isHere={isExpertCurrentlyHere(expert, today)}
                />
              ))}
              {/* Fill empty slots so layout stays balanced on the last page */}
              {Array.from({ length: PER_PAGE - visible.length }).map((_, i) => (
                <div key={`spacer-${i}`} aria-hidden />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Page indicator */}
        <div className="mt-6 flex items-center justify-between text-blue-300">
          <div className="text-sm uppercase tracking-[0.4em]">
            Seite {page + 1} / {totalPages}
          </div>
          <div className="flex items-center gap-3" data-testid="experts-pager">
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 transition-all duration-500 ${
                  i === page ? "w-12 bg-blue-300" : "w-6 bg-blue-300/25"
                } rounded-full`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.4em]">
            {hereCount > 0 ? (
              <span className="flex items-center gap-2 text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                {hereCount} jetzt vor Ort
              </span>
            ) : null}
            <span className="text-blue-300/70">
              {orderedExperts.length} Experten · Live in der Arena
            </span>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
};

export default ExpertsScreen;
