import "./MonitoringCoverage.css";

/**
 * Demo monitoring data, kept separate from presentation so a live
 * monitoring feed can replace it later without touching the visuals.
 */
export const DEFAULT_COVERAGE_DATA = {
  location: "Ghana",
  status: "Demo data",
  coverageLevel: 4, // status bars lit, out of 4
  active: true,
};

// Opacity steps for the four status bars (bright → subdued).
const BAR_OPACITIES = [1, 0.65, 0.4, 0.22];

export default function MonitoringCoverage({
  location = DEFAULT_COVERAGE_DATA.location,
  status = DEFAULT_COVERAGE_DATA.status,
  coverageLevel = DEFAULT_COVERAGE_DATA.coverageLevel,
  active = DEFAULT_COVERAGE_DATA.active,
}) {
  return (
    <section
      className="mc-card"
      aria-label={`Monitoring Coverage — ${location}, ${status}`}
    >
      <div
        className="mc-radar"
        role="img"
        aria-label={`Satellite monitoring radar for ${location}, status ${status}`}
      >
        <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="mc-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7ED957" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#7ED957" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="mc-ring" cx="100" cy="100" r="90" />
          <circle className="mc-ring" cx="100" cy="100" r="66" />
          <circle className="mc-ring" cx="100" cy="100" r="44" />
          <circle className="mc-ring" cx="100" cy="100" r="24" />
          <line className="mc-cross" x1="100" y1="8" x2="100" y2="192" />
          <line className="mc-cross" x1="8" y1="100" x2="192" y2="100" />
          <g className="mc-sweep">
            <line x1="100" y1="100" x2="46" y2="154" />
          </g>
          <circle className="mc-halo" cx="100" cy="100" r="16" fill="url(#mc-glow)" />
          <circle className="mc-ping" cx="100" cy="100" r="6" />
          <circle className="mc-point" cx="100" cy="100" r="5.5" />
        </svg>
      </div>

      <h2 className="mc-title">Monitoring Coverage</h2>
      <p className="mc-sub">
        {location} <span aria-hidden="true">•</span> {status}
      </p>

      <div
        className="mc-bars"
        role="status"
        aria-label={`Coverage signal ${coverageLevel} of 4, monitoring ${active ? "active" : "paused"}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className={i === 0 ? "mc-bar mc-bar-live" : "mc-bar"}
            style={{ opacity: i < coverageLevel ? BAR_OPACITIES[i] : 0.12 }}
          />
        ))}
      </div>

      <span className="mc-sr-only">
        Monitoring {active ? "active" : "paused"} for {location}
      </span>
    </section>
  );
}
