import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Building,
  School,
  Hospital,
  Compass,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ScoreBreakdown } from '../criticalLocations';

interface PriorityScoreBadgeProps {
  breakdown: ScoreBreakdown;
  severity: number;
  issueType?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetailsByDefault?: boolean;
}

export const PriorityScoreBadge: React.FC<PriorityScoreBadgeProps> = ({
  breakdown,
  severity,
  issueType,
  size = 'md',
  showDetailsByDefault = false,
}) => {
  const [isOpen, setIsOpen] = useState(showDetailsByDefault);

  // Color badge rules: red 70+, orange 40-69, green below 40
  const getBadgeStyle = (score: number) => {
    if (score >= 70) {
      return {
        bg: 'bg-red-600',
        text: 'text-white',
        border: 'border-red-500',
        label: 'Critical Priority (70+)',
        glow: 'shadow-red-500/25',
        ring: 'ring-red-400/40',
        chipBg: 'bg-red-50 text-red-900 border-red-200'
      };
    }
    if (score >= 40) {
      return {
        bg: 'bg-amber-500',
        text: 'text-slate-950',
        border: 'border-amber-400',
        label: 'Medium Priority (40-69)',
        glow: 'shadow-amber-500/25',
        ring: 'ring-amber-300/40',
        chipBg: 'bg-amber-50 text-amber-900 border-amber-200'
      };
    }
    return {
      bg: 'bg-emerald-600',
      text: 'text-white',
      border: 'border-emerald-500',
      label: 'Standard Priority (<40)',
      glow: 'shadow-emerald-500/25',
      ring: 'ring-emerald-400/40',
      chipBg: 'bg-emerald-50 text-emerald-900 border-emerald-200'
    };
  };

  const badgeStyle = getBadgeStyle(breakdown.totalScore);

  const getLandmarkIcon = (type?: string) => {
    switch (type) {
      case 'school':
        return <School className="w-3.5 h-3.5 text-blue-600" />;
      case 'hospital':
        return <Hospital className="w-3.5 h-3.5 text-rose-600" />;
      case 'highway':
        return <Compass className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Building className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Priority Badge & Expand Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Main Color Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs shadow-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${badgeStyle.glow}`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Priority Score: {breakdown.totalScore}/100</span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            ({badgeStyle.label})
          </span>
        </div>

        {/* Small "Why this score?" Expandable Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 hover:text-blue-700 hover:underline transition px-1.5 py-0.5 rounded cursor-pointer"
        >
          <HelpCircle className="w-3 h-3 text-blue-700" />
          <span>Why this score?</span>
          {isOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Expandable Breakdown Drawer */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-1 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs text-slate-800 shadow-inner flex flex-col gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-900" />
              <span>Priority Score Calculation Formula</span>
            </span>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-600">
              score = severity*5 + locationRisk + duplicateBonus
            </span>
          </div>

          {/* Breakdown Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            
            {/* 1. Severity Points */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                1. Severity Factor
              </span>
              <div className="my-1 flex items-baseline justify-between">
                <span className="font-black text-base text-slate-900">
                  +{breakdown.severityPoints} pts
                </span>
                <span className="text-[10px] text-slate-400 font-mono">max 50</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                Severity {severity} × 5 = <b>{breakdown.severityPoints}</b>
              </p>
            </div>

            {/* 2. Location Risk */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                2. Location Risk
              </span>
              <div className="my-1 flex items-baseline justify-between">
                <span
                  className={`font-black text-base ${
                    breakdown.locationRisk > 0 ? 'text-blue-900' : 'text-slate-500'
                  }`}
                >
                  +{breakdown.locationRisk} pts
                </span>
                <span className="text-[10px] text-slate-400 font-mono">max 30</span>
              </div>
              <div className="text-[11px] text-slate-600 leading-tight">
                {breakdown.nearestLocation ? (
                  <div className="flex items-start gap-1">
                    <span className="shrink-0 mt-0.5">
                      {getLandmarkIcon(breakdown.nearestLocation.location.type)}
                    </span>
                    <span>
                      {breakdown.nearestLocation.distanceMeters}m from{' '}
                      <b>{breakdown.nearestLocation.location.name}</b>
                      {breakdown.nearestLocation.distanceMeters <= 300
                        ? ' (≤300m: +30 pts)'
                        : breakdown.nearestLocation.distanceMeters <= 1000
                        ? ' (≤1km: +15 pts)'
                        : ' (>1km: 0 pts)'}
                    </span>
                  </div>
                ) : (
                  <span>No school/hospital/highway within 1km (0 pts)</span>
                )}
              </div>
            </div>

            {/* 3. Duplicate Bonus */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                3. Duplicate Density
              </span>
              <div className="my-1 flex items-baseline justify-between">
                <span
                  className={`font-black text-base ${
                    breakdown.duplicateBonus > 0 ? 'text-amber-700' : 'text-slate-500'
                  }`}
                >
                  +{breakdown.duplicateBonus} pts
                </span>
                <span className="text-[10px] text-slate-400 font-mono">max 20</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {breakdown.duplicateCount > 0 ? (
                  <span>
                    <b>{breakdown.duplicateCount}</b> other {issueType || 'hazard'} within 100m (+5 each, capped at 20)
                  </span>
                ) : (
                  <span>0 other reports of same type within 100m</span>
                )}
              </p>
            </div>

          </div>

          {/* Summation calculation line */}
          <div className="p-2 rounded-xl bg-blue-900 text-white text-xs flex items-center justify-between font-medium">
            <span className="text-blue-200 text-[11px]">
              Formula: {breakdown.severityPoints} (severity) + {breakdown.locationRisk} (location) + {breakdown.duplicateBonus} (duplicates)
            </span>
            <span className="font-bold text-sm">
              = {breakdown.totalScore} / 100
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
