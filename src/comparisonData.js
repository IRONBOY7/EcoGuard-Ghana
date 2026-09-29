/**
 * Before/After comparison data, kept separate from presentation.
 *
 * Imagery: EOX Sentinel-2 cloudless annual mosaics (free, no key).
 * To use Google Earth Engine results later, replace `layer(year)`
 * with the EE tile-URL template — the component needs no changes.
 */

export const EOX_ATTRIBUTION =
  "Imagery: EOX Sentinel-2 cloudless mosaics — contains modified Copernicus Sentinel data";

export function eoxTileUrl(year) {
  return (
    `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/` +
    "default/GoogleMapsCompatible/{z}/{y}/{x}.jpg"
  );
}

const PROTOTYPE_SOURCE =
  "Prototype estimates from Sentinel-2 annual mosaics (vegetation + bare-soil proxies) over the map window — indicative, not field-validated.";

export const COMPARISON_SITES = [
  {
    id: "oda-river",
    name: "Oda River area",
    center: [6.321, -1.736],
    zoom: 12,
    before: { year: 2018 },
    after: { year: 2023 },
    summary: {
      forest: {
        label: "Forest cover",
        from: "16,959.89 ha",
        to: "15,952.82 ha",
      },
      mining: {
        label: "Mining area",
        from: "52.78 ha",
        to: "1,059.85 ha",
      },
      status: "Significant change detected",
      period: "2018 → 2023",
      sourced: true,
      source:
        "Source: Abugre et al. (2025) — published research, not calculated by this prototype.",
    },
  },
  {
    id: "apamprama",
    name: "Apamprama Forest Reserve",
    center: [6.36, -1.83],
    zoom: 12,
    before: { year: 2018 },
    after: { year: 2023 },
    summary: {
      forest: {
        label: "Forest cover",
        from: "3,628 ha",
        to: "3,460 ha",
      },
      mining: {
        display: "168 ha mined (cumulative, 2019)",
      },
      status: "Change detected",
      period: "2013 → 2019",
      sourced: true,
      source:
        "Source: Mantey & Otoo (UMaT conference) — UAV + Google Earth assessment.",
    },
  },
  {
    id: "tano-offin",
    name: "Tano Offin",
    center: [6.52, -2.02],
    zoom: 12,
    before: { year: 2018 },
    after: { year: 2023 },
    summary: {
      forest: {
        label: "Forest cover",
        from: "≈34,321 ha",
        to: "≈29,649 ha",
      },
      mining: {
        label: "Mining area",
        from: "≈1,546 ha",
        to: "≈3,041 ha",
      },
      status: "Change detected",
      period: "2018 → 2023",
      sourced: false,
      source: PROTOTYPE_SOURCE,
    },
  },
  {
    id: "upper-wassaw",
    name: "Upper Wassaw",
    center: [5.75, -2.08],
    zoom: 12,
    before: { year: 2018 },
    after: { year: 2023 },
    summary: {
      forest: {
        label: "Forest cover",
        from: "≈36,931 ha",
        to: "≈35,270 ha",
      },
      mining: {
        label: "Mining area",
        from: "≈277 ha",
        to: "≈667 ha",
      },
      status: "Change detected",
      period: "2018 → 2023",
      sourced: false,
      source: PROTOTYPE_SOURCE,
    },
  },
  {
    id: "custom",
    name: "Custom monitoring area",
    center: [6.7, -1.62],
    zoom: 12,
    before: { year: 2018 },
    after: { year: 2023 },
    summary: {
      forest: {
        label: "Forest cover",
        from: "≈6,687 ha",
        to: "≈4,920 ha",
      },
      mining: {
        label: "Mining area",
        from: "≈24,866 ha",
        to: "≈17,792 ha",
      },
      status: "Change detected",
      period: "2018 → 2023",
      sourced: false,
      source: PROTOTYPE_SOURCE,
    },
  },
];
