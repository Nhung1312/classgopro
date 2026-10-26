import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const output = await mkdtemp(join(tmpdir(), 'classgo-ai-runtime-'));
try {
  const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', 'api/generate-questions.ts',
    '--outDir', output, '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
    '--resolveJsonModule', '--skipLibCheck', '--noEmit', 'false'], { encoding: 'utf8' });
  assert.equal(compile.status, 0, compile.stdout + compile.stderr);
  await writeFile(join(output, 'package.json'), '{"type":"module"}');
  await symlink(resolve('node_modules'), join(output, 'node_modules'), 'dir');
  const { default: handler } = await import(pathToFileURL(join(output, 'api/generate-questions.js')).href);
  const headers = {}; let body;
  const response = { setHeader: (key, value) => { headers[key] = value; }, end: text => { body = JSON.parse(text); } };
  const saved = process.env.CLASSGO_AI_ENABLED;
  try { process.env.CLASSGO_AI_ENABLED = 'true'; await handler({ method: 'POST', headers: {} }, response); }
  finally { if (saved === undefined) delete process.env.CLASSGO_AI_ENABLED; else process.env.CLASSGO_AI_ENABLED = saved; }
  assert.equal(response.statusCode, 401);
  assert.equal(body.code, 'AI_AUTH_REQUIRED');
  assert.equal(headers['X-ClassGo-AI-Version'], 'authenticated-v1');
  console.log('PASS: compiled Node ESM Vercel entry loads without tsx/Vite; POST reaches the authenticated JSON handler.');
} finally { await rm(output, { recursive: true, force: true }); }
