import { motion } from "framer-motion";

export const ScreenFrame = ({ title, subtitle, children, testId }) => {
  return (
    <motion.section
      data-testid={testId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }}
      // Exit almost-cut so the gap before the next slide mounts is minimal.
      // With AnimatePresence mode="wait" only one slide is in DOM at a time,
      // which avoids the layout-thrash hang on Schedule (7× ResizeObserver)
      // and ExpertsScreen (inner AnimatePresence). Total perceived gap: ~0.1s.
      exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }}
      className="relative flex h-full w-full flex-col px-12 pb-12 pt-4"
    >
      <div className="flex items-end justify-between border-b border-blue-400/20 pb-6">
        <div>
          <h1
            className="font-display text-6xl uppercase leading-[1.05] tracking-[0.08em] text-white"
            data-testid={`${testId}-title`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-2xl font-light text-blue-200">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-8">{children}</div>
    </motion.section>
  );
};

export default ScreenFrame;
