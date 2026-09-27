import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'src/calls/CallContext.jsx',
  'src/services/webrtcService.js',
  'src/services/callSignalingService.js',
  'src/services/callNotificationService.js',
  'src/services/callDiagnosticsService.js',
  'src/sw.js',
  'api/turn-credentials.js',
  'api/call-notify.js',
  'api/call-health.js',
  'api/calls-cleanup.js',
  'firestore.rules',
  'storage.rules',
  'vercel.json',
];

const serverEnv = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'TURN_URLS',
  'TURN_SHARED_SECRET',
  'CRON_SECRET',
];

const clientEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY',
];

let hardFailures = 0;

function mark(kind, text) {
  console.log(`${kind.padEnd(5)} ${text}`);
}

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(root, file))) {
    mark('PASS', file);
  } else {
    hardFailures += 1;
    mark('FAIL', `${file} is missing`);
  }
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 22) mark('PASS', `Node ${process.versions.node}`);
else {
  hardFailures += 1;
  mark('FAIL', `Node ${process.versions.node}; Firebase Admin 14.x requires Node 22+`);
}

for (const key of serverEnv) {
  mark(process.env[key] ? 'PASS' : 'WARN', `${key} ${process.env[key] ? 'is set' : 'not present in this shell'}`);
}

for (const key of clientEnv) {
  mark(process.env[key] ? 'PASS' : 'WARN', `${key} ${process.env[key] ? 'is set' : 'not present in this shell'}`);
}

const googleServices = path.join(root, 'android/app/google-services.json');
mark(
  fs.existsSync(googleServices) ? 'PASS' : 'WARN',
  fs.existsSync(googleServices)
    ? 'android/app/google-services.json exists'
    : 'android/app/google-services.json is absent; native Android push will not initialize',
);

console.log('');
if (hardFailures) {
  console.error(`Call preflight failed with ${hardFailures} hard issue(s).`);
  process.exit(1);
}

console.log('Call preflight completed. WARN items require deployment/environment review.');
