import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COMPARISON_SITES, EOX_ATTRIBUTION, eoxTileUrl } from "./comparisonData";

/**
 * Before / After change-detection comparison.
 * Each card is a non-interactive Leaflet view of a real Sentinel-2
 * mosaic window; both cards share one view so the areas match exactly.
 * Maps mount lazily when scrolled into view (tile traffic on demand).
 */

function MosaicMap({ center, zoom, year, title }) {
  const divRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !divRef.current) return;
    const map = L.map(divRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    L.tileLayer(eoxTileUrl(year), { maxZoom: 16 }).addTo(map);
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => {
      clearTimeout(t);
      map.remove();
    };
  }, [visible, center, zoom, year]);

  return <div ref={divRef} className="baMap" role="img" aria-label={title} />;
}

function YearCard({ site, role, year }) {
  const tag = role === "before" ? "Before" : "After";
  return (
    <figure className="baCard">
      <MosaicMap
        center={site.center}
        zoom={site.zoom}
        year={year}
        title={`${site.name} — ${tag} ${year}, Sentinel-2 mosaic window`}
      />
      <span className="baBadge">{tag}</span>
      <figcaption className="baBar">
        <b>
          {year} • Sentinel-2 imagery
        </b>
        <span>{site.name}</span>
      </figcaption>
    </figure>
  );
}

export default function BeforeAfterComparison() {
  const [siteId, setSiteId] = useState(COMPARISON_SITES[0].id);
  const site =
    COMPARISON_SITES.find((s) => s.id === siteId) ?? COMPARISON_SITES[0];
  const { summary } = site;

  return (
    <section
      id="comparison"
      className="section compareSection"
      aria-labelledby="compare-title"
    >
      <div className="eyebrow">Change Detection</div>
      <h2 id="compare-title">
        Before / After
        <br />
        Comparison
      </h2>

      <select
        className="compareSelect"
        value={siteId}
        onChange={(e) => setSiteId(e.target.value)}
        aria-label="Select monitoring location"
      >
        {COMPARISON_SITES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <div className="compareStack">
        <YearCard site={site} role="before" year={site.before.year} />
        <div className="compareDiv" aria-hidden="true">
          ↔
        </div>
        <YearCard site={site} role="after" year={site.after.year} />
      </div>

      <div className="changeSummary">
        <div className="sumCard">
          <b>Forest cover</b>
          <strong>
            {summary.forest
              ? `${summary.forest.from} → ${summary.forest.to}`
              : "—"}
          </strong>
          <small>
            {summary.period ??
              `${site.before.year} → ${site.after.year}`}
          </small>
        </div>
        <div className="sumCard">
          <b>Mining area</b>
          <strong>
            {summary.mining
              ? summary.mining.from
                ? `${summary.mining.from} → ${summary.mining.to}`
                : summary.mining.display
              : "—"}
          </strong>
          <small>
            {summary.period ??
              `${site.before.year} → ${site.after.year}`}
          </small>
        </div>
        <div className="sumCard">
          <b>Change status</b>
          <strong>{summary.status}</strong>
          <small>{summary.sourced ? "Published figures" : "Prototype estimate"}</small>
        </div>
      </div>

      <p className="sourceLine">{summary.source}</p>
      <p className="attrLine">
        {EOX_ATTRIBUTION} · Demo windows for illustration, not real-time
        evidence.
      </p>
    </section>
  );
}
