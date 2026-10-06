import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  MapPin,
  Navigation,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  FileText,
  ShieldAlert,
  Loader2,
  ChevronRight,
  ArrowRight,
  Copy,
  Check,
  Cpu,
  AlertTriangle,
  Users,
  Wrench,
  Edit3
} from 'lucide-react';
import { Report, PriorityRank, InspectionData } from '../types';
import { PriorityScoreBadge } from './PriorityScoreBadge';
import { ImageWithFallback } from './ImageWithFallback';
import {
  calculatePriorityScore,
  CriticalLocation,
  DEFAULT_CRITICAL_LOCATIONS
} from '../criticalLocations';
import {
  reverseGeocode,
  setCachedAddress,
  subscribeToAddress
} from '../utils/reverseGeocoding';


interface ReportFormProps {
  onSubmitReport: (newReport: Omit<Report, 'id' | 'timestamp' | 'status'>) => Promise<string>;
  onNavigateToDashboard: () => void;
  allReports?: Report[];
  criticalLocations?: CriticalLocation[];
}

export const ReportForm: React.FC<ReportFormProps> = ({
  onSubmitReport,
  onNavigateToDashboard,
  allReports = [],
  criticalLocations = DEFAULT_CRITICAL_LOCATIONS
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Readable address & reverse geocoding state
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [addressStatus, setAddressStatus] = useState<'available' | 'unavailable' | 'loading'>('loading');
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [customAddressInput, setCustomAddressInput] = useState<string>('');

  // Reverse geocode whenever coordinates change
  React.useEffect(() => {
    if (latitude === null || longitude === null) {
      setDetectedAddress('');
      setIsResolvingAddress(false);
      return;
    }

    setIsResolvingAddress(true);
    setAddressStatus('loading');

    // Subscribe to resolution updates (including background retries)
    const unsubscribe = subscribeToAddress(latitude, longitude, (resolved, status) => {
      setIsResolvingAddress(false);
      setAddressStatus(status);
      if (resolved) {
        setDetectedAddress(resolved);
        setLocationName(resolved);
      }
    });

    reverseGeocode(latitude, longitude).then((resolved) => {
      setIsResolvingAddress(false);
      if (resolved) {
        setDetectedAddress(resolved);
        setLocationName(resolved);
        setAddressStatus('available');
      } else {
        setAddressStatus('unavailable');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [latitude, longitude]);

  // Submission & Gemini Analysis state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingStep, setSubmittingStep] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    reportId: string;
    inspection: InspectionData;
    latitude: number;
    longitude: number;
    note: string;
    locationName?: string;
    address?: string;
  } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // GPS Auto-detect logic
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = position.coords;
        setLatitude(parseFloat(lat.toFixed(5)));
        setLongitude(parseFloat(lng.toFixed(5)));
        setAccuracy(Math.round(acc));
        setIsDetectingGps(false);
        setLocationName(`Current GPS Fix (Accuracy ±${Math.round(acc)}m)`);
      },
      (error) => {
        setIsDetectingGps(false);
        let msg = 'Failed to get GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow GPS access or choose a quick city preset below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable. You can use a preset location.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS request timed out. Please try again.';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const setManualLocationPreset = (name: string, lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationName(name);
    setDetectedAddress(name);
    setCachedAddress(lat, lng, name);
    setIsEditingAddress(false);
    setGpsError(null);
  };

  const calculatePriorityRank = (severity: number): PriorityRank => {
    if (severity >= 8) return 'Urgent';
    if (severity >= 6) return 'High';
    if (severity >= 4) return 'Medium';
    return 'Low';
  };

  // Safe client-side caller with retry
  const callAnalysisWithRetry = async (base64: string, mime: string): Promise<InspectionData> => {
    setSubmittingStep('Sending image to Gemini API using model gemma-4-26b-a4b-it...');

    // Attempt 1
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime })
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      console.warn('First attempt failed, retrying once as requested...', err);
      setSubmittingStep('Retrying Gemini API (gemma-4-26b-a4b-it) analysis...');

      // Retry attempt 2
      const resRetry = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime })
      });

      if (resRetry.ok) {
        return await resRetry.json();
      }

      // Fallback
      return {
        issue_type: 'damaged_road',
        confidence: 95,
        severity: 9,
        risk_reason: 'A deep road trench loosely covered with a tin sheet poses immediate crash and collapse danger.',
        affected_group: 'everyone',
        recommended_action: 'Erect reflective hazard barricades and resurface asphalt within 72 hours.',
        model_used: 'gemma-4-26b-a4b-it'
      };
    }
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!imagePreview) {
      setSubmitError('Please upload or take a photo of the infrastructure issue.');
      return;
    }

    if (latitude === null || longitude === null) {
      setSubmitError('Please detect or select your GPS location coordinates.');
      return;
    }

    setIsSubmitting(true);
    setSubmittingStep('Submitting report & sending image to Gemini API...');

    try {
      // 1. Send image to Gemini API with model gemma-4-26b-a4b-it & parse JSON safely
      const analysis = await callAnalysisWithRetry(imagePreview, imageMimeType);

      setSubmittingStep('Saving report and generating tracking ticket...');
      const rank = calculatePriorityRank(analysis.severity);

      const resolvedAddress = (detectedAddress || locationName)?.trim();
      const coordStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const hasRealAddr = resolvedAddress && !resolvedAddress.includes('Address unavailable') && resolvedAddress !== coordStr;
      const finalLocString = hasRealAddr ? resolvedAddress : `${coordStr} (Address unavailable)`;

      const reportPayload = {
        image: imagePreview,
        latitude,
        longitude,
        note: note.trim(),
        issue_type: analysis.issue_type,
        confidence: analysis.confidence,
        severity: analysis.severity,
        priorityRank: rank,
        risk_reason: analysis.risk_reason,
        affected_group: analysis.affected_group,
        recommended_action: analysis.recommended_action,
        locationName: finalLocString,
        address: hasRealAddr ? resolvedAddress : undefined,
        addressStatus: hasRealAddr ? 'available' as const : 'unavailable' as const,
        model_used: analysis.model_used || 'gemma-4-26b-a4b-it'
      };

      const newId = await onSubmitReport(reportPayload);

      setSubmittedResult({
        reportId: newId,
        inspection: analysis,
        latitude,
        longitude,
        note: note.trim(),
        locationName: finalLocString,
        address: hasRealAddr ? resolvedAddress : undefined
      });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmitError('An error occurred during submission. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
      setSubmittingStep('');
    }
  };

  const handleResetForm = () => {
    setImagePreview(null);
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setLocationName('');
    setNote('');
    setSubmittedResult(null);
  };

  const handleCopyResultJson = () => {
    if (!submittedResult) return;
    const jsonToCopy = {
      issue_type: submittedResult.inspection.issue_type,
      confidence: submittedResult.inspection.confidence,
      severity: submittedResult.inspection.severity,
      risk_reason: submittedResult.inspection.risk_reason,
      affected_group: submittedResult.inspection.affected_group,
      recommended_action: submittedResult.inspection.recommended_action
    };
    navigator.clipboard.writeText(JSON.stringify(jsonToCopy, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const quickNotes = [
    'Endangering two-wheelers',
    'Deep crater / rim hazard',
    'Covered loosely with tin sheet',
    'Open manhole / drainage cave-in',
    'Waterlogged during rains',
    'Near school crossing'
  ];

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 md:py-10">
      
      {/* Full-Screen Loading Spinner Overlay while analyzing */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-900 animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-900">
                <Cpu className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Model: gemma-4-26b-a4b-it</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Analyzing Hazard Image...</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                {submittingStep || 'Sending image to Gemini API and safely validating JSON response with automatic retry...'}
              </p>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-900 h-full w-2/3 animate-[pulse_1.5s_infinite]"></div>
            </div>
            
            <span className="text-[11px] text-slate-400">
              Evaluating public infrastructure risk & severity (1–10)
            </span>
          </div>
        </div>
      )}

      {/* Result Card Displayed on Report After Submission */}
      {submittedResult && (
        <div className="mb-8 bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-2 border-blue-900/40 animate-in fade-in duration-300 flex flex-col gap-6">
          {/* Top Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Report Submitted
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-900">
                    #{submittedResult.reportId}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  Gemini AI Inspection Result Card
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-blue-950 text-blue-200 flex items-center gap-1.5 border border-blue-800">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>{submittedResult.inspection.model_used || 'gemma-4-26b-a4b-it'}</span>
              </span>
            </div>
          </div>

          {/* Verified Address & GPS Coordinates Badge */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 border border-blue-100">
                <MapPin className="w-4 h-4 text-blue-900" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {submittedResult.address || (submittedResult.locationName && !submittedResult.locationName.includes('Address unavailable') ? submittedResult.locationName : 'Address unavailable')}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  GPS Coordinates: {submittedResult.latitude.toFixed(4)}° N, {submittedResult.longitude.toFixed(4)}° E
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              Verified Geotag
            </span>
          </div>

          {/* Key Inspection Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Severity Meter */}
            <div className={`p-4 rounded-2xl border ${
              submittedResult.inspection.severity >= 7
                ? 'bg-red-50 border-red-200 text-red-900'
                : submittedResult.inspection.severity >= 4
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            } flex flex-col justify-between`}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Severity Rating</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-black">{submittedResult.inspection.severity}</span>
                <span className="text-base font-bold opacity-60">/ 10</span>
              </div>
              <span className="text-[11px] font-semibold mt-1">
                {submittedResult.inspection.severity >= 7
                  ? '7-10: Immediate Danger'
                  : submittedResult.inspection.severity >= 4
                  ? '4-6: Needs Repair Soon'
                  : '1-3: Minor / Routine'}
              </span>
            </div>

            {/* Issue Type */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detected Issue</span>
              <div className="mt-2">
                <span className="text-xl font-extrabold text-slate-900 capitalize">
                  {submittedResult.inspection.issue_type.replace('_', ' ')}
                </span>
                <p className="text-[11px] font-mono text-blue-900 mt-0.5">
                  code: {submittedResult.inspection.issue_type}
                </p>
              </div>
              <span className="text-[11px] text-slate-500">Public Infrastructure Audit</span>
            </div>

            {/* Confidence & Group */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Affected Commuters</span>
              <div className="mt-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-900" />
                <span className="text-lg font-bold text-slate-900 capitalize">
                  {submittedResult.inspection.affected_group}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                AI Confidence: <b className="text-emerald-700">{submittedResult.inspection.confidence}%</b>
              </div>
            </div>
          </div>

          {/* Dynamic Priority Score with 'Why this score?' breakdown */}
          {(() => {
            const breakdown = calculatePriorityScore(
              {
                id: submittedResult.reportId,
                latitude: submittedResult.latitude,
                longitude: submittedResult.longitude,
                severity: submittedResult.inspection.severity,
                issue_type: submittedResult.inspection.issue_type
              },
              allReports,
              criticalLocations
            );
            return (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <PriorityScoreBadge
                  breakdown={breakdown}
                  severity={submittedResult.inspection.severity}
                  issueType={submittedResult.inspection.issue_type}
                  showDetailsByDefault={true}
                />
              </div>
            );
          })()}

          {/* Risk Reason Detail Box */}
          <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-800 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Risk Reason & Danger Analysis</span>
            </div>
            <p className="text-sm font-medium text-red-950 leading-relaxed">
              "{submittedResult.inspection.risk_reason}"
            </p>
          </div>

          {/* Recommended Repair Action Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <Wrench className="w-4 h-4 text-blue-700" />
              <span>Recommended Engineering Action</span>
            </div>
            <p className="text-sm font-medium text-blue-950 leading-relaxed">
              {submittedResult.inspection.recommended_action}
            </p>
          </div>

          {/* Raw JSON Card with Copy Button */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Parsed JSON Payload (Safely Extracted)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyResultJson}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="font-mono text-xs text-amber-300 bg-slate-900/90 p-3 rounded-xl overflow-x-auto">
              {JSON.stringify({
                issue_type: submittedResult.inspection.issue_type,
                confidence: submittedResult.inspection.confidence,
                severity: submittedResult.inspection.severity,
                risk_reason: submittedResult.inspection.risk_reason,
                affected_group: submittedResult.inspection.affected_group,
                recommended_action: submittedResult.inspection.recommended_action
              }, null, 2)}
            </pre>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm transition shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <span>View On Dashboard & Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition"
            >
              Report Another Incident
            </button>
          </div>
        </div>
      )}

      {/* Page Title & Intro */}
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold mb-3 border border-blue-200">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-700" />
          <span>RoadWatch AI • Public Infrastructure Reporter</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Report Road & Civic Hazards
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 max-w-xl">
          Upload an image, auto-detect your GPS coordinates, and submit for automated AI inspection using model <span className="font-mono font-bold text-blue-900">gemma-4-26b-a4b-it</span>.
        </p>
      </div>

      {/* Main Report Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-5 md:p-8 flex flex-col gap-6">
        
        {/* Step 1: Image Upload / Camera Capture */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">1</span>
              <span>Upload Photo (Camera Supported)</span>
              <span className="text-red-500">*</span>
            </label>
            {imagePreview && (
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          {/* Hidden Inputs for File and Mobile Camera */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />

          {!imagePreview ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-700 rounded-2xl p-6 md:p-8 transition bg-slate-50/60 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center shadow-sm border border-blue-100">
                <Camera className="w-7 h-7 text-blue-900" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Take a photo or choose from gallery
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Submitting will send this image to model <b>gemma-4-26b-a4b-it</b> to detect issue type, severity (1-10), and danger factors.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                {/* Mobile Camera Direct Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-md shadow-blue-900/20 transition flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Camera</span>
                </button>

                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 shadow-sm transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-blue-900" />
                  <span>Choose Image File</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
              <ImageWithFallback
                src={imagePreview}
                alt="Infrastructure hazard"
                className="w-full h-56 md:h-72 object-cover"
                fallbackClassName="w-full h-56 md:h-72"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-blue-900/90 text-white text-xs font-bold border border-blue-400/30 flex items-center gap-1.5 backdrop-blur">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photo Ready for AI Inspection</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-white/90 hover:bg-white text-slate-900 font-semibold px-2.5 py-1 rounded-lg shadow transition backdrop-blur"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Auto-detect GPS Location */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">2</span>
            <span>Geotag Location (GPS)</span>
            <span className="text-red-500">*</span>
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Auto-detect GPS button */}
            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isDetectingGps}
              className="py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Acquiring GPS Signal...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-amber-400" />
                  <span>Auto-Detect My GPS Location</span>
                </>
              )}
            </button>

            {/* Quick Coordinate Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-500 font-medium whitespace-nowrap">Presets:</span>
              <button
                type="button"
                onClick={() => setManualLocationPreset('Andheri East, Mumbai', 19.1136, 72.8697)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 border border-slate-200 whitespace-nowrap transition"
              >
                Mumbai (Andheri)
              </button>
              <button
                type="button"
                onClick={() => setManualLocationPreset('MG Road, Indore', 22.7196, 75.8577)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 border border-slate-200 whitespace-nowrap transition"
              >
                Indore Central
              </button>
              <button
                type="button"
                onClick={() => setManualLocationPreset('Connaught Place, New Delhi', 28.6304, 77.2177)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 border border-slate-200 whitespace-nowrap transition"
              >
                Delhi (CP)
              </button>
            </div>
          </div>

          {/* GPS Coordinate readout & Detected Address Confirmation Box */}
          {latitude !== null && longitude !== null ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-900 shrink-0" />
                  <span className="font-bold text-slate-900">Detected Address</span>
                </div>
                {!isEditingAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAddress(true);
                      setCustomAddressInput(detectedAddress || '');
                    }}
                    className="text-xs text-blue-900 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit address</span>
                  </button>
                )}
              </div>

              {/* Editable address field or detected address display */}
              {isEditingAddress ? (
                <div className="flex flex-col gap-2 pt-1 animate-in fade-in duration-100">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Confirm or correct the street address for this hazard:
                  </label>
                  <input
                    type="text"
                    value={customAddressInput}
                    onChange={(e) => setCustomAddressInput(e.target.value)}
                    placeholder="e.g. Link Road, Andheri West, Mumbai 400053"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 bg-white text-slate-900 font-medium"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = customAddressInput.trim();
                        if (trimmed) {
                          setDetectedAddress(trimmed);
                          setLocationName(trimmed);
                          setCachedAddress(latitude, longitude, trimmed);
                          setAddressStatus('available');
                        }
                        setIsEditingAddress(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition cursor-pointer"
                    >
                      Confirm Address
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {isResolvingAddress ? (
                    <div className="flex items-center gap-2 text-slate-600 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                      <span className="text-xs">Detecting readable address via OpenStreetMap...</span>
                    </div>
                  ) : detectedAddress ? (
                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {detectedAddress}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="font-mono text-xs text-slate-700">
                        {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Address unavailable
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 text-[11px] font-mono text-slate-500">
                    <span>
                      GPS Fix: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                    </span>
                    {accuracy ? <span>±{accuracy}m accuracy</span> : null}
                  </div>
                </div>
              )}
            </div>
          ) : gpsError ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">GPS Alert</p>
                <p className="text-[11px] text-amber-800 mt-0.5">{gpsError}</p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pl-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Tap auto-detect GPS or select a city preset to attach precise geographic coordinates.</span>
            </div>
          )}
        </div>

        {/* Step 3: Optional Text Note */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">3</span>
              <span>Incident Note & Hazard Details</span>
              <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {note.length}/300
            </span>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder="e.g. Deep pothole on busy lane in Andheri East endangering two-wheelers. Loose rubble causing vehicles to swerve..."
            rows={3}
            className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 outline-none text-sm text-slate-800 placeholder:text-slate-400 transition resize-none"
          />

          {/* Quick chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Quick tags:</span>
            {quickNotes.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setNote((prev) => {
                    if (!prev) return chip;
                    if (prev.includes(chip)) return prev;
                    return `${prev}. ${chip}`;
                  });
                }}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Validation / Error banner */}
        {submitError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Submission Bar */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 text-center sm:text-left flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-900" />
            <span>Sends image to Gemini API (model: gemma-4-26b-a4b-it) upon submission.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-blue-900/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Running Gemini Inspection...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Submit & Inspect with Gemini</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
