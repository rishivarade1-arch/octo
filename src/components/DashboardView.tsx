import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Search,
  Filter,
  FileText,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  Navigation,
  Eye,
  Flame,
  HelpCircle,
  Building,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Lock,
  FileDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Report, ReportStatus, PriorityRank } from '../types';
import { MapView } from './MapView';
import { ComplaintModal } from './ComplaintModal';
import { PriorityScoreBadge } from './PriorityScoreBadge';
import {
  calculatePriorityScore,
  CriticalLocation,
  DEFAULT_CRITICAL_LOCATIONS
} from '../criticalLocations';
import { ImageWithFallback } from './ImageWithFallback';
import {
  generateSingleReportPDF,
  generateAllReportsSummaryPDF
} from '../utils/pdfGenerator';



interface DashboardViewProps {
  reports: Report[];
  onUpdateStatus: (id: string, newStatus: ReportStatus) => void;
  criticalLocations?: CriticalLocation[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  onUpdateStatus,
  criticalLocations = DEFAULT_CRITICAL_LOCATIONS
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id || null);
  
  // Dedicated filters for issue type and status
  const [statusFilter, setStatusFilter] = useState<'All' | ReportStatus>('All');
  const [issueFilter, setIssueFilter] = useState<'All' | string>('All');
  
  // Heatmap state
  const [isHeatmapEnabled, setIsHeatmapEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');
  const [complaintReport, setComplaintReport] = useState<Report | null>(null);
  const [imagePreviewModal, setImagePreviewModal] = useState<string | null>(null);

  // PDF Export States
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [isExportingAllPdf, setIsExportingAllPdf] = useState(false);
  const [pdfActionError, setPdfActionError] = useState<string | null>(null);

  // Handle single report PDF download
  const handleDownloadSingleReportPDF = async (targetReport: Report) => {
    setGeneratingPdfId(targetReport.id);
    setPdfActionError(null);
    try {
      await generateSingleReportPDF(targetReport, reports, criticalLocations);
    } catch (err: any) {
      console.error('Single report PDF failed:', err);
      setPdfActionError(`Failed to generate PDF for Report #${targetReport.id}. Please try again.`);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Handle exporting all reports as a summary PDF
  const handleExportAllReportsPDF = async () => {
    setIsExportingAllPdf(true);
    setPdfActionError(null);
    try {
      await generateAllReportsSummaryPDF(reports, criticalLocations);
    } catch (err: any) {
      console.error('All reports summary PDF failed:', err);
      setPdfActionError('Failed to generate summary PDF for all reports. Please try again.');
    } finally {
      setIsExportingAllPdf(false);
    }
  };




  // Compute priority scores for all reports
  const reportsWithScores = useMemo(() => {
    return reports.map((r) => {
      const breakdown = calculatePriorityScore(r, reports, criticalLocations);
      return {
        ...r,
        priorityScore: breakdown.totalScore,
        breakdown
      };
    });
  }, [reports, criticalLocations]);

  // Extract distinct issue types available in the data
  const availableIssueTypes = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.issue_type) set.add(r.issue_type);
    });
    return Array.from(set);
  }, [reports]);

  // Filter reports by status, issue type, and search query
  const filteredReports = useMemo(() => {
    return reportsWithScores.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (issueFilter !== 'All' && r.issue_type !== issueFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNote = r.note?.toLowerCase().includes(q);
        const matchLoc = r.locationName?.toLowerCase().includes(q);
        const matchId = r.id?.toLowerCase().includes(q);
        const matchIssue = r.issue_type?.toLowerCase().includes(q);
        return matchNote || matchLoc || matchId || matchIssue;
      }
      return true;
    });
  }, [reportsWithScores, statusFilter, issueFilter, searchQuery]);

  // Sort reports strictly by priority score (highest first)
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      return b.priorityScore - a.priorityScore;
    });
  }, [filteredReports]);

  // Stats calculation for the summary bar: total reports, high priority count, fixed count
  const totalCount = reports.length;
  const redCount = reportsWithScores.filter((r) => r.priorityScore >= 70).length;
  const fixedCount = reports.filter((r) => r.status === 'Fixed').length;
  const assignedCount = reports.filter((r) => r.status === 'Assigned').length;
  const reportedCount = reports.filter((r) => r.status === 'Reported').length;

  const handleSelectReport = (r: Report) => {
    setSelectedReportId(r.id);
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Reported':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'Assigned':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-600'
        };
      case 'Fixed':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500'
        };
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('All');
    setIssueFilter('All');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'All' || issueFilter !== 'All' || searchQuery.trim().length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">
      {/* Complaint Generator Modal */}
      <ComplaintModal
        report={complaintReport}
        onClose={() => setComplaintReport(null)}
        isAdmin={true}
        allReports={reports}
      />

      {/* PDF Export Error Banner */}
      {pdfActionError && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-200" />
            <span>{pdfActionError}</span>
          </div>
          <button
            onClick={() => setPdfActionError(null)}
            className="text-white hover:text-red-200 ml-3 font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Full Image Preview Modal */}
      {imagePreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setImagePreviewModal(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
            <ImageWithFallback
              src={imagePreviewModal}
              alt="Hazard preview"
              className="w-full h-full max-h-[80vh] object-contain"
              fallbackClassName="w-full h-64 md:h-96"
            />
            <button
              onClick={() => setImagePreviewModal(null)}
              className="absolute top-4 right-4 bg-slate-950/80 text-white p-2 rounded-full hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY BAR AT THE TOP: total reports, high priority count, fixed count */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-900/90 border border-blue-700/60 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300">
                Mumbai Metropolitan Infrastructure Audit
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-800 text-blue-200 font-mono">
                Live Status
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
              Civic Hazard Summary
            </h2>
          </div>
        </div>

        {/* The 3 Core Summary Metrics: Total Reports, High Priority Count, Fixed Count */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-7 w-full sm:w-auto justify-around sm:justify-end">
          {/* 1. Total Reports */}
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              Total Reports
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl md:text-3xl font-black text-white">{totalCount}</span>
              <span className="text-[10px] text-blue-400 font-medium">cases</span>
            </div>
          </div>

          <div className="h-9 w-px bg-blue-800/80 hidden sm:block"></div>

          {/* 2. High Priority Count (Score 70+) */}
          <div className="flex flex-col items-center sm:items-end">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
                High Priority (70+)
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl md:text-3xl font-black text-red-400">{redCount}</span>
              <span className="text-[10px] text-red-300 font-medium">critical</span>
            </div>
          </div>

          <div className="h-9 w-px bg-blue-800/80 hidden sm:block"></div>

          {/* 3. Fixed Count */}
          <div className="flex flex-col items-center sm:items-end">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Fixed
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl md:text-3xl font-black text-emerald-400">{fixedCount}</span>
              <span className="text-[10px] text-emerald-300 font-medium">repaired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Controls: Admin Status Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Spatial Incident Queue</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold border border-blue-200">
              Sorted by Priority
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Browse reports ranked by priority score (highest first). Use heatmap to visualize high-density hazard pockets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Export All Reports (PDF) Button (Visible only in Admin mode) */}
          <button
            type="button"
            onClick={handleExportAllReportsPDF}
            disabled={isExportingAllPdf || reports.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            title={reports.length === 0 ? 'No reports to export' : 'Export summary table of all reports to PDF'}
          >
            {isExportingAllPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Generating All Reports PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Export All Reports (PDF)</span>
              </>
            )}
          </button>

          {/* Admin Mode Badge for Judges */}
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300 flex items-center gap-1.5 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-red-700" />
            <span>Admin Mode</span>
          </span>
        </div>
      </div>

      {/* Filters Toolbar: Issue Type & Status Filters */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, location, or docket ID..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Heatmap Quick Toggle */}
            <button
              onClick={() => setIsHeatmapEnabled(!isHeatmapEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isHeatmapEnabled
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isHeatmapEnabled ? 'text-amber-300 animate-pulse' : 'text-red-500'}`} />
              <span>Heatmap: {isHeatmapEnabled ? 'Active' : 'Off'}</span>
            </button>

            {/* Reset Filters button if any filter active */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-900 hover:text-blue-700 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Filter Bars: Status & Issue Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          
          {/* 1. Status Filter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-900" />
                <span>Filter by Status:</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {statusFilter === 'All' ? 'All statuses' : `Active: ${statusFilter}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['All', 'Reported', 'Assigned', 'Fixed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition border cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                  <span className="ml-1 opacity-75 font-mono text-[10px]">
                    ({st === 'All' ? reports.length : reports.filter((r) => r.status === st).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Issue Type Filter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-900" />
                <span>Filter by Issue Type:</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 capitalize">
                {issueFilter === 'All' ? 'All issue types' : issueFilter.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setIssueFilter('All')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition border cursor-pointer ${
                  issueFilter === 'All'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Issues
                <span className="ml-1 opacity-75 font-mono text-[10px]">
                  ({reports.length})
                </span>
              </button>

              {availableIssueTypes.map((issue) => (
                <button
                  key={issue}
                  onClick={() => setIssueFilter(issue)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition border capitalize cursor-pointer ${
                    issueFilter === issue
                      ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {issue.replace('_', ' ')}
                  <span className="ml-1 opacity-75 font-mono text-[10px]">
                    ({reports.filter((r) => r.issue_type === issue).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Toggle between Map & List */}
      <div className="flex lg:hidden rounded-2xl bg-slate-200 p-1">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            mobileTab === 'list'
              ? 'bg-white text-blue-950 shadow-sm'
              : 'text-slate-600'
          }`}
        >
          Priority Reports List ({sortedReports.length})
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            mobileTab === 'map'
              ? 'bg-white text-blue-950 shadow-sm'
              : 'text-slate-600'
          }`}
        >
          Interactive GIS Map {isHeatmapEnabled ? '(Heatmap Active)' : ''}
        </button>
      </div>

      {/* Main Split Layout: Interactive Map next to the Priority-Ranked Report List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Interactive Leaflet & OpenStreetMap (5 cols on desktop, sticky) */}
        <div className={`lg:col-span-5 flex flex-col gap-3 sticky top-20 ${mobileTab === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Interactive Map (Leaflet)</span>
                    {isHeatmapEnabled && (
                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-black">
                        HEATMAP ON
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pins color-coded by score (Red 70+, Orange 40-69, Green &lt;40)
                  </p>
                </div>
              </div>

              {/* Heatmap Toggle directly in header */}
              <button
                onClick={() => setIsHeatmapEnabled(!isHeatmapEnabled)}
                className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                  isHeatmapEnabled
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Toggle density heatmap"
              >
                <Flame className={`w-3.5 h-3.5 ${isHeatmapEnabled ? 'text-red-600' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{isHeatmapEnabled ? 'Heatmap' : 'Heatmap'}</span>
              </button>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className="h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <MapView
                reports={sortedReports}
                selectedReportId={selectedReportId}
                onSelectReport={handleSelectReport}
                criticalLocations={criticalLocations}
                isHeatmapEnabled={isHeatmapEnabled}
                onToggleHeatmap={() => setIsHeatmapEnabled(!isHeatmapEnabled)}
                className="h-full"
              />
            </div>

            {/* Selected Pin Details Box */}
            {selectedReportId && (
              (() => {
                const sel = sortedReports.find((r) => r.id === selectedReportId);
                if (!sel) return null;
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-900"></span>
                        <span>Selected Incident #{sel.id}</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {sel.latitude.toFixed(4)}, {sel.longitude.toFixed(4)}
                      </span>
                    </div>

                    <PriorityScoreBadge
                      breakdown={sel.breakdown}
                      severity={sel.severity}
                      issueType={sel.issue_type}
                      showDetailsByDefault={false}
                    />

                    <p className="text-slate-600 text-[11px] line-clamp-2 mt-1">
                      {sel.note || 'No notes available'}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500">Current Status: <b className="text-blue-900">{sel.status}</b></span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleReportPDF(sel)}
                          disabled={generatingPdfId === sel.id}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                          title="Download PDF report"
                        >
                          {generatingPdfId === sel.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-900" />
                          ) : (
                            <FileDown className="w-3 h-3 text-blue-900" />
                          )}
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => setComplaintReport(sel)}
                          className="text-blue-900 hover:underline font-bold"
                        >
                          Generate Complaint →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Next to the map: Report List strictly sorted by Priority (highest first) (7 cols) */}
        <div className={`lg:col-span-7 flex flex-col gap-4 ${mobileTab === 'map' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span className="font-bold text-slate-700">
              Showing {sortedReports.length} {sortedReports.length === 1 ? 'Report' : 'Reports'}
              <span className="font-normal text-blue-900 ml-1">
                (Sorted by Priority: Highest Score First)
              </span>
            </span>
            <span className="text-red-700 font-bold">
              {redCount} Critical (Score ≥ 70)
            </span>
          </div>

          {sortedReports.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {reports.length === 0 ? 'No reports logged yet' : 'No matching reports'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                {reports.length === 0
                  ? 'There are currently no infrastructure reports submitted in the system. When citizen reports are filed, they will appear here ranked by priority.'
                  : `No incidents match your selected filters (Status: ${statusFilter}, Issue: ${issueFilter}).`}
              </p>
              {reports.length > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            sortedReports.map((report) => {
              const isSelected = report.id === selectedReportId;
              const badge = getStatusBadge(report.status);

              return (
                <div
                  key={report.id}
                  onClick={() => handleSelectReport(report)}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer flex flex-col ${
                    isSelected
                      ? 'border-blue-700 ring-2 ring-blue-700/20 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-4 md:p-5 flex flex-col sm:flex-row gap-4 items-start">
                    
                    {/* Photo Thumbnail */}
                    <div className="relative w-full sm:w-36 h-40 sm:h-36 rounded-2xl overflow-hidden bg-slate-900 shrink-0 group">
                      <ImageWithFallback
                        src={report.image}
                        alt={report.issue_type || 'Infrastructure issue'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        fallbackClassName="w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreviewModal(report.image);
                        }}
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                      >
                        <Eye className="w-5 h-5 drop-shadow" />
                      </button>

                      {/* Small severity badge on thumbnail */}
                      <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Sev: {report.severity}/10
                      </div>
                    </div>

                    {/* Card Content Information */}
                    <div className="flex-1 flex flex-col justify-between w-full">
                      <div>
                        {/* Header: Docket ID, Issue Type & Status Pill */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              #{report.id}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              <span>{report.status}</span>
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {report.issue_type?.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Priority Score Badge (0-100) with Color & 'Why this score?' breakdown */}
                        <div className="mb-3">
                          <PriorityScoreBadge
                            breakdown={report.breakdown}
                            severity={report.severity}
                            issueType={report.issue_type}
                          />
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium mb-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                          <span className="truncate">
                            {report.locationName || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px] ml-1">
                            ({report.latitude.toFixed(4)}, {report.longitude.toFixed(4)})
                          </span>
                        </div>

                        {/* Note text */}
                        {report.note && (
                          <p className="text-xs text-slate-800 leading-relaxed mb-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            {report.note}
                          </p>
                        )}

                        {/* Risk reason / Action */}
                        <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs flex flex-col gap-1">
                          <div className="text-[11px] text-slate-700 leading-snug">
                            <span className="font-bold text-red-700">Risk Factor: </span>
                            <span>{report.risk_reason}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 leading-snug">
                            <span className="font-bold text-blue-900">Action: </span>
                            <span>{report.recommended_action}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom: Timestamp, Status Dropdown & Generate Complaint Button */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>{report.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status Dropdown to change between Reported, Assigned, and Fixed */}
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Status:
                            </label>
                            <select
                              value={report.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(report.id, e.target.value as ReportStatus);
                              }}
                              className={`px-2 py-1 text-xs font-bold rounded-lg border outline-none cursor-pointer transition ${
                                report.status === 'Fixed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : report.status === 'Assigned'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="Reported">Reported</option>
                              <option value="Assigned">Assigned</option>
                              <option value="Fixed">Fixed</option>
                            </select>
                          </div>

                          {/* Download PDF button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSingleReportPDF(report);
                            }}
                            disabled={generatingPdfId === report.id}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-blue-900 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                            title="Download PDF report"
                          >
                            {generatingPdfId === report.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                                <span>Creating PDF...</span>
                              </>
                            ) : (
                              <>
                                <FileDown className="w-3.5 h-3.5 text-blue-900" />
                                <span>Download PDF</span>
                              </>
                            )}
                          </button>

                          {/* Generate Complaint button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setComplaintReport(report);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>Generate Complaint</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
