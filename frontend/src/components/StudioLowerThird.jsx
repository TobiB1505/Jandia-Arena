import "./StudioLowerThird.css";

/**
 * Reusable broadcast-style lower third overlay.
 *
 * Props:
 *  - label?:     string  – small caption (overrides variant default)
 *  - title:      string  – main line
 *  - subtitle?:  string  – secondary line
 *  - variant?:   "live" | "studio" | "preview" | "halftime" | "analysis"
 *  - visible?:   boolean – mount/animate in (default true)
 *  - position?:  "bottom" | "top" (default "bottom")
 *
 * Designed to be dropped inside any screen (or a positioned ancestor) and
 * remain inside the fixed 1920x1080 BroadcastStage. CSS-only animations so
 * long-running TV browsers stay smooth.
 */
const VARIANT_DEFAULTS = {
  live:     { label: "LIVE",       cls: "lt-live" },
  studio:   { label: "STUDIO",     cls: "lt-studio" },
  preview:  { label: "VORSCHAU",   cls: "lt-preview" },
  halftime: { label: "HALBZEIT",   cls: "lt-halftime" },
  analysis: { label: "ANALYSE",    cls: "lt-analysis" },
};

export const StudioLowerThird = ({
  label,
  title,
  subtitle,
  variant = "studio",
  visible = true,
  position = "bottom",
  testId = "studio-lower-third",
}) => {
  const conf = VARIANT_DEFAULTS[variant] || VARIANT_DEFAULTS.studio;
  const resolvedLabel = label || conf.label;

  return (
    <div
      data-testid={testId}
      data-variant={variant}
      data-visible={visible ? "true" : "false"}
      className={`studio-lt ${conf.cls} ${
        position === "top" ? "studio-lt--top" : "studio-lt--bottom"
      } ${visible ? "studio-lt--in" : "studio-lt--out"}`}
    >
      <div className="studio-lt__inner">
        <div className="studio-lt__label" data-testid={`${testId}-label`}>
          {variant === "live" ? (
            <span className="studio-lt__dot" aria-hidden="true" />
          ) : null}
          <span className="studio-lt__label-text">{resolvedLabel}</span>
        </div>

        <div className="studio-lt__divider" aria-hidden="true" />

        <div className="studio-lt__text">
          <div
            className="studio-lt__title"
            data-testid={`${testId}-title`}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              className="studio-lt__subtitle"
              data-testid={`${testId}-subtitle`}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Subtle moving shine */}
        <div className="studio-lt__shine" aria-hidden="true" />
      </div>
    </div>
  );
};

export default StudioLowerThird;
