import React, { useState, useEffect, useRef } from "react";
import { ThreatHotspot } from "../types";
import { Compass, ShieldAlert, Crosshair, MapPin, Activity, X } from "lucide-react";
import { convertToMGRS } from "../utils";
import WorldMap from "world-map-svg";
import "world-map-svg/style.css";

interface IntelligenceMapProps {
  hotspots: ThreatHotspot[];
  onSelectHotspot: (hotspot: ThreatHotspot) => void;
}

// Convert common geopolitical hotspot regions (Thai and English) to ISO countries for high-fidelity HUD mapping
const getCountryCodeFromRegion = (region: string): string => {
  if (!region || typeof region !== "string") return "";
  const norm = region.toLowerCase();
  
  // Specific checks with directions (e.g. western/eastern) first to prevent general category matches
  if (norm.includes("ตะวันตก") || norm.includes("western") || norm.includes("west")) {
    if (norm.includes("ยุโรป") || norm.includes("europe")) return "GB"; // GB represents Western Europe in our layout
  }
  if (norm.includes("ตะวันออก") || norm.includes("eastern") || norm.includes("east")) {
    if (norm.includes("ยุโรป") || norm.includes("europe")) return "UA"; // UA representing Eastern Europe
  }
  
  if (norm.includes("europe") || norm.includes("ukraine") || norm.includes("russia") || norm.includes("ยุโรป") || norm.includes("ยูเครน") || norm.includes("รัสเซีย")) return "UA";
  if (norm.includes("middle east") || norm.includes("gaza") || norm.includes("israel") || norm.includes("iran") || norm.includes("red sea") || norm.includes("ตะวันออกกลาง") || norm.includes("กาซา") || norm.includes("อิสราเอล") || norm.includes("อิหร่าน") || norm.includes("ทะเลแดง")) return "IL";
  if (norm.includes("thailand") || norm.includes("ไทย")) return "TH";
  if (norm.includes("myanmar") || norm.includes("southeast") || norm.includes("indo") || norm.includes("พม่า") || norm.includes("เอเชียตะวันออกเฉียงใต้") || norm.includes("อินโด")) return "MM";
  if (norm.includes("taiwan") || norm.includes("korea") || norm.includes("japan") || norm.includes("china") || norm.includes("ไต้หวัน") || norm.includes("เกาหลี") || norm.includes("ญี่ปุ่น") || norm.includes("จีน") || norm.includes("ทะเลจีน")) return "TW";
  if (norm.includes("africa") || norm.includes("somalia") || norm.includes("sudan") || norm.includes("horn") || norm.includes("แอฟริกา") || norm.includes("โซมาเลีย") || norm.includes("ซูดาน") || norm.includes("จะงอยแอฟริกา")) return "SO";
  if (norm.includes("america") || norm.includes("venezuela") || norm.includes("mexico") || norm.includes("colombia") || norm.includes("อเมริกา") || norm.includes("เวเนซุเอลา") || norm.includes("เม็กซิโก") || norm.includes("โคลอมเบีย")) return "VE";
  return "";
};

export default function IntelligenceMap({ hotspots = [], onSelectHotspot }: IntelligenceMapProps) {
  const [hoveredHotspot, setHoveredHotspot] = useState<ThreatHotspot | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    // Prevent default scrolling on mouse wheel gestures inside the map view
    const preventScroll = (e: WheelEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    // Prevent default scrolling or double-tap-zoom on mobile environments during panning/gestures
    const preventTouch = (e: TouchEvent) => {
      // Prevent page dragging and physical pinches while inside the canvas map region
      if (e.touches.length > 1 || (e as any).scale !== undefined) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    el.addEventListener("wheel", preventScroll, { passive: false });
    el.addEventListener("touchmove", preventTouch, { passive: false });

    return () => {
      el.removeEventListener("wheel", preventScroll);
      el.removeEventListener("touchmove", preventTouch);
    };
  }, []);

  const getPulseColor = (status: "Critical" | "Severe" | "Elevated" | "Low") => {
    switch (status) {
      case "Critical":
        return "bg-red-500 text-red-500";
      case "Severe":
        return "bg-amber-500 text-amber-500";
      case "Elevated":
        return "bg-yellow-500 text-yellow-500";
      default:
        return "bg-emerald-500 text-emerald-500";
    }
  };

  const getStatusColor = (status: "Critical" | "Severe" | "Elevated" | "Low") => {
    switch (status) {
      case "Critical":
        return "text-red-500 border-red-500 bg-red-950/40";
      case "Severe":
        return "text-amber-500 border-amber-500 bg-amber-950/40";
      case "Elevated":
        return "text-yellow-500 border-yellow-500 bg-yellow-950/40";
      default:
        return "text-emerald-500 border-emerald-500 bg-emerald-950/40";
    }
  };

  // Compile active threat countries to display connection vectors and radar markers in SVG Space
  const activeCountries = hotspots
    .map((h) => getCountryCodeFromRegion(h.region))
    .filter((code) => code !== "");

  const handleCountryHover = (countryCode: string | null | undefined, countryName: string | null | undefined, x: number | null | undefined, y: number | null | undefined) => {
    if (!countryCode || typeof countryCode !== "string") {
      setHoveredHotspot(null);
      return;
    }
    const code = countryCode.toUpperCase();
    const matched = hotspots.find((h) => getCountryCodeFromRegion(h.region) === code);
    
    if (matched) {
      setHoveredHotspot(matched);
      onSelectHotspot(matched);
      // Scale positioning slightly for premium micro-UI positioning
      const targetX = typeof x === "number" ? x + 15 : 150;
      const targetY = typeof y === "number" ? y - 10 : 100;
      setTooltipPos({ x: targetX, y: targetY });
    } else {
      setHoveredHotspot(null);
    }
  };

  const handleCountryClick = (countryCode: string | null | undefined, countryName: string | null | undefined) => {
    if (!countryCode || typeof countryCode !== "string") return;
    const code = countryCode.toUpperCase();
    const matched = hotspots.find((h) => getCountryCodeFromRegion(h.region) === code);
    if (matched) {
      onSelectHotspot(matched);
    }
  };

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-hidden shadow-2xl tactical-map-container">
      {/* Sub-style injector for customizing native connection colors to match our high-tech HUD */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Safeguard map viewport and container dimensions in case library styles fail to bundle or load */
        .map-container {
          cursor: grab;
          background: var(--map-background, transparent);
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          touch-action: none !important;
        }
        .map-container.is-panning {
          cursor: grabbing;
        }
        .map-viewport {
          transform-origin: 50% 50%;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          transition: transform 0.2s;
          display: flex;
        }
        .map-svg-wrap {
          width: 100%;
          height: 100%;
        }
        .map-svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .map-svg .country,
        .map-svg path {
          fill: var(--country-fill, #081120) !important;
          stroke: var(--country-stroke, rgba(59, 130, 246, 0.28)) !important;
          stroke-width: 0.6px !important;
          cursor: default !important;
          pointer-events: none !important;
          transform-origin: 50% 50%;
          transition: fill 0.2s, transform 0.2s;
        }
        .map-svg .country.is-selected {
          fill: var(--country-selected, rgba(239, 68, 68, 0.45)) !important;
          stroke: rgba(239, 68, 68, 0.6) !important;
        }
        ${activeCountries.length > 0 ? `
        ${activeCountries.map(code => `.map-svg #${code}, .map-svg path#${code}, .map-svg .country#${code}`).join(', ')} {
          fill: #0d1e36 !important;
          stroke: rgba(59, 130, 246, 0.45) !important;
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        ${activeCountries.map(code => `.map-svg #${code}:hover, .map-svg path#${code}:hover, .map-svg .country#${code}:hover`).join(', ')} {
          fill: rgba(239, 68, 68, 0.25) !important;
          stroke: rgba(239, 68, 68, 0.70) !important;
        }
        ` : ''}
        .tactical-svg-view {
          --map-background: transparent !important;
          --country-fill: #081120 !important;
          --country-stroke: rgba(59, 130, 246, 0.28) !important;
          --country-hover: rgba(239, 68, 68, 0.25) !important;
          --country-selected: rgba(239, 68, 68, 0.45) !important;
        }
        .tactical-map-container .connection-line {
          stroke: #f43f5e !important;
          stroke-width: 1.2px !important;
          opacity: 0.65 !important;
          stroke-dasharray: 2 4;
          animation: connectionDash 30s linear infinite;
        }
        .tactical-map-container .connection-dot {
          fill: #f43f5e !important;
          stroke: #ffffff !important;
          stroke-width: 1px !important;
          r: 5px !important;
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .tactical-map-container .connection-dot:hover {
          fill: #ef4444 !important;
          stroke: #ffffff !important;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
        }
        @keyframes connectionDash {
          to {
            stroke-dashoffset: -100;
          }
        }
      ` }} />

      <div className="absolute top-3 left-3 flex items-center justify-between w-[95%] pointer-events-none z-20">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 backdrop-blur-md">
          <Compass className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
          <span>OSINT GEOPOLITICAL DANGER MATRIX (HIGH-DETECTION REAL-TIME GRAPH)</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono bg-slate-950/80 px-2 py-1 rounded border border-slate-800 pointer-events-auto backdrop-blur-md">
          <span className="inline-block w-2 h-2 rounded bg-red-500 animate-ping"></span>
          <span>SATELLITE SYNC: ACTIVE</span>
        </div>
      </div>

      {/* Styled High-Tech Grid & WorldMap Background Canvas */}
      <div ref={mapContainerRef} className="relative mt-4 w-full aspect-[2/1.3] bg-slate-950 border border-slate-800/80 rounded overflow-hidden">
        {/* Radar concentric rings */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-blue-900/10 rounded-full pointer-events-none"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-900/5 rounded-full pointer-events-none"></div>
        
        {/* Digital Map Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>

        {/* Tactical Crosshair Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-full border-t border-dashed border-slate-700"></div>
          <div className="h-full border-l border-dashed border-slate-700"></div>
        </div>

        {/* Dynamic WorldMap Component with explicit custom colors */}
        <WorldMap
          backgroundColor="transparent"
          countryColor="#081120"
          className="absolute inset-0 w-full h-full tactical-svg-view"
          showConnections={true}
          connectionBase="TH" // Base is set to Thailand corresponding of DEFCON-TH context
          connectedCountries={activeCountries}
          onCountryHover={handleCountryHover}
          onCountryClick={handleCountryClick}
          onConnectionDotHover={handleCountryHover}
          onConnectionDotClick={handleCountryClick}
        />

        {/* Technical Data Overlay */}
        <div className="absolute right-2 bottom-2 font-mono text-[9px] text-slate-600 select-none space-y-0.5 bg-slate-950/90 px-2 py-1 rounded border border-slate-900 z-10 backdrop-blur-sm">
          <div>PROJECTION: MILL-DETAILED MULTI-AXIS</div>
          <div>DATUM: WGS-84 / HIGH-POLY SILHOUETTE</div>
          <div>UTM SHIFT COORDS: CALIBRATED IN REALTIME</div>
        </div>

        {/* Tactical Coordinates Along Corners */}
        <div className="absolute top-1 left-2 font-mono text-[8px] text-slate-700 select-none">180°W</div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 font-mono text-[8px] text-slate-700 select-none">0° MERIDIAN</div>
        <div className="absolute top-1 right-2 font-mono text-[8px] text-slate-700 select-none">180°E</div>

        {/* Tooltip Hover Overlay */}
        {hoveredHotspot && (
          <div
            className="absolute z-30 pointer-events-auto bg-slate-950/95 border border-slate-800 rounded-md p-3 w-72 max-w-[90vw] shadow-2xl backdrop-blur-md animate-fade-in text-xs font-mono"
            style={{
              left: `${Math.max(5, Math.min(tooltipPos.x / 10 - 5, 70))}%`,
              top: `${Math.max(5, Math.min(tooltipPos.y / 6.6, 55))}%`
            }}
          >
            <div className="flex items-center space-x-1.5 mb-2 border-b border-slate-900 pb-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${getPulseColor(hoveredHotspot.status)} animate-ping`}></span>
              <span className="font-bold text-slate-100 truncate max-w-[120px]">{hoveredHotspot.region}</span>
              {hoveredHotspot.threatScore > 0 && (
                <span className="text-slate-400 bg-slate-900 border border-slate-850 px-1 rounded text-[10px]">Score: {hoveredHotspot.threatScore}</span>
              )}
              {/* Escape dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredHotspot(null);
                }}
                className="ml-auto text-slate-500 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-slate-800/80 p-0.5 rounded transition cursor-pointer"
                title="Dismiss Intelligence Overlay"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans text-[11px] text-justify">{hoveredHotspot.incidentsSummary}</p>
            {hoveredHotspot.coords && typeof hoveredHotspot.coords.lat === "number" && typeof hoveredHotspot.coords.lng === "number" && hoveredHotspot.coords.lat !== 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-850 text-[10px] text-slate-500 space-y-1">
                <div className="flex justify-between font-mono text-[9px]">
                  <span>LAT: {hoveredHotspot.coords.lat.toFixed(2)}</span>
                  <span>LNG: {hoveredHotspot.coords.lng.toFixed(2)}</span>
                </div>
                <div className="text-indigo-400 font-bold tracking-wider text-[9px] border-t border-slate-850 pt-1 text-center font-mono">
                  MGRS: {convertToMGRS(hoveredHotspot.coords.lat, hoveredHotspot.coords.lng)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid listing beneath map */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {hotspots.map((h, i) => (
          <div
            key={i}
            onClick={() => {
              onSelectHotspot(h);
              setHoveredHotspot(h);
              // Center-top premium aligned position on the projection layout
              setTooltipPos({ x: 450, y: 120 });
            }}
            className={`cursor-pointer transition-all p-2.5 rounded border ${
              hoveredHotspot?.region === h.region
                ? "bg-slate-900 border-indigo-500 shadow-md"
                : "bg-slate-950/50 border-slate-800/60 hover:bg-slate-900"
            } flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-xs text-slate-200">{h.region}</span>
              <span className={`text-[10px] uppercase px-1 rounded leading-none ${
                h.status === "Critical" ? "bg-red-950 text-red-500 border border-red-800/40" :
                h.status === "Severe" ? "bg-amber-950 text-amber-500 border border-amber-800/40" :
                h.status === "Elevated" ? "bg-yellow-950 text-yellow-500 border border-yellow-800/40" :
                "bg-emerald-950 text-emerald-500 border border-emerald-800/40"
              }`}>
                {h.status}
              </span>
            </div>
            <div className="mt-2.5 flex items-end justify-between font-mono">
              <span className="text-[10px] text-slate-500">THREAT COMPONENT</span>
              <span className="text-sm font-bold text-slate-300">{h.threatScore}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
