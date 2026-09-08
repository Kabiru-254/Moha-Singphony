import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const args = [
  'node_modules/firebase-tools/lib/bin/firebase.js',
  'emulators:start',
  '--only',
  'database',
  '--project',
  'demo-musify',
  '--export-on-exit=.emulator-data'
];

if (
  existsSync('.emulator-data/firebase-export-metadata.json')
) {
  args.push('--import=.emulator-data');
}

const child = spawn(
  process.execPath,
  args,
  {
    stdio: 'inherit'
  }
);

child.on('error', error => {
  console.error('Could not start Firebase emulator:', error.message);
  process.exitCode = 1;
});

child.on('exit', code => {
  process.exitCode = code ?? 0;
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
