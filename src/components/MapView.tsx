import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Report } from '../types';
import { Layers, Maximize2, Navigation, Flame, Eye, EyeOff } from 'lucide-react';
import { calculatePriorityScore, CriticalLocation, DEFAULT_CRITICAL_LOCATIONS } from '../criticalLocations';

interface MapViewProps {
  reports: Report[];
  selectedReportId?: string | null;
  onSelectReport?: (report: Report) => void;
  criticalLocations?: CriticalLocation[];
  className?: string;
  isHeatmapEnabled?: boolean;
  onToggleHeatmap?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  criticalLocations = DEFAULT_CRITICAL_LOCATIONS,
  className = '',
  isHeatmapEnabled: propHeatmapEnabled,
  onToggleHeatmap: propToggleHeatmap
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  // Local heatmap state if not controlled from parent
  const [localHeatmap, setLocalHeatmap] = useState(false);
  const isHeatmapActive = propHeatmapEnabled !== undefined ? propHeatmapEnabled : localHeatmap;

  const toggleHeatmap = () => {
    if (propToggleHeatmap) {
      propToggleHeatmap();
    } else {
      setLocalHeatmap((prev) => !prev);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [19.0760, 72.8777], // Center of Mumbai Metropolitan Area
        zoom: 11,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Create layers
      heatmapLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {};
  }, []);

  // Update Markers & Heatmap whenever reports, selectedReportId, criticalLocations, or heatmap state change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const heatmapLayer = heatmapLayerRef.current;
    if (!map || !markersLayer || !heatmapLayer) return;

    markersLayer.clearLayers();
    heatmapLayer.clearLayers();

    if (reports.length === 0) return;

    const bounds = L.latLngBounds([]);

    // 1. Render Problem-Dense Heatmap if enabled
    if (isHeatmapActive) {
      reports.forEach((report) => {
        if (typeof report.latitude !== 'number' || typeof report.longitude !== 'number') return;
        if (isNaN(report.latitude) || isNaN(report.longitude)) return;

        const scoreBreakdown = calculatePriorityScore(report, reports, criticalLocations);
        const weight = scoreBreakdown.totalScore;

        // Weight determines heat color intensity and spread
        const isCritical = weight >= 70;
        const isMedium = weight >= 40 && weight < 70;

        const outerColor = isCritical ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981';
        const innerColor = isCritical ? '#b91c1c' : isMedium ? '#d97706' : '#059669';

        // Outer ambient heat halo (500m - 750m)
        const outerCircle = L.circle([report.latitude, report.longitude], {
          radius: isCritical ? 650 : isMedium ? 500 : 380,
          fillColor: outerColor,
          fillOpacity: 0.18,
          stroke: false,
          interactive: false,
        });

        // Mid heat concentration zone (300m - 450m)
        const midCircle = L.circle([report.latitude, report.longitude], {
          radius: isCritical ? 400 : isMedium ? 300 : 220,
          fillColor: outerColor,
          fillOpacity: 0.32,
          stroke: false,
          interactive: false,
        });

        // Core hotspot intensity (150m - 220m)
        const coreCircle = L.circle([report.latitude, report.longitude], {
          radius: isCritical ? 200 : isMedium ? 150 : 100,
          fillColor: innerColor,
          fillOpacity: 0.55,
          color: innerColor,
          weight: 1,
          opacity: 0.8,
          interactive: false,
        });

        heatmapLayer.addLayer(outerCircle);
        heatmapLayer.addLayer(midCircle);
        heatmapLayer.addLayer(coreCircle);
      });
    }

    // 2. Render Pin Markers with Priority Badges
    reports.forEach((report) => {
      if (typeof report.latitude !== 'number' || typeof report.longitude !== 'number') return;
      if (isNaN(report.latitude) || isNaN(report.longitude)) return;

      const scoreBreakdown = calculatePriorityScore(report, reports, criticalLocations);
      const isSelected = report.id === selectedReportId;

      // Color badge rule: red 70+, orange 40-69, green below 40
      const pinColor =
        scoreBreakdown.totalScore >= 70
          ? '#dc2626' // red-600
          : scoreBreakdown.totalScore >= 40
          ? '#f59e0b' // orange/amber-500
          : '#16a34a'; // green/emerald-600

      const pinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative cursor-pointer transition-transform duration-200 ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }" style="transform: translate(-50%, -100%);">
            <div style="background-color: ${pinColor}; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4); border: 2px solid white; display: flex; align-items: center; gap: 4px; ${
              isSelected ? 'outline: 3px solid #1e3a8a; box-shadow: 0 0 16px rgba(30, 58, 138, 0.8);' : ''
            }">
              <span>${scoreBreakdown.totalScore}</span>
            </div>
            <div style="width: 0; height: 0; margin: 0 auto; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${pinColor};"></div>
          </div>
        `,
        iconSize: [42, 48],
        iconAnchor: [21, 48],
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: pinIcon });

      const statusBadgeBg =
        report.status === 'Fixed'
          ? '#d1fae5; color: #065f46; border: 1px solid #a7f3d0'
          : report.status === 'Assigned'
          ? '#dbeafe; color: #1e40af; border: 1px solid #bfdbfe'
          : '#fef3c7; color: #92400e; border: 1px solid #fde68a';

      const fallbackPlaceholderHtml = `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 8px; box-sizing: border-box; text-align: center;"><svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"22\\" height=\\"22\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"#94a3b8\\" stroke-width=\\"2\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" style=\\"margin-bottom: 4px;\\"><path d=\\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\\"/><circle cx=\\"12\\" cy=\\"13\\" r=\\"3\\"/></svg><span style=\\"font-size: 11px; font-weight: 600; color: #cbd5e1;\\">No photo available</span></div>`;

      const photoHtml = report.image && report.image.trim().length > 0
        ? `<img src="${report.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${report.issue_type}" onerror="this.outerHTML='${fallbackPlaceholderHtml.replace(/"/g, '&quot;')}'" />`
        : fallbackPlaceholderHtml;

      const popupContent = document.createElement('div');
      popupContent.className = 'font-sans text-slate-800 text-xs';
      popupContent.innerHTML = `
        <div style="min-width: 220px; max-width: 260px;">
          <!-- Photo with neutral fallback -->
          <div style="width: 100%; height: 120px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #0f172a; position: relative;">
            ${photoHtml}
            <div style="position: absolute; top: 6px; right: 6px; background: rgba(15,23,42,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; z-index: 5;">
              Sev: ${report.severity}/10
            </div>
          </div>

          <!-- Header: Issue Type & Status -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 4px;">
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: capitalize;">
              ${(report.issue_type || 'Hazard').replace('_', ' ')}
            </div>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: ${statusBadgeBg}; text-transform: uppercase;">
              ${report.status}
            </span>
          </div>

          <!-- Key Metrics: Priority Score & Severity -->
          <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;">
            <div>
              <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">Priority Score</div>
              <div style="font-size: 13px; font-weight: 900; color: ${pinColor};">
                ${scoreBreakdown.totalScore} / 100
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">Severity</div>
              <div style="font-size: 13px; font-weight: 800; color: #1e293b;">
                ${report.severity} / 10
              </div>
            </div>
          </div>

          <!-- Note / Location -->
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px; line-height: 1.3;">
            <b>Location:</b> ${report.locationName || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
          </div>

          ${
            report.note
              ? `<div style="font-size: 10px; color: #334155; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; line-height: 1.3; margin-top: 4px;">
                  "${report.note}"
                </div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectReport) {
          onSelectReport(report);
        }
      });

      markersLayer.addLayer(marker);
      bounds.extend([report.latitude, report.longitude]);
    });

    if (selectedReportId) {
      const selected = reports.find((r) => r.id === selectedReportId);
      if (selected && !isNaN(selected.latitude) && !isNaN(selected.longitude)) {
        map.setView([selected.latitude, selected.longitude], 14, { animate: true });
      }
    }
  }, [reports, selectedReportId, onSelectReport, criticalLocations, isHeatmapActive]);

  const handleFitAll = () => {
    if (!mapInstanceRef.current || reports.length === 0) return;
    const validCoords = reports.filter(r => !isNaN(r.latitude) && !isNaN(r.longitude));
    if (validCoords.length === 0) return;
    const bounds = L.latLngBounds(validCoords.map(r => [r.latitude, r.longitude]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  return (
    <div className={`relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating map controls */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2">
        {/* Heatmap Toggle Button on Map */}
        <button
          onClick={toggleHeatmap}
          title="Toggle Hazard Density Heatmap"
          className={`p-2.5 rounded-xl shadow-lg border transition flex items-center justify-center text-xs font-bold gap-1.5 backdrop-blur cursor-pointer ${
            isHeatmapActive
              ? 'bg-red-600 text-white border-red-500 shadow-red-600/30 ring-2 ring-red-400/50'
              : 'bg-white/95 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${isHeatmapActive ? 'text-amber-300 animate-pulse' : 'text-red-500'}`} />
          <span className="hidden sm:inline">
            {isHeatmapActive ? 'Heatmap: ON' : 'Heatmap: OFF'}
          </span>
        </button>

        {/* Fit All Pins Button */}
        <button
          onClick={handleFitAll}
          title="Fit all hazards"
          className="bg-white/95 hover:bg-white text-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-center text-xs font-semibold gap-1.5 backdrop-blur cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-900" />
          <span className="hidden sm:inline">Fit All Pins</span>
        </button>
      </div>

      {/* Map Legend Overlay with Heatmap indication */}
      <div className="absolute top-3 left-3 z-20 bg-slate-900/90 text-white backdrop-blur px-3 py-2 rounded-xl text-xs shadow-lg border border-slate-700/60 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-400/40"></span>
          <span className="text-[11px] font-bold text-slate-200">70+ (Red)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300/40"></span>
          <span className="text-[11px] font-bold text-slate-200">40-69 (Orange)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-300/40"></span>
          <span className="text-[11px] font-bold text-slate-200">&lt;40 (Green)</span>
        </div>
        {isHeatmapActive && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 border-l border-slate-700 pl-2">
            <Flame className="w-3 h-3 text-red-400 animate-pulse" />
            <span>Density Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
