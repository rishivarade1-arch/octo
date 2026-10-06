import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  MapPin,
  Camera,
  Layers,
  PlusCircle,
  FileCheck,
  Building2,
  Sparkles,
  Info,
  Lock,
  LogOut,
  User,
  Home,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { Report, ReportStatus } from './types';
import { ensureReportImage } from './utils/imageGenerator';
import { reverseGeocode } from './utils/reverseGeocoding';
import { LandingScreen } from './components/LandingScreen';

import { CitizenView } from './components/CitizenView';
import { AdminLogin, ADMIN_USERNAME, ADMIN_PASSWORD } from './components/AdminLogin';
import { DashboardView } from './components/DashboardView';
import {
  CriticalLocation,
  DEFAULT_CRITICAL_LOCATIONS
} from './criticalLocations';
import { getOrCreateDeviceId } from './utils/device';

const STORAGE_KEY = 'roadwatch_ai_reports_v1';
const ADMIN_SESSION_KEY = 'roadwatch_admin_session_active';

export default function App() {
  // Stored device ID for tracking reports submitted from this client device
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());

  // Navigation View State: 'landing' | 'citizen' | 'admin-login' | 'admin-dashboard'
  const [currentView, setCurrentView] = useState<'landing' | 'citizen' | 'admin-login' | 'admin-dashboard'>('landing');

  // Session State: Read from sessionStorage so page refresh maintains admin login
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Store reports in browser memory (with localStorage persistence)
  // Demo data is completely removed. Storage starts empty ([]).
  // Any existing demo reports previously in storage are filtered out.
  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out all demo reports (RW-MUM-* and early demo IDs)
          const nonDemoReports = parsed.filter((r: Report) => {
            if (!r || !r.id) return false;
            if (r.id.startsWith('RW-MUM-')) return false;
            if (['RW-2026-101', 'RW-2026-102', 'RW-2026-103', 'RW-2026-104', 'RW-2026-105'].includes(r.id)) return false;
            return true;
          });

          // Sync cleaned non-demo reports back to storage so demo data is erased
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nonDemoReports));

          return nonDemoReports.map((r: Report) => ({
            ...r,
            image: ensureReportImage(r)
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    // Clean initial state: zero demo data
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Could not initialize localStorage:', e);
    }
    return [];
  });

  // Fixed hardcoded critical locations list (schools, hospitals, highways) around Mumbai
  const criticalLocations = DEFAULT_CRITICAL_LOCATIONS;

  // Route Protection: if admin dashboard is opened without being logged in, redirect to login
  useEffect(() => {
    if (currentView === 'admin-dashboard' && !isAdminLoggedIn) {
      setCurrentView('admin-login');
    }
  }, [currentView, isAdminLoggedIn]);

  // Sync reports to browser memory storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }, [reports]);

  // Reverse geocode existing reports missing a readable address
  useEffect(() => {
    reports.forEach((report) => {
      const isMissingAddress =
        !report.address ||
        !report.locationName ||
        report.locationName === `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` ||
        report.locationName.endsWith('(Address unavailable)');

      if (isMissingAddress) {
        reverseGeocode(report.latitude, report.longitude).then((resolved) => {
          if (resolved) {
            setReports((prev) =>
              prev.map((r) =>
                r.id === report.id
                  ? {
                      ...r,
                      address: resolved,
                      locationName: resolved,
                      addressStatus: 'available'
                    }
                  : r
              )
            );
          }
        });
      }
    });
  }, [reports.length]);

  // Handle adding a new report (stamps with deviceId)
  const handleAddReport = async (newReportData: Omit<Report, 'id' | 'timestamp' | 'status'>): Promise<string> => {
    const newId = `RW-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date();
    const timeFormatted = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newReport: Report = {
      ...newReportData,
      id: newId,
      timestamp: timeFormatted,
      status: 'Reported',
      deviceId: deviceId
    };

    setReports((prev) => [newReport, ...prev]);
    return newId;
  };

  // Guarded Admin Action: Handle status update (Reported / Assigned / Fixed)
  const handleUpdateStatus = (id: string, newStatus: ReportStatus) => {
    if (!isAdminLoggedIn) {
      console.warn('Access Denied: Only authenticated municipal administrators can update report statuses.');
      return;
    }
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  // Admin Login Success handler
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }
    setCurrentView('admin-dashboard');
  };

  // Admin Logout handler (clears sessionStorage)
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-900 selection:text-white">
      
      {/* Top Application Header */}
      <header className="bg-blue-950 text-white border-b border-blue-900 sticky top-0 z-40 shadow-lg shadow-blue-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center border border-blue-400/40 shadow-inner group-hover:scale-105 transition">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  RoadWatch <span className="text-amber-400">AI</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-800 text-blue-200 border border-blue-700">
                  Municipal Portal
                </span>
              </div>
              <p className="text-[11px] text-blue-300 font-medium hidden sm:block">
                Public Infrastructure Reporting & Spatial Management
              </p>
            </div>
          </div>

          {/* Mode Indicator & Navigation Actions */}
          <div className="flex items-center gap-3">
            
            {/* PROMINENT MODE LABEL: "Citizen Mode" or "Admin Mode" */}
            {currentView === 'citizen' && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 border border-emerald-400 flex items-center gap-1.5 shadow-sm">
                <User className="w-3.5 h-3.5" />
                <span>Citizen Mode</span>
              </span>
            )}

            {(currentView === 'admin-dashboard' || currentView === 'admin-login') && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white border border-red-500 flex items-center gap-1.5 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Admin Mode</span>
              </span>
            )}

            {currentView === 'landing' && (
              <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-900 text-blue-200 border border-blue-800">
                Portal Home
              </span>
            )}

            {/* Quick Navigation Action Buttons */}
            {currentView === 'admin-dashboard' && isAdminLoggedIn && (
              <button
                onClick={handleAdminLogout}
                className="px-3.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-white border border-red-800/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Log out of Admin Mode"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}

            {currentView !== 'landing' && (
              <button
                onClick={() => setCurrentView('landing')}
                className="p-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-800 text-xs font-semibold transition cursor-pointer"
                title="Return to Portal Landing"
              >
                <Home className="w-4 h-4" />
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        
        {/* 1. Landing Screen */}
        {currentView === 'landing' && (
          <LandingScreen
            onSelectCitizen={() => setCurrentView('citizen')}
            onSelectAdmin={() => {
              if (isAdminLoggedIn) {
                setCurrentView('admin-dashboard');
              } else {
                setCurrentView('admin-login');
              }
            }}
            totalReportsCount={reports.length}
          />
        )}

        {/* 2. Citizen Side (No login required) */}
        {currentView === 'citizen' && (
          <CitizenView
            reports={reports}
            currentDeviceId={deviceId}
            onSubmitReport={handleAddReport}
            onBackToLanding={() => setCurrentView('landing')}
            onGoToAdminLogin={() => {
              if (isAdminLoggedIn) {
                setCurrentView('admin-dashboard');
              } else {
                setCurrentView('admin-login');
              }
            }}
          />
        )}

        {/* 3. Admin Login Screen */}
        {currentView === 'admin-login' && (
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onBackToLanding={() => setCurrentView('landing')}
          />
        )}

        {/* 4. Admin Dashboard (Route protected with isAdminLoggedIn) */}
        {currentView === 'admin-dashboard' && isAdminLoggedIn && (
          <DashboardView
            reports={reports}
            onUpdateStatus={handleUpdateStatus}
            criticalLocations={criticalLocations}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RoadWatch AI • Public Infrastructure Problem Reporting System</span>
          <span className="text-slate-400 font-medium">
            Active Mode: {currentView === 'citizen' ? 'Citizen Mode (Device ID Tracked)' : currentView === 'admin-dashboard' ? 'Admin Mode (Authorized)' : 'Portal Landing'}
          </span>
        </div>
      </footer>

    </div>
  );
}
