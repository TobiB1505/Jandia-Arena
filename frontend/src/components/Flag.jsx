import ReactCountryFlag from "react-country-flag";

export const Flag = ({ code, size = 96, testId }) => {
  // react-country-flag uses "GB-ENG" etc., but svg mode doesn't support it.
  // Fallback to GB for England-style codes.
  const normalized = code.includes("-") ? code.split("-")[0] : code;
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center justify-center overflow-hidden rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
      style={{ width: size, height: size * 0.72 }}
    >
      <ReactCountryFlag
        countryCode={normalized}
        svg
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        aria-label={code}
      />
    </span>
  );
};

export default Flag;
