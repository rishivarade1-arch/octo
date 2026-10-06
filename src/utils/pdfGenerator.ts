import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report } from '../types';
import { calculatePriorityScore, CriticalLocation, DEFAULT_CRITICAL_LOCATIONS } from '../criticalLocations';

/**
 * Helper to sanitize filenames
 */
function sanitizeFileName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Helper to fetch or fallback complaint letter text using Gemma 4 API
 */
export async function fetchOrGenerateComplaint(targetReport: Report, existingText?: string): Promise<string> {
  if (existingText && existingText.trim().length > 25) {
    return existingText;
  }

  const readableAddress = (targetReport.address || targetReport.locationName)?.trim();
  const hasReadableAddress = readableAddress && !readableAddress.includes('Address unavailable') && readableAddress !== `${targetReport.latitude.toFixed(4)}, ${targetReport.longitude.toFixed(4)}`;
  const coords = `${targetReport.latitude.toFixed(4)}, ${targetReport.longitude.toFixed(4)}`;
  const locString = hasReadableAddress ? `${readableAddress} (${coords})` : coords;
  const riskString = targetReport.risk_reason || targetReport.note || 'deep pothole on a busy lane endangering two-wheelers';

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
      if (data.complaint && typeof data.complaint === 'string') {
        return data.complaint;
      }
    }
  } catch (err) {
    console.warn('Complaint generation API fallback:', err);
  }

  // Fallback adhering exactly to prompt requirements
  return `To
The Ward Officer,
Municipal Corporation Maintenance Division,
${hasReadableAddress ? readableAddress : `Sector Jurisdiction (${coords})`}.

Subject: Urgent Complaint Regarding Dangerous ${(targetReport.issue_type || 'Pothole').replace('_', ' ')} (Severity ${targetReport.severity || 8}/10)

Respected Sir/Madam,

I am writing to bring to your urgent attention a hazardous road condition at ${locString}.

A severe ${(targetReport.issue_type || 'pothole').replace('_', ' ')} assessed at Severity ${targetReport.severity || 8}/10 has developed along this active route. ${riskString}.

Considering the critical threat to commuter safety, I earnestly request your prompt intervention to barricade the hazard and complete the necessary repair within 72 hours.

Thank you.

Yours sincerely,
A Concerned Resident`;
}

/**
 * Loads an image to determine its dimensions and format.
 */
function loadImageAsync(src: string): Promise<{ img: HTMLImageElement; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string' || src.trim().length === 0) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 3500);

    img.onload = () => {
      clearTimeout(timer);
      resolve({ img, width: img.naturalWidth || 480, height: img.naturalHeight || 320 });
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = src;
  });
}

/**
 * Adds universal page headers, borders and footers to a jsPDF document.
 */
function applyPageDecoration(doc: jsPDF, totalPages: number) {
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Header subtle accent line
    doc.setDrawColor(30, 58, 138); // blue-900
    doc.setLineWidth(0.8);
    doc.line(15, 12, 195, 12);

    // Footer bottom divider
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(15, 283, 195, 283);

    // Footer text: "Generated with Gemma 4 via RoadWatch AI" and page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Generated with Gemma 4 via RoadWatch AI', 15, 289);
    doc.text(`Page ${i} of ${totalPages}`, 195, 289, { align: 'right' });
  }
}

/**
 * Helper to ensure vertical page space or add a new page
 */
function checkPageSpace(doc: jsPDF, currentY: number, neededSpace: number): number {
  if (currentY + neededSpace > 275) {
    doc.addPage();
    return 22; // top margin below header
  }
  return currentY;
}

/**
 * Generates and downloads a single comprehensive A4 PDF report for an infrastructure issue.
 */
export async function generateSingleReportPDF(
  report: Report,
  allReports: Report[],
  criticalLocations: CriticalLocation[] = DEFAULT_CRITICAL_LOCATIONS,
  providedComplaintText?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const marginX = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2; // 180mm
  let y = 18;

  // Calculate Priority Score Breakdown
  const breakdown = calculatePriorityScore(report, allReports, criticalLocations);
  const scoreLevel = breakdown.totalScore >= 70 ? 'High' : breakdown.totalScore >= 40 ? 'Medium' : 'Low';

  // 1. Header: "RoadWatch AI - Infrastructure Issue Report" with date/time and unique report ID
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, y, contentWidth, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('RoadWatch AI - Infrastructure Issue Report', marginX + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(191, 219, 254); // blue-200
  const dateStr = `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`${dateStr}  |  Report ID: #${report.id}`, marginX + 6, y + 15);

  // Status Badge in header
  doc.setFillColor(30, 58, 138); // blue-800
  doc.roundedRect(195 - 30, y + 4.5, 26, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(report.status.toUpperCase(), 195 - 17, y + 11.5, { align: 'center' });

  y += 25;

  // 2. Photo of the issue (scaled to fit page width while keeping aspect ratio, or fallback)
  const imageLoadResult = await loadImageAsync(report.image);

  if (imageLoadResult && imageLoadResult.width > 0) {
    const maxPhotoH = 65;
    const aspect = imageLoadResult.width / imageLoadResult.height;
    let photoW = contentWidth;
    let photoH = photoW / aspect;

    if (photoH > maxPhotoH) {
      photoH = maxPhotoH;
      photoW = photoH * aspect;
    }

    const photoX = marginX + (contentWidth - photoW) / 2;

    try {
      doc.addImage(report.image, 'JPEG', photoX, y, photoW, photoH);
      // Photo border
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.rect(photoX, y, photoW, photoH);
      y += photoH + 5;
    } catch {
      // If addImage fails for any format issue, render clean neutral box
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, y, contentWidth, 32, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No photo available', pageWidth / 2, y + 17, { align: 'center' });
      y += 36;
    }
  } else {
    // Missing or invalid image: neutral fallback placeholder box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, y, contentWidth, 32, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No photo available', pageWidth / 2, y + 17, { align: 'center' });
    y += 36;
  }

  // 3. Details Table:
  // issue type, severity (x/10), confidence, priority score with level (High/Medium/Low),
  // affected group, GPS coordinates, approximate address if available, status, date reported
  y = checkPageSpace(doc, y, 40);

  const tableRows = [
    [
      'Issue Type',
      (report.issue_type || 'pothole').replace('_', ' ').toUpperCase(),
      'Severity',
      `${report.severity || 8} / 10`
    ],
    [
      'Confidence',
      `${report.confidence || 92}%`,
      'Priority Score',
      `${breakdown.totalScore} / 100 (${scoreLevel} Priority)`
    ],
    [
      'Affected Group',
      (report.affected_group || 'everyone').toUpperCase(),
      'Current Status',
      report.status
    ],
    [
      'GPS Coordinates',
      `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`,
      'Date Reported',
      report.timestamp || 'Today'
    ],
    [
      'Readable Address',
      (() => {
        const addr = (report.address || report.locationName)?.trim();
        return addr && !addr.includes('Address unavailable') && addr !== `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
          ? addr
          : 'Address unavailable';
      })(),
      'Inspection Model',
      report.model_used || 'gemma-4-26b-a4b-it'
    ]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Details', 'Field', 'Details']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      1: { cellWidth: 58 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      3: { cellWidth: 58 }
    },
    margin: { left: marginX, right: marginX }
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 4. "Risk assessment" section: AI's risk_reason and recommended_action
  y = checkPageSpace(doc, y, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Risk Assessment', marginX, y);
  y += 4.5;

  autoTable(doc, {
    startY: y,
    body: [
      [
        'Risk Reason',
        report.risk_reason || report.note || 'Hazardous road condition threatening commuter balance and causing traffic swerving.'
      ],
      [
        'Recommended Action',
        report.recommended_action || 'Barricade lane immediately and restore asphalt surface within 72 hours.'
      ]
    ],
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, textColor: [185, 28, 28] },
      1: { cellWidth: contentWidth - 38 }
    },
    margin: { left: marginX, right: marginX }
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 5. "Priority score breakdown": severity points, location risk points, duplicate bonus points
  y = checkPageSpace(doc, y, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Priority Score Breakdown', marginX, y);
  y += 4.5;

  const nearestDesc = breakdown.nearestLocation
    ? `+${breakdown.locationRisk} (${breakdown.nearestLocation.location.name} - ${breakdown.nearestLocation.distanceMeters}m)`
    : `${breakdown.locationRisk} pts (No critical facility within 1km)`;

  const duplicateDesc = breakdown.duplicateBonus > 0
    ? `+${breakdown.duplicateBonus} pts (${breakdown.duplicateCount} duplicate report(s) within 100m)`
    : '0 pts (No nearby duplicate reports within 100m)';

  autoTable(doc, {
    startY: y,
    head: [['Component', 'Points', 'Calculation Rule & Analysis']],
    body: [
      ['Severity Points', `${breakdown.severityPoints} / 50`, `Severity (${report.severity || 8}) × 5 points`],
      ['Location Risk', `${breakdown.locationRisk} / 30`, nearestDesc],
      ['Duplicate Bonus', `${breakdown.duplicateBonus} / 20`, duplicateDesc],
      ['Total Priority Score', `${breakdown.totalScore} / 100`, `${scoreLevel.toUpperCase()} PRIORITY QUEUE TIER`]
    ],
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: contentWidth - 68 }
    },
    margin: { left: marginX, right: marginX }
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 6. "Complaint letter" section: full generated complaint text (generated if not provided)
  y = checkPageSpace(doc, y, 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Municipal Complaint Letter', marginX, y);
  y += 4.5;

  const complaintText = await fetchOrGenerateComplaint(report, providedComplaintText);

  autoTable(doc, {
    startY: y,
    body: [[complaintText]],
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [15, 23, 42],
      fillColor: [248, 250, 252],
      lineColor: [203, 213, 225],
      lineWidth: 0.3
    },
    margin: { left: marginX, right: marginX }
  });

  // 7. Footer: "Generated with Gemma 4 via RoadWatch AI" and page number across all pages
  const totalPages = doc.getNumberOfPages();
  applyPageDecoration(doc, totalPages);

  // File download name: RoadWatch_Report_[ID]_[issue type].pdf
  const fileName = `RoadWatch_Report_${sanitizeFileName(report.id)}_${sanitizeFileName(report.issue_type || 'issue')}.pdf`;
  doc.save(fileName);
}

/**
 * Generates and downloads a summary PDF containing a table of all reports sorted by priority.
 */
export async function generateAllReportsSummaryPDF(
  reports: Report[],
  criticalLocations: CriticalLocation[] = DEFAULT_CRITICAL_LOCATIONS
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const marginX = 14;
  const contentWidth = 297 - marginX * 2; // 269mm
  let y = 14;

  // Compute and sort all reports by priority score descending
  const sortedReports = reports
    .map((r) => {
      const breakdown = calculatePriorityScore(r, reports, criticalLocations);
      return {
        report: r,
        score: breakdown.totalScore,
        breakdown
      };
    })
    .sort((a, b) => b.score - a.score);

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, y, contentWidth, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('RoadWatch AI - Spatial Infrastructure Incidents Summary', marginX + 6, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  const totalCount = sortedReports.length;
  const highCount = sortedReports.filter((item) => item.score >= 70).length;
  const fixedCount = sortedReports.filter((item) => item.report.status === 'Fixed').length;
  const dateStr = `Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(
    `${dateStr}  |  Total Cases: ${totalCount}  |  High Priority (70+): ${highCount}  |  Fixed / Repaired: ${fixedCount}`,
    marginX + 6,
    y + 13.5
  );

  y += 22;

  // Table rows: ID, Issue, Severity, Priority Score, Status, Location
  const tableData = sortedReports.map(({ report, score }) => {
    const addr = (report.address || report.locationName)?.trim();
    const hasAddr = addr && !addr.includes('Address unavailable') && addr !== `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;
    const locCell = hasAddr
      ? `${addr} (${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)})`
      : `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)} (Address unavailable)`;

    return [
      report.id,
      (report.issue_type || 'pothole').replace('_', ' ').toUpperCase(),
      `${report.severity || 8}/10`,
      `${score}/100 (${score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'})`,
      report.status,
      locCell
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Report ID', 'Issue Type', 'Severity', 'Priority Score', 'Status', 'Location / Coordinates']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [30, 58, 138], // blue-900
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 38 },
      2: { cellWidth: 22, halign: 'center' },
      3: { fontStyle: 'bold', cellWidth: 38 },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: contentWidth - (32 + 38 + 22 + 38 + 26) }
    },
    margin: { left: marginX, right: marginX }
  });

  // Footer decoration on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(marginX, 196, 297 - marginX, 196);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Generated with Gemma 4 via RoadWatch AI', marginX, 202);
    doc.text(`Page ${i} of ${totalPages}`, 297 - marginX, 202, { align: 'right' });
  }

  doc.save(`RoadWatch_All_Reports_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
}
