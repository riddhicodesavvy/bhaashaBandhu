# Incident current location

Workers can explicitly tap **Use Current Location** to capture one device position, then review/edit the Location text. No position is requested on mount, no location watch/poll runs, and no IP fallback is used. Capture requests high accuracy, a ten-second timeout, and `maximumAge: 0` so reverse geocoding uses a fresh position.

The browser makes one reverse-geocoding request to BigDataCloud, without an API key, Firebase token, cookies, report text, user ID or site ID. The form discloses this coordinate/IP sharing and links to the provider explanation. Calls are exclusively from the device being located, using consented live coordinates; tests must mock the geocoder rather than send synthetic or stored coordinates to its free endpoint. [Provider fair-use requirements](https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free), [client API/domain documentation](https://www.bigdatacloud.com/docs/api-domains).

If GPS fails, manual reporting remains available. If the address lookup fails or returns unrelated coordinates, the captured latitude/longitude are retained and the text falls back to six-decimal coordinates. Existing text and typing during capture are never replaced automatically; the result appears as an explicit suggestion. **Remove GPS coordinates** lets the Worker submit a purely manual location. Groq cannot replace existing Location text and never receives the coordinate fields.

The existing incident `location` is the only readable location field. Optional numeric `latitude`/`longitude` are stored in the same incident `payload` in Supabase. Both must be present together, finite numbers, with latitude in [-90,90] and longitude in [-180,180]. They are not identity or authorization inputs. No new table, duplicate address field or schema migration is necessary: the existing `jsonb` stores JSON numbers as PostgreSQL `numeric`, not strings. [PostgreSQL JSONB numeric mapping](https://www.postgresql.org/docs/16/datatype-json.html).

All role views display coordinates from the saved incident. Map links use only those saved coordinates. Opening a map shares coordinates with OpenStreetMap through the explicitly selected link; maps are optional.

Verification:

- `npm run check`, `npm test`, `npm run build`.
- `node scripts/verify-gps-production.mjs` verifies synthetic-coordinate persistence, authenticated role reads, new sign-ins, database gateway retrieval, validation failures, AI regressions and production document policy. It does **not** prove physical GPS or a live reverse-geocoding response.
- On a real phone/desktop: sign in as Worker, open Report Incident, confirm no permission request on load, tap Use Current Location and allow location. Check readable address and coordinate preview. Repeat with permission denied and confirm manual fallback. Check existing text is preserved until Use detected address is explicitly selected. Edit the address, submit, refresh and sign out/in; compare the incident ID/address/coordinates in Contractor and Hospital sessions.
- Browser location requires HTTPS (localhost is permitted for development), OS/browser location support and user permission. A Permissions-Policy permits geolocation only for the application's own origin.
