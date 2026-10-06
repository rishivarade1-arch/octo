export type ReportStatus = 'Reported' | 'Assigned' | 'Fixed';

export type PriorityRank = 'Urgent' | 'High' | 'Medium' | 'Low';

export interface InspectionData {
  issue_type: 'pothole' | 'damaged_road' | 'broken_streetlight' | 'drain_overflow' | 'none' | string;
  confidence: number;
  severity: number;
  risk_reason: string;
  affected_group: 'pedestrians' | 'two_wheelers' | 'vehicles' | 'everyone' | string;
  recommended_action: string;
  model_used?: string;
}

export interface Report extends InspectionData {
  id: string;
  image: string;
  latitude: number;
  longitude: number;
  note: string;
  timestamp: string;
  status: ReportStatus;
  priorityRank: PriorityRank;
  locationName?: string;
  address?: string;
  addressStatus?: 'available' | 'unavailable' | 'loading';
  priorityScore?: number;
  deviceId?: string;
}
