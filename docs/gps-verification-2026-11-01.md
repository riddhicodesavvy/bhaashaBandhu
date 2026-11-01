# GPS feature verification — 1 November 2026

Production: https://bhaasha-bandhu.vercel.app

Feature commit: [`013beb7`](https://github.com/riddhicodesavvy/bhaashaBandhu/commit/013beb7802fb63111c1407bc7ffdf0725cc6d6f3). Final UI refinement: `8a01b61` on [`codex/incident-gps-autofill`](https://github.com/riddhicodesavvy/bhaashaBandhu/tree/codex/incident-gps-autofill). Both pushed to the existing repository; no merge to main was performed. Prior deployed audit fixes were included because they were previously uncommitted. Two pre-existing helper-script edits remain untouched/uncommitted.

Deployment: [`dpl_Fa2nD3Ln8t9oJmke9x42KGN2o1XJ`](https://vercel.com/ridcyber/bhaasha-bandhu/Fa2nD3Ln8t9oJmke9x42KGN2o1XJ). Initial feature verification ran against `dpl_9hyJ2C9M6ZUXz5dRLzjA6GATVRZa`; the subsequent frontend-only refinement removes repeated coordinate text in expanded Worker cards.

## GPS

| Requirement | Result | Evidence and scope |
|---|---|---|
| Browser Geolocation | PASS invocation; physical success MANUAL REQUIRED | Actual production button invoked capture and showed Getting your location. The connected browser subsequently timed out. No real device coordinates were obtained. |
| Permission handling | PASS automated; real allow/deny prompt MANUAL REQUIRED | Automated native callback tests cover denied/unavailable/timeout and unsupported/insecure contexts. Actual production timeout message observed. |
| Latitude/longitude captured | PASS automated callback; physical GPS MANUAL REQUIRED | Native callback handling tested, including 0,0. Synthetic fixture values were submitted separately to test persistence and are not presented as GPS-derived. |
| Reverse geocoding | PASS automated; live provider response MANUAL REQUIRED | One credential-free request, address construction, service failure and coordinate mismatch tests pass. GPS timeout prevented a real geocoder lookup. No synthetic coordinates were sent to the provider. |
| Manual fallback | PASS production | Typed location survived actual GPS timeout, stayed editable, and a complete manual report was submitted successfully through the UI. |
| Mobile layout | PASS at 390×844 viewport | No horizontal overflow: DOM content/client widths both 375px excluding scrollbar. Loading/error controls, long location text and persisted coordinate/map view inspected. This was responsive browser testing, not a physical Android device. |

The selected free provider is BigDataCloud's browser-only reverse geocoder. It requires fresh, consented coordinates directly from the device. The form discloses coordinate/IP sharing, makes one request per explicit tap, never falls back to IP geolocation, and retains GPS coordinates if the address lookup fails. No new dependency or API key was added. See [implementation and provider requirements](incident-location.md).

Manual text is protected during GPS lookup. If nonempty, it is retained and the detected result is offered through **Use detected address**. The successful-address suggestion interaction requires device verification because no physical position was available here. No continuous location watch, background capture, or GPS polling was introduced. Existing incident-data polling is independent of GPS.

## Persistence

| Requirement | Result |
|---|---|
| Coordinates stored in Supabase | PASS — direct authenticated Supabase database-gateway retrieval returned numeric latitude/longitude |
| Readable location stored | PASS — exact original readable text matched in persisted payload and all role responses |
| Survives refresh | PASS — Worker, Contractor and Hospital browser refreshes retained visible saved coordinates; independent server requests showed the same saved values |
| Survives logout/login | PASS — actual Worker browser logout/login retained visible coordinates; fresh Firebase authentications for all roles retrieved the same saved location |
| Malformed coordinates rejected | PASS — production returned HTTP 400 for string latitude, out-of-range latitude/longitude, null pair and missing longitude |
| Duplicate submission | PASS — retry with the same request ID returned the same incident; one matching ID per role's list |

Persistence fixture (explicitly synthetic):

```text
Incident: ZSZ7F6JZbzP4pOVZCPCqFozqCWQ2_5a0b15e4-3f88-4386-9ab8-a9417ceeb652
Location: GPS TEST: Generator room, Kattankulathur (synthetic location)
Latitude: 12.823
Longitude: 80.044
Site: demo-site-01
```

Contractor review updated the status to `reviewed` while retaining the location. Direct gateway retrieval showed database version 2 with the same numeric pair and readable location. The existing `location` plus optional `latitude`/`longitude` live in the same incident JSONB payload. JSONB numbers map to PostgreSQL `numeric`; no duplicate location table or schema migration was needed. Validation occurs in the authenticated incident submission API; no claim is made of newly added database CHECK constraints.

Manual-fallback UI report: `ZSZ7F6JZbzP4pOVZCPCqFozqCWQ2_10568008-1b28-4abb-9293-2f8763c964f5`. Its saved location was the manually edited long description and no coordinates/map were shown, as expected after an unsuccessful GPS capture.

## Cross-role

| Requirement | Result and scope |
|---|---|
| Worker location | PASS — API, mobile Reports view, refresh and actual logout/login |
| Contractor receives same location | PASS — independently authenticated API response and desktop browser detail/refresh show the same stored coordinates and map link |
| Hospital receives same location | PASS — independently authenticated API response and desktop browser detail show the same stored coordinates and map link |
| Same incident ID across roles | PASS — all reference the fixture ID above |
| Three simultaneous isolated browsers | MANUAL REQUIRED — only one connected browser profile is available; sequential role checks and independent tokens are not represented as isolated devices |

## Existing systems

| Requirement | Result |
|---|---|
| Whisper STT regression | PASS — actual production upload returned `Three steel rods are blocking the emergency exit.` in 2,470 ms; runtime logs confirm `whisper-large-v3-turbo`, upstream HTTP 200 and provider request ID |
| Groq regression | PASS — real transcript submitted to production analysis; returned hazard/high urgency and matching summary in 1,889 ms; logs confirm `openai/gpt-oss-120b` |
| Authentication/RBAC | PASS within executed scope — anonymous incident POST 401, Worker contractor-data access 403, Hospital task creation 403; prior role/token checks also pass in local suite |
| Existing tasks | PASS for production retrieval — Worker and Contractor each retrieved 14 existing tasks; task lifecycle tests pass locally |
| TypeScript check | PASS |
| Existing and new automated tests | PASS — 30 tests, 0 failures |
| Production build | PASS, including API regeneration from current TypeScript |

GPS coordinates are never sent to Groq. The AI is not the source of stored coordinates. No Firebase/RBAC/Supabase authorization behavior was relaxed. Production document Permissions-Policy allows only same-origin geolocation, while retaining microphone=(self), camera=() and payment=().

## Evidence

- `test-results/gps-production.json`: actual production HTTP responses and Supabase gateway payload.
- `test-results/gps-production-runtime.jsonl`: provider model/request evidence.
- `test-results/gps-mobile-fallback.png`: real production timeout and retained editable manual text.
- `test-results/gps-manual-submitted.png`: successful UI submission after timeout.
- `test-results/gps-worker-mobile.png`: persisted synthetic-coordinate display.
- `test-results/gps-contractor-desktop.png`: Contractor detail with the same coordinates and incident ID.
- `test-results/gps-hospital-desktop.png`: Hospital detail with the identical persisted location and map action.
- `test-results/gps-browser-checks.json`: observed browser outcomes and physical-device limitations.
- `test-results/gps-unit-tests.tap`: final complete 30-test suite output.

Test records are labelled demo audits and retained for inspection. They did not trigger real hospital notifications. No physical-GPS or live reverse-geocoding PASS is claimed. To finish that acceptance check, open Worker → Report Incident on an HTTPS phone browser, tap Use Current Location, allow OS/browser location, review the detected address/coordinates, submit, and compare the same incident in separate Contractor/Hospital sessions after refresh/logout.
