import { Report } from './types';

// Zero demo data - all reports are submitted by live citizens/users
export const SAMPLE_IMAGES: Record<string, string> = {};

export const INITIAL_REPORTS: Report[] = [];

export const MUMBAI_15_DEMO_REPORTS: Report[] = [];

/**
 * Regenerates local procedural placeholder images for any list of reports.
 */
export function regenerateReportImages(reportList: Report[]): Report[] {
  return reportList;
}

export function getFreshInitialReports(): Report[] {
  return [];
}

export function getFreshMumbaiDemoReports(): Report[] {
  return [];
}
