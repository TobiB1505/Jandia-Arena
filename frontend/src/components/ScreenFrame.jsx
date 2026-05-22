import { motion } from "framer-motion";

export const ScreenFrame = ({ title, subtitle, children, testId }) => {
  return (
    <motion.section
      data-testid={testId}
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
        <div className="flex items-center gap-3 text-blue-300">
          <span className="h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
          <span className="text-xl font-semibold uppercase tracking-[0.3em]">
            Live-Übertragung
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-8">{children}</div>
    </motion.section>
  );
};

export default ScreenFrame;
