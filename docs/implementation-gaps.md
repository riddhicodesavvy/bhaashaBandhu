# Current operational status

The missing live database connection is resolved. The migration is applied to Supabase project `sdgdmplwvtplvtcndusy`; the three verified Firebase UIDs are mapped to real persisted profiles. Six application tables and the secured `bb-data` gateway are deployed. No Supabase Auth, SQL Connect, Cloud SQL or Vercel integration is used.

The local Express API forwards the user's Firebase token to the gateway. The gateway verifies RS256 signature, Firebase issuer/audience, profile role/site and record ownership; its privileged Supabase credential stays inside the managed Edge runtime. A local database password or service-role key is not required. Anonymous table access and direct role-escalation attempts were tested and denied.

## Environment-specific limits

- Actual microphone capture and native speech-synthesis voices depend on the browser/device. The authenticated real speech-to-text upload route passed using a locally synthesized WAV. Unsupported/denied microphone and missing compatible TTS voices have explicit text fallbacks; no audio is retained.
- Firebase Hosting configuration and the first-generation API bundle are ready, but public Hosting deployment was not performed: an authorized Firebase CLI deployment identity, eligible Functions setup and Groq runtime secret are separate deployment prerequisites. The functioning delivery in this session is localhost plus the GitHub source.
- The build emits a nonfatal JavaScript chunk-size advisory. TypeScript/build and all automated checks passed.
- Supabase security advisor reports informational RLS-with-no-browser-policy notices. This is intentional: anonymous/authenticated SQL grants are revoked; the independently authorized gateway is the data access path. No browser role has table access.

Current test evidence is in `docs/ui-implementation-report.md`.
