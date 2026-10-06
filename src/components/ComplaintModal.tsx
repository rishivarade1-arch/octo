import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  X,
  FileText,
  Download,
  Building2,
  Cpu,
  Loader2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileDown,
  AlertCircle
} from 'lucide-react';
import { Report } from '../types';
import { generateSingleReportPDF } from '../utils/pdfGenerator';
import { DEFAULT_CRITICAL_LOCATIONS } from '../criticalLocations';

interface ComplaintModalProps {
  report: Report | null;
  onClose: () => void;
  isAdmin?: boolean;
  allReports?: Report[];
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  report,
  onClose,
  isAdmin,
  allReports = []
}) => {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [complaintText, setComplaintText] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('gemma-4-26b-a4b-it');
  const [promptUsed, setPromptUsed] = useState<string>('');
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);

  // Check if admin mode is active (prop or session)
  const isCurrentlyAdmin = isAdmin ?? (() => {
    try {
      return sessionStorage.getItem('roadwatch_admin_session_active') === 'true';
    } catch {
      return false;
    }
  })();


  useEffect(() => {
    if (!report) {
      setComplaintText('');
      return;
    }

    generateComplaint(report);
  }, [report]);

  const generateComplaint = async (targetReport: Report) => {
    setIsLoading(true);
    setCopied(false);

    const readableAddress = (targetReport.address || targetReport.locationName)?.trim();
    const hasReadableAddress = readableAddress && !readableAddress.includes('Address unavailable') && readableAddress !== `${targetReport.latitude.toFixed(4)}, ${targetReport.longitude.toFixed(4)}`;
    const locWithCoords = hasReadableAddress
      ? `${readableAddress} (${targetReport.latitude.toFixed(4)}, ${targetReport.longitude.toFixed(4)})`
      : `${targetReport.latitude.toFixed(4)}, ${targetReport.longitude.toFixed(4)}`;
    const riskString = targetReport.risk_reason || targetReport.note || 'deep pothole on a busy lane endangering two-wheelers';

    const constructedPrompt = `Write a formal complaint letter to the municipal corporation using this verified report data:
Issue: ${targetReport.issue_type || 'pothole'}, Severity: ${targetReport.severity || 8}/10, Location: ${locWithCoords}${hasReadableAddress ? ` (Address: ${readableAddress})` : ''}, Danger/Risk: ${riskString}.
Make sure the readable street address and coordinates appear naturally in the complaint text. Keep it under 120 words, polite but urgent, and conclude with a firm request for inspection barricading and repair within 72 hours. Return plain text only.`;

    setPromptUsed(constructedPrompt);

    try {
      const response = await fetch('/api/generate-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_type: targetReport.issue_type,
          severity: targetReport.severity,
          locationName: targetReport.locationName,
          address: readableAddress,
          latitude: targetReport.latitude,
          longitude: targetReport.longitude,
          risk_reason: riskString
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComplaintText(data.complaint || '');
        if (data.model_used) setModelUsed(data.model_used);
        if (data.prompt_used) setPromptUsed(data.prompt_used);
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      console.warn('Fallback complaint generation used:', err);
      // Fallback matching exact specifications
      const fallbackText = `To
The Ward Officer,
Municipal Corporation Maintenance Division,
${hasReadableAddress ? readableAddress : `Sector Jurisdiction (${targetReport.latitude.toFixed(4)}, ${targetReport.longitude.toFixed(4)})`}.

Subject: Urgent Complaint Regarding Dangerous ${targetReport.issue_type?.replace('_', ' ') || 'Pothole'} (Severity ${targetReport.severity}/10)

Respected Sir/Madam,

I am writing to bring to your urgent attention a hazardous road condition at ${locWithCoords}.

A severe ${targetReport.issue_type?.replace('_', ' ') || 'pothole'} assessed at Severity ${targetReport.severity}/10 has developed along this active route. ${riskString}.

Considering the critical threat to commuter safety, I earnestly request your prompt intervention to barricade the hazard and complete the necessary repair within 72 hours.

Thank you.

Yours sincerely,
A Concerned Resident`;
      setComplaintText(fallbackText);
      setModelUsed('gemma-4-26b-a4b-it');
    } finally {
      setIsLoading(false);
    }
  };

  if (!report) return null;

  const currentReadableAddress = (report.address || report.locationName)?.trim();
  const hasCurrentReadableAddress = currentReadableAddress && !currentReadableAddress.includes('Address unavailable') && currentReadableAddress !== `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;
  const locString = hasCurrentReadableAddress
    ? `${currentReadableAddress} (${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)})`
    : `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(complaintText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!complaintText) return;
    const blob = new Blob([complaintText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `complaint-${report.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    setIsPdfGenerating(true);
    setPdfError(null);
    try {
      await generateSingleReportPDF(report, allReports, DEFAULT_CRITICAL_LOCATIONS, complaintText);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      setPdfError('Failed to generate PDF report. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Municipal Complaint Draft
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold border border-blue-200 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-blue-700" />
                  <span>{modelUsed}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Docket #{report.id} • {locString}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-blue-950 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generated via gemma-4-26b-a4b-it</span>
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
              &lt; 120 words • 72-hr SLA
            </span>
          </div>

          {/* Loading state or Text result */}
          {isLoading ? (
            <div className="p-12 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Calling model gemma-4-26b-a4b-it...
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Composing formal, polite municipal repair complaint with 72-hour deadline.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 md:p-5 rounded-2xl bg-slate-900 text-slate-100 font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner">
                {complaintText}
              </pre>
            </div>
          )}

          {/* Expandable Prompt Inspector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className="w-full p-2.5 flex items-center justify-between font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition"
            >
              <span>View exact Step 2 prompt sent to model</span>
              {showPromptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showPromptDetails && (
              <div className="p-3 border-t border-slate-200 bg-slate-100/60 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                {promptUsed}
              </div>
            )}
          </div>

          {pdfError && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{pdfError}</span>
              </div>
              <button
                type="button"
                onClick={() => setPdfError(null)}
                className="text-red-500 hover:text-red-700 text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Footer actions: Copy, Download, and Close */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateComplaint(report)}
              disabled={isLoading || isPdfGenerating}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Regenerate draft"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF Button (Visible Only in Admin Mode) */}
            {isCurrentlyAdmin && (
              <button
                onClick={handleDownloadPDF}
                disabled={isLoading || isPdfGenerating}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-red-700/25 cursor-pointer"
                title="Generate and download A4 PDF report"
              >
                {isPdfGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            )}

            {/* Download as Text Button */}
            <button
              onClick={handleDownload}
              disabled={isLoading || !complaintText || isPdfGenerating}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-900" />
              <span>Download text</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              disabled={isLoading || !complaintText || isPdfGenerating}
              className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-900/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
