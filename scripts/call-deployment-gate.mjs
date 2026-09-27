const gates = [
  ['UNIT_TESTS', 'Call unit tests'],
  ['RULE_TESTS', 'Firestore Emulator rule tests'],
  ['BUILD', 'Production Vite build'],
  ['LIVE_PROBE', 'Authenticated preview infrastructure probe'],
  ['E2E_CALL', 'Two-browser video-call smoke test'],
  ['FORCED_TURN', 'Forced TURN relay test'],
  ['ANDROID_BG', 'Android background notification test'],
];

const failures = [];
const pending = [];

for (const [key, label] of gates) {
  const value = String(process.env[`OHS_GATE_${key}`] || '').toLowerCase();

  if (value === 'pass') {
    console.log(`PASS  ${label}`);
  } else if (value === 'fail') {
    failures.push(label);
    console.log(`FAIL  ${label}`);
  } else {
    pending.push(label);
    console.log(`WAIT  ${label}`);
  }
}

console.log('');

if (failures.length) {
  console.error(`Deployment gate blocked by ${failures.length} failing item(s).`);
  process.exit(1);
}

if (pending.length) {
  console.error(`Deployment gate is not complete; ${pending.length} item(s) still need evidence.`);
  process.exit(2);
}

console.log('Deployment gate passed. Calling subsystem has evidence for every required gate.');
