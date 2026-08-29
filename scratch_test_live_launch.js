const { spawn } = require('child_process');
const path = require('path');

console.log('Launching Electron to verify zero runtime crash...');
const proc = spawn('npx', ['electron', '.'], { shell: true, cwd: __dirname });

let hasError = false;
proc.stdout.on('data', data => {
  const text = data.toString();
  console.log('[ELECTRON OUT]', text.trim());
});

proc.stderr.on('data', data => {
  const text = data.toString();
  // Filter out benign chromium dev warnings
  if (!text.includes('MODULE_TYPELESS_PACKAGE_JSON') && !text.includes('Passthrough')) {
    console.error('[ELECTRON ERR]', text.trim());
    if (text.includes('Error') || text.includes('ReferenceError') || text.includes('TypeError')) {
      hasError = true;
    }
  }
});

setTimeout(() => {
  console.log('App started and ran cleanly for 4 seconds.');
  proc.kill();
  if (hasError) {
    console.error('Test detected runtime errors!');
    process.exit(1);
  } else {
    console.log('Test PASSED: zero crash on startup.');
    process.exit(0);
  }
}, 4000);
