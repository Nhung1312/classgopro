import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Student } from '../src/types';
import { chooseMultipleStudents } from '../src/utils/fairAlgorithm';
import { buildPyramidLayout, calculatePyramidTiers } from '../src/utils/pyramidLayout';
import { resolveCompletedSpinStudents } from '../src/utils/spinCount';

const students = Array.from({ length: 36 }, (_, i): Student => ({
  id: 'student-' + String(i + 1), name: 'Học sinh ' + (i + 1), callCount: i % 3
}));
const original = JSON.stringify(students);
for (let n = 0; n <= 36; n++) {
  const subset = students.slice(0, n);
  const tiers = calculatePyramidTiers(n);
  assert.equal(tiers.reduce((sum, count) => sum + count, 0), n);
  const noWinner = buildPyramidLayout(subset, new Set<string>());
  assert.equal(noWinner.blocks.length, n);
  assert.equal(noWinner.blocks.filter(block => block.isWinner).length, 0,
    'Do not mark the apex as winner before the round begins.');
  const lastId = subset.at(-1)?.id;
  if (lastId) {
    const first = buildPyramidLayout(subset, new Set([subset[0].id]));
    const last = buildPyramidLayout(subset, new Set([lastId]));
    assert.deepEqual(first.blocks.map(b => [b.student.id, b.tierIndex, b.colIndex]),
      last.blocks.map(b => [b.student.id, b.tierIndex, b.colIndex]),
      'Apex and all student positions must not depend on the winner.');
    assert.equal(last.blocks.filter(block => block.isWinner).length, 1);
    assert.equal(last.blocks.find(block => block.isWinner)?.student.id, lastId);
    assert.equal(last.blocks[0].isWinner, subset.length === 1,
      'First block is not always the winning block.');
  }
}
assert.equal(JSON.stringify(students), original, 'Layout must not modify original class data.');

const candidate = students[7]; // existing count 1
const snapshot = { ...candidate };
const beforeSave = resolveCompletedSpinStudents([snapshot], students);
assert.equal(beforeSave[0].callCount, 2, 'All styles show the completed round even before App refreshes.');
assert.equal(candidate.callCount, 1, 'Original counter untouched.');
const savedClass = students.map(s => s.id === candidate.id ? { ...s, callCount: 2 } : s);
assert.equal(resolveCompletedSpinStudents([snapshot], savedClass)[0].callCount, 2,
  'Persisted class counter is not incremented twice.');
const lateCloud = savedClass.map(s => s.id === candidate.id ? { ...s, callCount: 4 } : s);
assert.equal(resolveCompletedSpinStudents([snapshot], lateCloud)[0].callCount, 4,
  'Use latest shared persisted counter if it is newer.');

for (const mode of ['FAIR', 'PURE'] as const) {
  const picked = chooseMultipleStudents(students, 3, mode)!;
  assert.equal(picked.selectedStudents.length, 3);
  assert.equal(new Set(picked.selectedStudents.map(s => s.id)).size, 3);
  const presentation = resolveCompletedSpinStudents(picked.selectedStudents, students);
  for (let i = 0; i < 3; i++) {
    assert.equal(presentation[i].callCount, (picked.selectedStudents[i].callCount ?? 0) + 1);
  }
}

// Guard source wiring without executing a browser.
const spinSource = readFileSync('src/components/SpinScreen.tsx', 'utf8');
const pyramidSource = readFileSync('src/components/visuals/PyramidVisual.tsx', 'utf8');
assert.match(spinSource, /spinInProgressRef\.current \|\| eligibleStudents\.length/);
assert.match(spinSource, /disabled=\{isSpinning\}/);
assert.match(spinSource, /resolveCompletedSpinStudents\(selectedResult\.selectedStudents, students\)/);
assert.match(spinSource, /setTargetWinners\(\[\]\);\s+setDisplayName\('\?\?\?'\)/);
assert.match(pyramidSource, /buildPyramidLayout\(students \|\| \[\], winnerIds\)/);
assert.doesNotMatch(pyramidSource, /allBlocks\[0\]\.isWinner\s*=\s*true/);
assert.doesNotMatch(pyramidSource, /allOrdered\.push\(\.\.\.winnerStudentPool\)/);
assert.match(pyramidSource, /animProgress >= 0\.92/);
console.log('PASS: pyramid independent of winner; no phantom apex; shared counters on FAIR/PURE and multi-pick; safeguards when changing styles.');
