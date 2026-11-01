import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureCoordinates, reverseGeocode } from '../src/location';
import { validCoordinates, incidentMapUrl } from '../shared/location';
import { incidentInput } from '../server/validation';

test('one explicit capture uses native high-accuracy GPS, with no cached/IP location', async () => {
  let calls = 0;
  const geolocation: Pick<Geolocation, 'getCurrentPosition'> = {
    getCurrentPosition(success, _failure, options) {
      calls++;
      assert.deepEqual(options, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition);
    }
  };
  assert.equal(calls, 0);
  assert.deepEqual(await captureCoordinates(geolocation, true), { latitude: 0, longitude: 0 });
  assert.equal(calls, 1);
  await assert.rejects(() => captureCoordinates(geolocation, false), { code: 'unavailable' });
  assert.equal(calls, 1);
});

test('permission denied, unavailable, timeout and unsupported GPS preserve manual fallback', async () => {
  for (const [number, code] of [[1, 'denied'], [2, 'unavailable'], [3, 'timeout']] as const) {
    await assert.rejects(() => captureCoordinates({ getCurrentPosition(_success, failure) {
      failure!({ code: number } as GeolocationPositionError);
    } }, true), { code });
  }
  await assert.rejects(() => captureCoordinates(undefined, true), { code: 'unavailable' });
});

test('reverse geocoding makes one credential-free lookup and rejects unrelated/IP results', async () => {
  const coordinates = { latitude: 12.823, longitude: 80.044 };
  let calls = 0;
  const fetcher: typeof fetch = async (input, options) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.hostname, 'api.bigdatacloud.net');
    assert.equal(url.searchParams.get('latitude'), '12.823');
    assert.equal(url.searchParams.get('longitude'), '80.044');
    assert.equal(url.searchParams.get('localityLanguage'), 'hi');
    assert.equal(options?.credentials, 'omit');
    return new Response(JSON.stringify({ ...coordinates, locality: 'Kattankulathur', city: 'Kattankulathur', principalSubdivision: 'Tamil Nadu', countryName: 'India' }));
  };
  assert.equal(await reverseGeocode(coordinates, 'hi', new AbortController().signal, fetcher), 'Kattankulathur, Tamil Nadu, India');
  assert.equal(calls, 1);
  await assert.rejects(() => reverseGeocode(coordinates, 'en', new AbortController().signal, async () => new Response('{}')));
  await assert.rejects(() => reverseGeocode(coordinates, 'en', new AbortController().signal, async () => new Response('', { status: 503 })));
  assert.deepEqual(coordinates, { latitude: 12.823, longitude: 80.044 });
});

test('incident coordinates are an optional finite numeric pair; invalid or partial input is rejected', () => {
  const report = { originalText: 'Loose cable in generator room.', sourceLanguage: 'en', category: 'hazard', urgency: 'medium', location: 'Generator room', requestId: '99a7ac7d-4d21-4cb8-bfd5-5178dc8cf8d1' };
  assert.equal(incidentInput.safeParse(report).success, true);
  for (const coordinates of [{ latitude: -90, longitude: -180 }, { latitude: 90, longitude: 180 }, { latitude: 0, longitude: 0 }]) {
    assert.equal(incidentInput.safeParse({ ...report, ...coordinates }).success, true);
    assert.equal(validCoordinates(coordinates), true);
  }
  for (const coordinates of [{ latitude: '12', longitude: 80 }, { latitude: NaN, longitude: 80 }, { latitude: Infinity, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: 12 }, { longitude: 80 }, { latitude: null, longitude: null }]) {
    assert.equal(incidentInput.safeParse({ ...report, ...coordinates }).success, false, JSON.stringify(coordinates));
    assert.equal(validCoordinates(coordinates), false);
  }
  assert.match(incidentMapUrl({ latitude: 0, longitude: 0 }), /mlat=0&mlon=0#map=18\/0\/0$/);
});
