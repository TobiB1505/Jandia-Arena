import { motion } from "framer-motion";

export const ScreenFrame = ({ title, subtitle, children, testId }) => {
  return (
    <motion.section
      data-testid={testId}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col px-12 pb-12 pt-4"
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
