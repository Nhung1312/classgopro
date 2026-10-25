import { spawnSync } from 'node:child_process';
const suites = ['check-spin-consistency', 'check-vietnamese-search', 'check-discipline-sync',
  'check-mystery-door', 'check-mystery-score', 'check-review-import', 'check-review-exchange',
  'check-review-choices', 'testPpctAndTimetable', 'testArucoDetection', 'check-aruco-images', 'check-integration-safety', 'check-local-server', 'check-response-broadcast', 'check-response-bank-import'];
for (const name of suites) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${name}.ts`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS: ${suites.length} integration/regression suites.`);
