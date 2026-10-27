import { build } from 'esbuild';
await build({ entryPoints: ['server/app.ts'], outfile: 'functions/lib/app.cjs', bundle: true, platform: 'node', target: 'node22', format: 'cjs', packages: 'external', sourcemap: false });
console.info('Built Firebase first-generation API bundle. No environment secrets embedded.');
