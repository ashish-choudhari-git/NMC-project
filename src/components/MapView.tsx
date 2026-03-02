import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon broken in Vite/Webpack build
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  status?: string;
  color?: "green" | "red" | "blue" | "amber" | "default";
}

interface MapViewProps {
  lat?: number;
  lng?: number;
  markers?: MapMarker[];
  height?: string;
  zoom?: number;
  className?: string;
}

const STATUS_COLOR: Record<string, string> = {
  resolved: "green",
  rejected: "red",
  in_progress: "blue",
  pending_verification: "blue",
  pending: "amber",
};

const dotIcon = (color: string) =>
  L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const COLOR_MAP: Record<string, string> = {
  green: "#16a34a",
  red: "#dc2626",
  blue: "#2563eb",
  amber: "#d97706",
  default: "#475569",
};

/**
 * MapView — pure Leaflet, no React-Leaflet (avoids React 19 peer-dep)
 * Uses OpenStreetMap tiles for free, unlimited usage.
 */
const MapView = ({
  lat,
  lng,
  markers = [],
  height = "300px",
  zoom = 15,
  className = "",
}: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Determine center
    let centerLat = lat;
    let centerLng = lng;

    if (!centerLat || !centerLng) {
      if (markers.length > 0) {
        centerLat = markers[0].lat;
        centerLng = markers[0].lng;
      } else {
        // Default: Nagpur
        centerLat = 21.1458;
        centerLng = 79.0882;
      }
    }

    // Init map (or re-use)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    // Satellite imagery (Esri World Imagery — free, no API key)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles © Esri — Maxar, GeoEye, Earthstar Geographics",
        maxZoom: 19,
      }
    ).addTo(map);

    // Road labels overlay on top of satellite
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 0.7 }
    ).addTo(map);

    // Single marker (no markers array passed)
    if (lat && lng && markers.length === 0) {
      L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Complaint location");
    }

    // Multiple markers
    if (markers.length > 0) {
      const bounds: L.LatLngTuple[] = [];
      markers.forEach((m) => {
        const statusColor = m.status ? STATUS_COLOR[m.status] ?? "default" : m.color ?? "default";
        const hexColor = COLOR_MAP[statusColor] ?? COLOR_MAP.default;
        const icon = dotIcon(hexColor);
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        if (m.label) {
          marker.bindPopup(`<div style="font-size:12px;max-width:180px">${m.label}</div>`);
        }
        bounds.push([m.lat, m.lng]);
      });

      if (bounds.length > 1) {
        try {
          map.fitBounds(bounds, { padding: [30, 30] });
        } catch {}
      }
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, zoom, JSON.stringify(markers)]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`rounded-xl overflow-hidden border border-slate-200 ${className}`}
    />
  );
};

export default MapView;
