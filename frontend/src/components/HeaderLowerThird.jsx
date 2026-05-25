import "./HeaderLowerThird.css";

/**
 * Slim, flat header banner – designed to live between the JANDIA ARENA logo
 * and the clock/date in the top header bar. CSS-only animations (no
 * framer-motion) so long TV sessions stay smooth.
 *
 * Props mirror StudioLowerThird where it makes sense:
 *   label, title, subtitle, variant, visible
 */
const VARIANT_CLASS = {
  live: "hlt-live",
  studio: "hlt-studio",
  preview: "hlt-preview",
  halftime: "hlt-halftime",
  analysis: "hlt-analysis",
};

const DEFAULT_LABEL = {
  live: "LIVE",
  studio: "STUDIO",
  preview: "VORSCHAU",
  halftime: "HALBZEIT",
  analysis: "ANALYSE",
};

export const HeaderLowerThird = ({
  label,
  title,
  subtitle,
  variant = "studio",
  visible = true,
  testId = "header-lower-third",
}) => {
  const variantCls = VARIANT_CLASS[variant] || VARIANT_CLASS.studio;
  const resolvedLabel = label || DEFAULT_LABEL[variant] || DEFAULT_LABEL.studio;

  return (
    <div
      data-testid={testId}
      data-variant={variant}
      className={`hlt ${variantCls} ${visible ? "hlt--in" : "hlt--out"}`}
    >
      <div className="hlt__label" data-testid={`${testId}-label`}>
        {variant === "live" ? (
          <span className="hlt__dot" aria-hidden="true" />
        ) : null}
        <span>{resolvedLabel}</span>
      </div>
      <div className="hlt__divider" aria-hidden="true" />
      <div className="hlt__text">
        <div className="hlt__title" data-testid={`${testId}-title`}>
          {title}
        </div>
        {subtitle ? (
          <div className="hlt__subtitle" data-testid={`${testId}-subtitle`}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className="hlt__shine" aria-hidden="true" />
    </div>
  );
};

export default HeaderLowerThird;
