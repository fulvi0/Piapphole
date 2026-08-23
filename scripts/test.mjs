#!/usr/bin/env node
/**
 * Compiles the API layer and its tests to plain JS, then runs them with the
 * built-in Node test runner. Keeps the test setup dependency-free.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build');

rmSync(outDir, { recursive: true, force: true });

const build = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--ignoreConfig',
    'tests/client.test.ts',
    '--outDir',
    '.test-build',
    '--module',
    'nodenext',
    '--moduleResolution',
    'nodenext',
    '--target',
    'es2022',
    '--strict',
    '--skipLibCheck',
    '--types',
    'node',
  ],
  { cwd: root, stdio: 'inherit' },
);

if (build.status !== 0) process.exit(build.status ?? 1);

const run = spawnSync(process.execPath, ['--test', '.test-build/tests/client.test.js'], {
  cwd: root,
  stdio: 'inherit',
});
rmSync(outDir, { recursive: true, force: true });
process.exit(run.status ?? 1);
