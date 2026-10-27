const functions = require('firebase-functions/v1');
const { createApp } = require('./lib/app.cjs');
// Explicit first generation; no Cloud Run service or second-generation deployment.
exports.bhashabandhuApi = functions.region('us-central1').runWith({
  timeoutSeconds: 120, memory: '512MB', maxInstances: 3,
  secrets: ['GROQ_API_KEY']
}).https.onRequest(createApp());
