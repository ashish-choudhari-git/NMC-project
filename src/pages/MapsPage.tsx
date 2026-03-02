import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MainLayout from "@/components/layout/MainLayout";
import { Loader2, LocateFixed, Navigation } from "lucide-react";

const MapsPage = () => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<"loading" | "found" | "denied" | "unsupported">("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Fix Leaflet default icons in Vite
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      center: [21.1458, 79.0882], // Nagpur default
      zoom: 13,
      zoomControl: true,
    });

    // Satellite imagery (Esri World Imagery — free, no API key)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN",
        maxZoom: 19,
      }
    ).addTo(map);

    // Road / label overlay on top of satellite
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 0.7 }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const locateMe = () => {
    setStatus("loading");
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setCoords({ lat, lng, accuracy });
        setStatus("found");

        const map = mapRef.current;
        if (!map) return;

        // Remove previous marker / circle
        if (markerRef.current) { markerRef.current.remove(); }
        if (circleRef.current) { circleRef.current.remove(); }

        // Blue dot icon (like Google Maps)
        const blueDot = L.divIcon({
          className: "",
          html: `<div style="
            width:18px;height:18px;
            background:#4285F4;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 2px 8px rgba(66,133,244,0.6);
          "></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        // Accuracy circle
        const circle = L.circle([lat, lng], {
          radius: accuracy,
          color: "#4285F4",
          fillColor: "#4285F4",
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(map);

        const marker = L.marker([lat, lng], { icon: blueDot })
          .addTo(map)
          .bindPopup(`<b>You are here</b><br/>Accuracy: ±${Math.round(accuracy)} m`)
          .openPopup();

        markerRef.current = marker;
        circleRef.current = circle;

        map.setView([lat, lng], 17, { animate: true });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Auto-locate on mount
  useEffect(() => {
    locateMe();
  }, []);

  return (
    <MainLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 z-10">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-800 text-sm">My Location</span>
            {coords && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)} m
              </span>
            )}
          </div>
          <button
            onClick={locateMe}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          >
            {status === "loading"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Locating…</>
              : <><LocateFixed className="w-3.5 h-3.5" /> Locate Me</>
            }
          </button>
        </div>

        {/* Status overlays */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-20 top-16">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
            <p className="text-slate-600 font-medium">Detecting your location…</p>
            <p className="text-xs text-slate-400 mt-1">Please allow location access if prompted</p>
          </div>
        )}

        {status === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 top-16">
            <LocateFixed className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-slate-700 font-semibold mb-1">Location access denied</p>
            <p className="text-xs text-slate-400 text-center max-w-xs mb-4">
              Please allow location permission in your browser settings, then try again.
            </p>
            <button
              onClick={locateMe}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {status === "unsupported" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 top-16">
            <p className="text-slate-700 font-semibold">Geolocation not supported in this browser.</p>
          </div>
        )}

        {/* Map */}
        <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
      </div>
    </MainLayout>
  );
};

export default MapsPage;
