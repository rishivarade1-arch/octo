import React, { useState } from 'react';
import {
  Camera,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Users,
  Wrench,
  Cpu,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { Report, InspectionData } from '../types';
import { ReportForm } from './ReportForm';
import { ImageWithFallback } from './ImageWithFallback';


interface CitizenViewProps {
  reports: Report[];
  currentDeviceId: string;
  onSubmitReport: (newReport: Omit<Report, 'id' | 'timestamp' | 'status'>) => Promise<string>;
  onBackToLanding: () => void;
  onGoToAdminLogin: () => void;
}

export const CitizenView: React.FC<CitizenViewProps> = ({
  reports,
  currentDeviceId,
  onSubmitReport,
  onBackToLanding,
  onGoToAdminLogin
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'my-reports'>('report');

  // Filter ONLY reports submitted from this device (tracked with currentDeviceId)
  const myReports = reports.filter((r) => r.deviceId === currentDeviceId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fixed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6 animate-in fade-in duration-150">
      
      {/* Top Citizen Header Bar with Prominent "Citizen Mode" Label */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLanding}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Return to Portal Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900">
                Citizen Reporting Desk
              </span>
              {/* CLEAR VISIBLE CITIZEN MODE LABEL */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Citizen Mode
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Submit public hazards and track updates on your reported tickets.
            </p>
          </div>
        </div>

        {/* Citizen Navigation: Report Issue vs My Reports */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>

            <button
              onClick={() => setActiveTab('my-reports')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
                activeTab === 'my-reports'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>My Reports</span>
              {myReports.length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {myReports.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onGoToAdminLogin}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-semibold transition"
          >
            Admin Login →
          </button>
        </div>
      </div>

      {/* Main Content: Form or My Reports */}
      {activeTab === 'report' ? (
        <ReportForm
          onSubmitReport={onSubmitReport}
          onNavigateToDashboard={() => setActiveTab('my-reports')}
        />
      ) : (
        /* Citizen "My Reports" View: Only reports from this device */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                My Submitted Reports
              </h2>
              <p className="text-xs text-slate-500">
                Showing only tickets recorded from this device ({myReports.length} total)
              </p>
            </div>

            <button
              onClick={() => setActiveTab('report')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Submit Another</span>
            </button>
          </div>

          {myReports.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  No reports logged from this device yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  When you photograph and report a road defect or hazard, its tracking card and municipal status will appear here.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('report')}
                className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span>Report Your First Hazard</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header: Ticket ID & Status */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        #{report.id}
                      </span>
                      {/* Read-only status pill (no controls or dropdown) */}
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(report.status)}`}>
                        {report.status}
                      </span>
                    </div>

                    {/* Image Preview with neutral fallback */}
                    <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-900 relative">
                      <ImageWithFallback
                        src={report.image}
                        alt="My reported hazard"
                        className="w-full h-full object-cover"
                        fallbackClassName="w-full h-full"
                      />
                      <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                        Sev: {report.severity}/10
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                      <span className="truncate">{report.locationName || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
                    </div>

                    {/* AI Result Card for Citizen's Own Report */}
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between font-bold text-blue-950">
                        <span className="capitalize">{report.issue_type?.replace('_', ' ')}</span>
                        <span className="text-[10px] font-mono text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                          Confidence: {report.confidence}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700">
                        <span className="font-bold text-red-700">Risk Assessment: </span>
                        {report.risk_reason}
                      </p>
                      <p className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-lg border border-blue-100">
                        <span className="font-bold text-blue-900">Repair Action: </span>
                        {report.recommended_action}
                      </p>
                    </div>

                    {report.note && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 italic">
                        "{report.note}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Timestamp & Read-only Status Message */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{report.timestamp}</span>
                    </span>
                    <span className="font-medium text-slate-600">
                      {report.status === 'Fixed'
                        ? '✅ Issue resolved by municipal team'
                        : report.status === 'Assigned'
                        ? '🛠️ Repair gang assigned'
                        : '⏳ Queued for municipal inspection'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
