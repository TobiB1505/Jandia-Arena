import "./StudioLowerThird.css";

/**
 * Reusable broadcast-style lower third overlay.
 *
 * Props:
 *  - label?:       string  – small caption (overrides variant default)
 *  - title:        string  – main line
 *  - subtitle?:    string  – secondary line
 *  - variant?:     "live" | "studio" | "preview" | "halftime" | "analysis"
 *  - visible?:     boolean – mount/animate in (default true)
 *  - position?:    "bottom" | "top" (default "bottom") – CSS preset only used
 *                  when positionX/positionY are not provided.
 *  - positionX?:   number  – pixel x within the 1920x1080 stage (top-left)
 *  - positionY?:   number  – pixel y within the 1920x1080 stage (top-left)
 *  - draggable?:   boolean – admin drag handles; suppresses CSS slide-in
 *  - onPointerDown?: pointer handler used by the admin editor
 *  - selected?:    boolean – highlights the element in the admin editor
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
  positionX = null,
  positionY = null,
  draggable = false,
  onPointerDown,
  selected = false,
  testId = "studio-lower-third",
}) => {
  const conf = VARIANT_DEFAULTS[variant] || VARIANT_DEFAULTS.studio;
  const resolvedLabel = label || conf.label;

  // When the admin supplies explicit pixel coordinates we drop the CSS preset
  // (which centers via left:50% / translateX(-50%)) and pin to top-left.
  const hasCustomPos =
    typeof positionX === "number" || typeof positionY === "number";
  const customStyle = hasCustomPos
    ? {
        left: typeof positionX === "number" ? `${positionX}px` : undefined,
        top: typeof positionY === "number" ? `${positionY}px` : undefined,
        right: "auto",
        bottom: "auto",
        transform: "none",
      }
    : undefined;

  const classes = [
    "studio-lt",
    conf.cls,
    hasCustomPos
      ? "studio-lt--free"
      : position === "top"
      ? "studio-lt--top"
      : "studio-lt--bottom",
    visible ? "studio-lt--in" : "studio-lt--out",
    draggable ? "studio-lt--editable" : "",
    selected ? "studio-lt--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-testid={testId}
      data-variant={variant}
      data-visible={visible ? "true" : "false"}
      className={classes}
      style={customStyle}
      onPointerDown={draggable ? onPointerDown : undefined}
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
