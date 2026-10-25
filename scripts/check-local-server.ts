import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  env: { ...process.env, PORT: '4379', GEMINI_API_KEY: '', NODE_ENV: 'production' }, stdio: 'pipe'
});
let output = '';
server.stdout.on('data', chunk => output += chunk);
server.stderr.on('data', chunk => output += chunk);
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { const res = await fetch('http://127.0.0.1:4379/api/health'); if (res.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.equal(ready, true, output);
  const health = await (await fetch('http://127.0.0.1:4379/api/health')).json();
  assert.equal(health.remoteResponseSync, false);
  for (const path of ['/api/response-cards/session/123456', '/api/response-cards/session/123456/stream'])
    assert.equal((await fetch('http://127.0.0.1:4379' + path)).status, 503);
  assert.equal((await fetch('http://127.0.0.1:4379/api/response-cards/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
  assert.equal((await fetch('http://127.0.0.1:4379/api/generate-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
  console.log('PASS: local server boots without keys; unsafe PIN relay disabled; no Gemini request without configuration.');
} finally { server.kill('SIGTERM'); }
