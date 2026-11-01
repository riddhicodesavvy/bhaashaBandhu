export interface Coordinates { latitude: number; longitude: number }

export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const { latitude, longitude } = value as Coordinates;
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function coordinateText(value: Coordinates): string {
  return `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`;
}

export function incidentMapUrl(value: Coordinates): string {
  const query = new URLSearchParams({ mlat: String(value.latitude), mlon: String(value.longitude) });
  return `https://www.openstreetmap.org/?${query}#map=18/${value.latitude}/${value.longitude}`;
}
