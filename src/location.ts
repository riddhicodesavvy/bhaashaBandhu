import { validCoordinates, type Coordinates } from '../shared/location';
import type { Locale } from '../shared/types';

export class LocationError extends Error {
  constructor(public code: 'denied' | 'unavailable' | 'timeout') { super(code); }
}

/** Invoked only by the explicit location button; never watchPosition or IP fallback. */
export function captureCoordinates(geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined, secure: boolean): Promise<Coordinates> {
  if (!secure || !geolocation) return Promise.reject(new LocationError('unavailable'));
  return new Promise((resolve, reject) => geolocation.getCurrentPosition(
    position => {
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      if (!validCoordinates(coordinates)) return reject(new LocationError('unavailable'));
      resolve(coordinates);
    },
    error => reject(new LocationError(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable')),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  ));
}

/** Only live, consented device coordinates may be passed to this browser-only service. */
export async function reverseGeocode(coordinates: Coordinates, locale: Locale, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<string> {
  if (!validCoordinates(coordinates)) throw new Error('Invalid coordinates');
  const query = new URLSearchParams({ latitude: String(coordinates.latitude), longitude: String(coordinates.longitude), localityLanguage: locale });
  const response = await fetcher(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`, {
    signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'
  });
  if (!response.ok) throw new Error('Reverse geocoding unavailable');
  const data: Record<string, unknown> = await response.json();
  // Never accept an IP-derived or unrelated address as the captured GPS location.
  if (!validCoordinates(data) || Math.abs(data.latitude - coordinates.latitude) > 0.00001 || Math.abs(data.longitude - coordinates.longitude) > 0.00001) {
    throw new Error('Geocoder coordinate mismatch');
  }
  const parts = [data.locality, data.city, data.principalSubdivision, data.countryName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map(part => part.trim());
  const address = [...new Set(parts)].join(', ').slice(0, 300);
  if (!address) throw new Error('No readable location');
  return address;
}
