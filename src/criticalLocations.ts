export interface CriticalLocation {
  id: string;
  name: string;
  type: 'school' | 'hospital' | 'highway';
  latitude: number;
  longitude: number;
  city?: string;
}

// Fixed hardcoded list of real critical infrastructure points (School, Hospital, Highway) around Mumbai and key corridors
export const DEFAULT_CRITICAL_LOCATIONS: CriticalLocation[] = [
  // --- ANDHERI & WESTERN SUBURBS ---
  {
    id: 'crit-mum-andheri-1',
    name: 'Holy Family High School & Convent',
    type: 'school',
    latitude: 19.1145,
    longitude: 72.8682,
    city: 'Mumbai (Andheri East)'
  },
  {
    id: 'crit-mum-andheri-2',
    name: 'CritCare Asia Multispecialty Hospital',
    type: 'hospital',
    latitude: 19.1128,
    longitude: 72.8705,
    city: 'Mumbai (Andheri East)'
  },
  {
    id: 'crit-mum-andheri-3',
    name: 'Western Express Highway (WEH Andheri Flyover)',
    type: 'highway',
    latitude: 19.1152,
    longitude: 72.8665,
    city: 'Mumbai (Andheri East)'
  },
  {
    id: 'crit-mum-andheri-4',
    name: 'SevenHills Super Specialty Hospital',
    type: 'hospital',
    latitude: 19.1205,
    longitude: 72.8795,
    city: 'Mumbai (Marol / Andheri East)'
  },
  {
    id: 'crit-mum-andheri-5',
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    type: 'hospital',
    latitude: 19.1310,
    longitude: 72.8250,
    city: 'Mumbai (Andheri West)'
  },
  {
    id: 'crit-mum-andheri-6',
    name: "Bhavan's A. H. Wadia High School",
    type: 'school',
    latitude: 19.1235,
    longitude: 72.8365,
    city: 'Mumbai (Andheri West)'
  },

  // --- BANDRA & BKC ---
  {
    id: 'crit-mum-bandra-1',
    name: 'Lilavati Hospital & Research Centre',
    type: 'hospital',
    latitude: 19.0515,
    longitude: 72.8290,
    city: 'Mumbai (Bandra West)'
  },
  {
    id: 'crit-mum-bandra-2',
    name: 'St. Stanislaus High School',
    type: 'school',
    latitude: 19.0575,
    longitude: 72.8340,
    city: 'Mumbai (Bandra West)'
  },
  {
    id: 'crit-mum-bandra-3',
    name: 'Western Express Highway (Bandra Kalanagar Junction)',
    type: 'highway',
    latitude: 19.0600,
    longitude: 72.8520,
    city: 'Mumbai (Bandra East)'
  },
  {
    id: 'crit-mum-bandra-4',
    name: 'Bandra-Worli Sea Link Toll Expressway',
    type: 'highway',
    latitude: 19.0390,
    longitude: 72.8180,
    city: 'Mumbai (Bandra Reclamation)'
  },

  // --- DADAR & CENTRAL MUMBAI ---
  {
    id: 'crit-mum-dadar-1',
    name: 'Dr. Babasaheb Ambedkar Road (NH 48 Arterial Highway)',
    type: 'highway',
    latitude: 19.0180,
    longitude: 72.8480,
    city: 'Mumbai (Dadar TT Circle)'
  },
  {
    id: 'crit-mum-dadar-2',
    name: 'Shardashram Vidyamandir English High School',
    type: 'school',
    latitude: 19.0210,
    longitude: 72.8385,
    city: 'Mumbai (Dadar West)'
  },
  {
    id: 'crit-mum-dadar-3',
    name: 'Dr. Antonio Da Silva High School',
    type: 'school',
    latitude: 19.0220,
    longitude: 72.8430,
    city: 'Mumbai (Dadar West)'
  },
  {
    id: 'crit-mum-dadar-4',
    name: 'P. D. Hinduja National Hospital',
    type: 'hospital',
    latitude: 19.0335,
    longitude: 72.8385,
    city: 'Mumbai (Mahim / Dadar)'
  },
  {
    id: 'crit-mum-dadar-5',
    name: 'KEM Hospital & Seth GS Medical College',
    type: 'hospital',
    latitude: 19.0035,
    longitude: 72.8420,
    city: 'Mumbai (Parel / Dadar)'
  },

  // --- KURLA & EASTERN EXPRESS ---
  {
    id: 'crit-mum-kurla-1',
    name: 'St. Michael High School, Kurla',
    type: 'school',
    latitude: 19.0772,
    longitude: 72.8785,
    city: 'Mumbai (Kurla West)'
  },
  {
    id: 'crit-mum-kurla-2',
    name: 'Bhabha Municipal General Hospital Kurla',
    type: 'hospital',
    latitude: 19.0675,
    longitude: 72.8780,
    city: 'Mumbai (Kurla West)'
  },
  {
    id: 'crit-mum-kurla-3',
    name: 'Lal Bahadur Shastri (LBS) Marg Arterial Highway',
    type: 'highway',
    latitude: 19.0740,
    longitude: 72.8810,
    city: 'Mumbai (Kurla West)'
  },
  {
    id: 'crit-mum-kurla-4',
    name: 'Santacruz-Chembur Link Road (SCLR Highway Flyover)',
    type: 'highway',
    latitude: 19.0710,
    longitude: 72.8760,
    city: 'Mumbai (Kurla)'
  },
  {
    id: 'crit-mum-kurla-5',
    name: 'Eastern Express Highway (Chedda Nagar Junction)',
    type: 'highway',
    latitude: 19.0680,
    longitude: 72.8950,
    city: 'Mumbai (Eastern Expressway)'
  },

  // --- POWAI & JVLR ---
  {
    id: 'crit-mum-powai-1',
    name: 'Dr. L. H. Hiranandani Hospital',
    type: 'hospital',
    latitude: 19.1190,
    longitude: 72.9120,
    city: 'Mumbai (Powai)'
  },
  {
    id: 'crit-mum-powai-2',
    name: 'Hiranandani Foundation School',
    type: 'school',
    latitude: 19.1170,
    longitude: 72.9090,
    city: 'Mumbai (Powai)'
  },
  {
    id: 'crit-mum-powai-3',
    name: 'Kendriya Vidyalaya IIT Bombay',
    type: 'school',
    latitude: 19.1310,
    longitude: 72.9150,
    city: 'Mumbai (Powai)'
  },
  {
    id: 'crit-mum-powai-4',
    name: 'Jogeshwari-Vikhroli Link Road (JVLR Expressway)',
    type: 'highway',
    latitude: 19.1245,
    longitude: 72.9040,
    city: 'Mumbai (Powai / JVLR)'
  },

  // --- OTHER NOTABLE CORRIDORS (Indore & Delhi) ---
  {
    id: 'crit-ind-1',
    name: 'Maharaja Yeshwantrao (MY) Government Hospital',
    type: 'hospital',
    latitude: 22.7185,
    longitude: 75.8592,
    city: 'Indore (MG Road Central)'
  },
  {
    id: 'crit-ind-2',
    name: 'National Highway 52 (AB Road Expressway)',
    type: 'highway',
    latitude: 22.7212,
    longitude: 75.8562,
    city: 'Indore'
  }
];

/**
 * Calculates geographic distance in meters between two lat/lng coordinates using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface ScoreBreakdown {
  severityPoints: number; // severity * 5 (max 50)
  locationRisk: number; // +30 if <= 300m, +15 if <= 1000m, else 0 (max 30)
  nearestLocation?: {
    location: CriticalLocation;
    distanceMeters: number;
  };
  duplicateBonus: number; // +5 per duplicate <= 100m (max 20)
  duplicateCount: number;
  totalScore: number; // 0 - 100
  tier: 'red' | 'orange' | 'green';
}

/**
 * Calculates priority score (0-100) using the exact formula:
 * score = severity*5 + locationRisk + duplicateBonus
 *
 * - locationRisk (max 30): +30 if within 300 m of school/hospital/highway, +15 if within 1 km, else 0.
 * - duplicateBonus (max 20): +5 for each other report of same issue type within 100 m, capped at 20.
 */
export function calculatePriorityScore(
  report: {
    id?: string;
    latitude: number;
    longitude: number;
    severity: number;
    issue_type?: string;
  },
  allReports: Array<{
    id: string;
    latitude: number;
    longitude: number;
    issue_type?: string;
  }>,
  criticalLocations: CriticalLocation[] = DEFAULT_CRITICAL_LOCATIONS
): ScoreBreakdown {
  // 1. Severity points: severity * 5 (capped at 50)
  const severityPoints = Math.min(Math.max(report.severity || 1, 1), 10) * 5;

  // 2. Location risk calculation
  let locationRisk = 0;
  let nearestLocation: { location: CriticalLocation; distanceMeters: number } | undefined;
  let minDistance = Infinity;

  criticalLocations.forEach((loc) => {
    const dist = calculateDistanceMeters(
      report.latitude,
      report.longitude,
      loc.latitude,
      loc.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestLocation = { location: loc, distanceMeters: dist };
    }
  });

  if (minDistance <= 300) {
    locationRisk = 30;
  } else if (minDistance <= 1000) {
    locationRisk = 15;
  } else {
    locationRisk = 0;
  }

  // 3. Duplicate bonus calculation
  let duplicateCount = 0;
  if (report.issue_type) {
    allReports.forEach((other) => {
      // Must be a different report
      if (other.id && report.id && other.id === report.id) return;
      // Must be same issue type
      if (other.issue_type !== report.issue_type) return;

      const dist = calculateDistanceMeters(
        report.latitude,
        report.longitude,
        other.latitude,
        other.longitude
      );

      if (dist <= 100) {
        duplicateCount++;
      }
    });
  }

  const duplicateBonus = Math.min(duplicateCount * 5, 20);

  // Total score clamped 0 - 100
  const rawTotal = severityPoints + locationRisk + duplicateBonus;
  const totalScore = Math.min(Math.max(rawTotal, 0), 100);

  const tier: 'red' | 'orange' | 'green' =
    totalScore >= 70 ? 'red' : totalScore >= 40 ? 'orange' : 'green';

  return {
    severityPoints,
    locationRisk,
    nearestLocation,
    duplicateBonus,
    duplicateCount,
    totalScore,
    tier
  };
}
