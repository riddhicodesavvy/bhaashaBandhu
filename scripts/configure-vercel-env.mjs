import 'dotenv/config';
import { spawnSync } from 'node:child_process';
// Only application configuration goes to Vercel. Never upload demo passwords,
// database passwords, local OAuth tokens, or Admin private credentials.
// Default allowlist contains public configuration/model IDs only. Exporting the
// private Groq key is a separate, explicitly user-approved action.
const names = ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID','VITE_DEMO_MODE','SUPABASE_URL','SUPABASE_GATEWAY_URL','SUPABASE_PUBLISHABLE_KEY','GROQ_TEXT_MODEL','GROQ_STT_MODEL','DEMO_MODE'];
if (process.argv.includes('--include-groq')) names.push('GROQ_API_KEY');
for (const name of names) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing local application configuration: ${name}`);
  const args = ['env','add',name,'--environment','production,preview','--scope','ridcyber','--yes','--force',name === 'GROQ_API_KEY' ? '--sensitive' : '--no-sensitive'];
  const result = spawnSync('vercel', args, { input: value, encoding: 'utf8', shell: process.platform === 'win32', windowsHide: true });
  if (result.status !== 0) {
    // Do not print command output that could accidentally echo an environment value.
    throw new Error(`Vercel environment configuration failed for ${name} (exit ${result.status}).`);
  }
  console.info(`Configured ${name} for preview and production.`);
}
