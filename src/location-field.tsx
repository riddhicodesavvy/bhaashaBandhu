import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useApp } from './context';
import { captureCoordinates, LocationError, reverseGeocode } from './location';
import { coordinateText, incidentMapUrl, validCoordinates, type Coordinates } from '../shared/location';

export function CoordinatesDisplay({ coordinates, map = false }: { coordinates: unknown; map?: boolean }) {
  const { t } = useApp();
  if (!validCoordinates(coordinates)) return null;
  return <span className="incident-coordinates">
    <span>{t('coordinates')}: {coordinateText(coordinates)}</span>
    {map && <a href={incidentMapUrl(coordinates)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t('viewOnMap')}</a>}
  </span>;
}

export function IncidentLocationField({ value, onChange, coordinates, onCoordinates, onBusyChange, disabled, placeholder }: {
  value: string; onChange: (value: string) => void;
  coordinates?: Coordinates; onCoordinates: (value: Coordinates | undefined) => void;
  onBusyChange: (busy: boolean) => void; disabled: boolean; placeholder?: string;
}) {
  const { t, locale } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const currentValue = useRef(value);
  currentValue.current = value;
  const request = useRef<{ active: boolean; controller?: AbortController }>({ active: false });
  useEffect(() => () => { request.current.active = false; request.current.controller?.abort(); }, []);

  async function locate() {
    if (request.current.active || disabled) return;
    const pending = { active: true, controller: new AbortController() };
    request.current = pending;
    setBusy(true); onBusyChange(true); setError(''); setMessage(''); setSuggestion('');
    try {
      const captured = await captureCoordinates(navigator.geolocation, window.isSecureContext);
      if (!pending.active) return;
      onCoordinates(captured);
      let address = coordinateText(captured);
      const timeout = window.setTimeout(() => pending.controller.abort(), 8000);
      try {
        address = await reverseGeocode(captured, locale, pending.controller.signal);
        if (pending.active) setMessage(t('locationCaptured'));
      } catch {
        if (pending.active) setMessage(t('locationAddressUnavailable'));
      } finally { window.clearTimeout(timeout); }
      if (!pending.active) return;
      if (!currentValue.current.trim()) onChange(address);
      else setSuggestion(address);
    } catch (failure) {
      if (!pending.active) return;
      const code = failure instanceof LocationError ? failure.code : 'unavailable';
      setError(t(code === 'denied' ? 'locationDenied' : code === 'timeout' ? 'locationTimeout' : 'locationUnavailable'));
    } finally {
      if (pending.active) {
        pending.active = false;
        setBusy(false); onBusyChange(false);
      }
    }
  }

  return <div className="location-field">
    <label htmlFor="incident-location">{t('location')}</label>
    <input id="incident-location" required minLength={2} maxLength={300} value={value}
      onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-describedby="location-help" />
    <button type="button" className="button secondary location-button" disabled={busy || disabled} onClick={() => void locate()}>
      <MapPin size={18} aria-hidden="true" />{busy ? t('gettingLocation') : t('useCurrentLocation')}
    </button>
    <small id="location-help" className="helper">{t('locationPrivacy')} <a href="https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free" target="_blank" rel="noopener noreferrer">BigDataCloud</a></small>
    {busy && <p className="helper" role="status">{t('gettingLocation')}</p>}
    {error && <p className="warning-text" role="alert">{error}</p>}
    {message && <p className="helper" role="status">{message}</p>}
    {coordinates && <><CoordinatesDisplay coordinates={coordinates} />
      <button type="button" className="text-button" disabled={busy || disabled} onClick={() => { onCoordinates(undefined); setSuggestion(''); setMessage(''); }}>{t('removeCoordinates')}</button>
    </>}
    {suggestion && <div className="location-suggestion">
      <p>{t('locationSuggestion')}: {suggestion}</p>
      <button type="button" className="text-button" disabled={disabled} onClick={() => { onChange(suggestion); setSuggestion(''); }}>{t('useSuggestedLocation')}</button>
    </div>}
  </div>;
}
