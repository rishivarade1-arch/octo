import React from 'react';
import {
  Camera,
  ShieldAlert,
  Lock,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Users,
  Building2,
  Sparkles,
  Smartphone
} from 'lucide-react';

interface LandingScreenProps {
  onSelectCitizen: () => void;
  onSelectAdmin: () => void;
  totalReportsCount?: number;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onSelectCitizen,
  onSelectAdmin,
  totalReportsCount = 0
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center gap-8 md:gap-12 animate-in fade-in duration-200">
      
      {/* Hero Header */}
      <div className="text-center flex flex-col items-center gap-3.5 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Municipal Public Infrastructure Reporting Portal</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          RoadWatch <span className="text-amber-500">AI</span>
        </h1>

        <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl">
          Empowering citizens to report road hazards, potholes, open drains, and broken streetlights with instant AI verification and municipal workflow routing.
        </p>
      </div>

      {/* Two Big Primary Selection Buttons / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        
        {/* 1. Citizen Portal Card */}
        <div
          onClick={onSelectCitizen}
          className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-blue-50/40 rounded-3xl p-6 md:p-8 border-2 border-slate-200 hover:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-6 cursor-pointer"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition">
                <Camera className="w-7 h-7 text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                No Login Required
              </span>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight group-hover:text-blue-950 transition">
                Report an Issue (Citizen)
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Take or upload a photo of road hazards, auto-detect GPS location, get instant AI inspection feedback, and track your submitted tickets.
              </p>
            </div>

            <ul className="text-xs text-slate-600 flex flex-col gap-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Camera & GPS auto-detection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Instant AI hazard severity & risk scan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Track "My Reports" on this device</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-900 group-hover:bg-blue-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Report an Issue (Citizen)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </button>
        </div>

        {/* 2. Admin Portal Card */}
        <div
          onClick={onSelectAdmin}
          className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-slate-50 rounded-3xl p-6 md:p-8 border-2 border-slate-200 hover:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-6 cursor-pointer"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/20 group-hover:scale-105 transition">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                Secure Municipal Access
              </span>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight group-hover:text-slate-950 transition">
                Admin Login
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Authorized municipal dashboard for municipal engineers and dispatchers. View full GIS map, ranked priority queue, update statuses, and generate official complaint dockets.
              </p>
            </div>

            <ul className="text-xs text-slate-600 flex flex-col gap-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Full GIS map & problem density heatmap</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Status workflow (Reported / Assigned / Fixed)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Formal 72-hr complaint docket generator</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 group-hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Admin Login</span>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

      </div>

      {/* Footer Informational Badge */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>Indian Road Congress (IRC) Safety Audits</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-slate-400" />
          <span>Mobile Device Tracking Active</span>
        </span>
      </div>

    </div>
  );
};
