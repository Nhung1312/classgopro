import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesVietnameseSearch, normalizeVietnameseSearch } from '../src/utils/vietnameseSearch';
import { undoCompletedSpin } from '../src/utils/undoCompletedSpin';
import type { ClassRoom, HistoryRecord } from '../src/types';

assert.equal(normalizeVietnameseSearch('  ĐỖ  QUÂN  '), 'do quan');
for (const input of ['quan', 'QuAn', 'QUÂN', '  quan  ', 'Lê Văn Quan']) {
  assert.equal(matchesVietnameseSearch(input, 'Lê Văn Quân'), true, input);
}
assert.equal(matchesVietnameseSearch('do', 'Đỗ Thị Hà'), true);
assert.equal(matchesVietnameseSearch('phuong', 'Nguyễn Phương'), true);
assert.equal(matchesVietnameseSearch('123', 'Quân', 'HS12345'), true);
assert.equal(matchesVietnameseSearch('', 'Quân'), true);
assert.equal(matchesVietnameseSearch('   ', null), true);
assert.equal(matchesVietnameseSearch('quyen', 'Trần Quân'), false);
assert.equal(matchesVietnameseSearch('zzz', 'Trần Quân', undefined), false);

for (const path of [
  'src/components/ClassManager.tsx',
  'src/components/GradebookScreen.tsx',
  'src/components/QuickAttendanceModal.tsx',
  'src/components/HistoryScreen.tsx',
]) {
  const source = readFileSync(path, 'utf8');
  assert.match(source, /matchesVietnameseSearch\(/, path);
  assert.doesNotMatch(source, /\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)/, path);
}

const time = '2026-10-16T01:00:00.000Z';
const students = [
  { id: 'a', name: 'Lê Văn Quân', callCount: 2, scores: { tx1: 8 } },
  { id: 'b', name: 'Đỗ Hà', callCount: 1 },
  { id: 'c', name: 'Không được chọn', callCount: 5 },
];
const classes: ClassRoom[] = [{ id: '7A', name: '7A', createdAt: time, students }];
const makeRecord = (id: string, studentId: string, timestamp: string): HistoryRecord => ({
  id, studentId, studentName: studentId, classId: '7A', className: '7A',
  timestamp, formattedDate: '16/10/2026', formattedTime: '08:00',
  callCountAfter: studentId === 'a' ? 2 : 1, mode: 'FAIR',
});
const history = [
  { ...makeRecord('call-a', 'a', time), assignedTxSlot: 'tx1' as const },
  makeRecord('call-b', 'b', time),
  makeRecord('previous-c', 'c', '2026-10-15T01:00:00.000Z'),
];
const batch = undoCompletedSpin(classes, history, 'call-a', ['a','b']);
assert.ok(batch);
assert.deepEqual(batch.classes[0].students.map((s) => s.callCount), [1,0,5]);
assert.equal(batch.classes[0].students[0].scores?.tx1, null);
assert.deepEqual(batch.history.map((h) => h.id), ['previous-c']);
assert.deepEqual(classes[0].students.map((s) => s.callCount), [2,1,5], 'No input mutation');
const single = undoCompletedSpin(classes, history, 'call-a');
assert.ok(single);
assert.deepEqual(single.classes[0].students.map((s) => s.callCount), [1,1,5]);
assert.equal(single.history.length, 2);
assert.equal(undoCompletedSpin(classes, history, 'call-a', ['a','c']), null, 'Do not mix separate rounds');
assert.equal(undoCompletedSpin(classes, history, 'missing'), null);
console.log('PASS: Vietnamese incremental search and single/multi-pick undo regression.');
