/**
 * OpenStreetMap Nominatim Reverse Geocoding Utility
 * 
 * Rules:
 * 1. Endpoint: https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=18&addressdetails=1
 * 2. Formats: road, suburb/neighbourhood, city, and postcode into "Link Road, Andheri West, Mumbai 400053"
 * 3. Rate Limit: <= 1 request per second strictly enforced via sequential queue
 * 4. Caching: Results cached by 4-decimal rounded coordinates in-memory and in localStorage
 * 5. Timeout: 5 seconds timeout fallback to "Address unavailable" with a single background retry
 */

const STORAGE_CACHE_KEY = 'roadwatch_reverse_geo_cache_v1';
const NOMINATIM_RATE_LIMIT_MS = 1100; // 1.1s to guarantee strictly <= 1 req/sec

export interface ReverseGeoResult {
  address: string | null;
  status: 'available' | 'unavailable' | 'loading';
  lat: number;
  lon: number;
}

// In-memory cache
const memoryCache = new Map<string, { address: string | null; status: 'available' | 'unavailable'; timestamp: number }>();

// Track background retry status per cache key so we retry at most once
const retriedKeys = new Set<string>();

// Listeners map for asynchronous background resolution
type AddressListener = (address: string | null, status: 'available' | 'unavailable') => void;
const listeners = new Map<string, Set<AddressListener>>();

// Initialize cache from localStorage
try {
  const stored = localStorage.getItem(STORAGE_CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, v]: [string, any]) => {
        if (v && typeof v === 'object') {
          memoryCache.set(k, {
            address: v.address || null,
            status: v.status === 'available' ? 'available' : 'unavailable',
            timestamp: v.timestamp || Date.now()
          });
        }
      });
    }
  }
} catch (e) {
  console.warn('Could not read geocoding cache from localStorage:', e);
}

function persistCacheToStorage() {
  try {
    const obj: Record<string, any> = {};
    memoryCache.forEach((v, k) => {
      obj[k] = v;
    });
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Could not persist geocoding cache:', e);
  }
}

/**
 * Normalizes coordinates to 4 decimal places for caching (~11m resolution)
 */
export function getCoordKey(lat: number, lon: number): string {
  const roundedLat = Number(lat).toFixed(4);
  const roundedLon = Number(lon).toFixed(4);
  return `${roundedLat},${roundedLon}`;
}

/**
 * Extracts road, suburb/neighbourhood, city, and postcode into a concise readable address string:
 * "Link Road, Andheri West, Mumbai 400053"
 */
export function formatNominatimAddress(addr: any, displayName?: string): string {
  if (!addr || typeof addr !== 'object') {
    if (displayName && typeof displayName === 'string') {
      const parts = displayName.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.slice(0, 3).join(', ');
    }
    return '';
  }

  // 1. Road component
  const road =
    addr.road ||
    addr.pedestrian ||
    addr.street ||
    addr.footway ||
    addr.path ||
    addr.highway ||
    addr.building ||
    addr.industrial ||
    '';

  // 2. Suburb / Neighbourhood component
  const suburb =
    addr.suburb ||
    addr.neighbourhood ||
    addr.residential ||
    addr.subdistrict ||
    addr.quarter ||
    addr.borough ||
    addr.hamlet ||
    '';

  // 3. City component
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.county ||
    addr.state_district ||
    '';

  // 4. Postcode component
  const postcode = addr.postcode ? String(addr.postcode).trim() : '';

  // Combine city and postcode: e.g. "Mumbai 400053"
  let cityPart = '';
  if (city && postcode) {
    cityPart = `${city} ${postcode}`;
  } else if (city) {
    cityPart = city;
  } else if (postcode) {
    cityPart = postcode;
  }

  const parts: string[] = [];
  if (road) parts.push(road);
  if (suburb && suburb.toLowerCase() !== road.toLowerCase()) parts.push(suburb);
  if (cityPart && !parts.some((p) => p.toLowerCase().includes(city.toLowerCase()))) {
    parts.push(cityPart);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (displayName && typeof displayName === 'string') {
    const fallbackParts = displayName.split(',').map((s) => s.trim()).filter(Boolean);
    return fallbackParts.slice(0, 3).join(', ');
  }

  return '';
}

interface QueueItem {
  lat: number;
  lon: number;
  key: string;
  isRetry: boolean;
  resolve: (res: string | null) => void;
}

const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;
let lastRequestTime = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const item = requestQueue.shift()!;
    const { lat, lon, key, isRetry, resolve } = item;

    // Check if cache was populated while waiting in queue
    const cached = memoryCache.get(key);
    if (cached && cached.status === 'available' && cached.address) {
      resolve(cached.address);
      notifyListeners(key, cached.address, 'available');
      continue;
    }

    // Enforce >= 1.1s gap between outbound requests (limit <= 1 req/sec)
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < NOMINATIM_RATE_LIMIT_MS) {
      await sleep(NOMINATIM_RATE_LIMIT_MS - timeSinceLast);
    }
    lastRequestTime = Date.now();

    const roundedLat = Number(lat).toFixed(4);
    const roundedLon = Number(lon).toFixed(4);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLon}&zoom=18&addressdetails=1`;

    // 5-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
      }

      const data = await response.json();
      const formattedAddress = formatNominatimAddress(data.address, data.display_name);

      if (formattedAddress && formattedAddress.trim().length > 0) {
        memoryCache.set(key, {
          address: formattedAddress,
          status: 'available',
          timestamp: Date.now()
        });
        persistCacheToStorage();
        notifyListeners(key, formattedAddress, 'available');
        resolve(formattedAddress);
      } else {
        throw new Error('No address details returned');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`Reverse geocode failed or timed out for [${roundedLat}, ${roundedLon}]:`, err);

      // Save unavailable status to cache
      memoryCache.set(key, {
        address: null,
        status: 'unavailable',
        timestamp: Date.now()
      });
      persistCacheToStorage();
      notifyListeners(key, null, 'unavailable');
      resolve(null);

      // Trigger a single background retry later (5 seconds later)
      if (!isRetry && !retriedKeys.has(key)) {
        retriedKeys.add(key);
        setTimeout(() => {
          // Re-queue in background with isRetry: true
          requestQueue.push({
            lat,
            lon,
            key,
            isRetry: true,
            resolve: () => {}
          });
          processQueue();
        }, 5000);
      }
    }
  }

  isProcessingQueue = false;
}

function notifyListeners(key: string, address: string | null, status: 'available' | 'unavailable') {
  const set = listeners.get(key);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(address, status);
      } catch (e) {
        console.error('Error in geocode listener callback:', e);
      }
    });
  }
}

/**
 * Subscribe to address resolution updates for given coordinates
 */
export function subscribeToAddress(lat: number, lon: number, callback: AddressListener): () => void {
  const key = getCoordKey(lat, lon);
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(callback);

  // If already in cache, notify immediately
  const cached = memoryCache.get(key);
  if (cached) {
    callback(cached.address, cached.status);
  }

  return () => {
    const set = listeners.get(key);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        listeners.delete(key);
      }
    }
  };
}

/**
 * Performs reverse geocoding with 4-decimal caching, 1 req/sec rate limit, and 5s timeout.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const key = getCoordKey(lat, lon);
  const cached = memoryCache.get(key);
  if (cached && cached.status === 'available' && cached.address) {
    return cached.address;
  }

  return new Promise<string | null>((resolve) => {
    requestQueue.push({
      lat,
      lon,
      key,
      isRetry: false,
      resolve
    });
    processQueue();
  });
}

/**
 * Synchronous cache lookup helper
 */
export function getCachedAddress(lat: number, lon: number): { address: string | null; status: 'available' | 'unavailable' | 'none' } {
  const key = getCoordKey(lat, lon);
  const cached = memoryCache.get(key);
  if (cached) {
    return { address: cached.address, status: cached.status };
  }
  return { address: null, status: 'none' };
}

/**
 * Saves a manually edited or verified address to cache
 */
export function setCachedAddress(lat: number, lon: number, address: string) {
  const key = getCoordKey(lat, lon);
  memoryCache.set(key, {
    address,
    status: 'available',
    timestamp: Date.now()
  });
  persistCacheToStorage();
  notifyListeners(key, address, 'available');
}

/**
 * Formats address display for cards, map popups, PDF, and lists.
 * Returns both formatted full string and short label.
 */
export function formatLocationWithAddress(
  address: string | null | undefined,
  lat: number,
  lon: number
): {
  displayText: string;
  hasAddress: boolean;
  addressPart: string;
  coordPart: string;
} {
  const coordPart = `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
  const cleanAddr = address?.trim();

  if (cleanAddr && cleanAddr !== coordPart && cleanAddr !== 'Address unavailable') {
    return {
      displayText: `${cleanAddr} (${coordPart})`,
      hasAddress: true,
      addressPart: cleanAddr,
      coordPart
    };
  }

  return {
    displayText: `${coordPart} (Address unavailable)`,
    hasAddress: false,
    addressPart: 'Address unavailable',
    coordPart
  };
}
