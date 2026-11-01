import { build } from 'esbuild';
await build({ entryPoints: ['server/api-handler.ts'], outfile: 'api/index.js', bundle: true, platform: 'node', target: 'node22', format: 'esm', packages: 'external' });
console.info('Built Vercel API from current server sources.');
