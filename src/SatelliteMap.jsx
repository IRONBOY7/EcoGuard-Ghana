import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Live satellite monitoring map.
 *
 * Base layer: Esri World Imagery (free, attribution required).
 * Daily layer: NASA EOSDIS GIBS MODIS Terra true-color (free, no key,
 * updated daily) — the "regularly updated" feed. Toggle between them
 * with the overlay buttons; alert pins open the existing modal.
 */

const ESRI_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics";
const GIBS_ATTR = "Daily imagery © NASA EOSDIS GIBS (MODIS Terra)";
const RISK_COLORS = { High: "#ff7070", Medium: "#f6bd57", Low: "#62e28b" };

// GIBS publishes with ~1 day latency, so request yesterday's mosaic.
export function latestDailyDate() {
  return new Date(Date.now() - 864e5).toISOString().slice(0, 10);
}

function gibsUrl(date) {
  return (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
    "MODIS_Terra_CorrectedReflectance_TrueColor/default/" +
    `${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
  );
}

export default function SatelliteMap({ alerts, onSelect, mode, onModeChange, date }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const esriRef = useRef(null);
  const gibsRef = useRef(null);
  const pinsRef = useRef(null);

  // Initialize once.
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      center: [7.95, -1.05],
      zoom: 6,
      zoomControl: false,
      scrollWheelZoom: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    esriRef.current = L.tileLayer(ESRI_URL, {
      attribution: ESRI_ATTR,
      maxZoom: 18,
    });
    gibsRef.current = L.tileLayer(gibsUrl(date), {
      attribution: `${ESRI_ATTR} | ${GIBS_ATTR}`,
      maxZoom: 18,
      maxNativeZoom: 9, // GIBS Level9 matrix; overzoom above it
    });
    esriRef.current.addTo(map);
    pinsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Base-layer toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !esriRef.current || !gibsRef.current) return;
    if (mode === "daily") {
      if (map.hasLayer(esriRef.current)) map.removeLayer(esriRef.current);
      gibsRef.current.addTo(map);
    } else {
      if (map.hasLayer(gibsRef.current)) map.removeLayer(gibsRef.current);
      esriRef.current.addTo(map);
    }
  }, [mode]);

  // Alert pins from the demo API data.
  useEffect(() => {
    const group = pinsRef.current;
    if (!group) return;
    group.clearLayers();
    alerts.forEach((a) => {
      const marker = L.circleMarker([a.lat, a.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: RISK_COLORS[a.risk] || "#62e28b",
        fillOpacity: 0.9,
      });
      marker.bindTooltip(`<b>${a.location}</b><br/>${a.risk} risk — demo alert`);
      marker.on("click", () => onSelect(a));
      group.addLayer(marker);
    });
  }, [alerts, onSelect]);

  return (
    <div className="satMapWrap">
      <div ref={divRef} className="satMap" />
      <div className="mapToggle" role="group" aria-label="Imagery source">
        <button
          type="button"
          className={mode === "esri" ? "on" : ""}
          onClick={() => onModeChange("esri")}
        >
          Satellite
        </button>
        <button
          type="button"
          className={mode === "daily" ? "on" : ""}
          onClick={() => onModeChange("daily")}
          title={`NASA daily true-color mosaic for ${date}`}
        >
          Daily · {date.slice(5)}
        </button>
      </div>
      <div className="mapLegend">
        <b>Risk layer</b>
        <span><i className="high"></i>High</span>
        <span><i className="medium"></i>Medium</span>
        <span><i className="low"></i>Low</span>
      </div>
    </div>
  );
}
