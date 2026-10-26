import { spawnSync } from 'node:child_process';
const suites = ['check-spin-consistency', 'check-vietnamese-search', 'check-discipline-sync',
  'check-mystery-door', 'check-mystery-score', 'check-review-import', 'check-review-exchange',
  'check-review-choices', 'testPpctAndTimetable', 'testArucoDetection', 'check-aruco-images', 'check-integration-safety', 'check-local-server', 'check-response-broadcast', 'check-response-bank-import', 'check-vercel-ai-endpoint', 'check-ai-api', 'check-ai-client'];
for (const name of suites) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${name}.ts`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
const nodeRuntime = spawnSync(process.execPath, ['scripts/check-ai-node-runtime.mjs'], { stdio: 'inherit' });
if (nodeRuntime.status !== 0) process.exit(nodeRuntime.status || 1);
console.log(`PASS: ${suites.length + 1} integration/regression suites.`);
