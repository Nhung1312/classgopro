import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeDisciplineSyncStates } from '../src/utils/disciplineSync';
import type { DisciplineRecord } from '../src/types';
const rec = (id: string): DisciplineRecord => ({
 id, studentId:'s1', classId:'7A1', violationTypeId:'noi_chuyen',
 date:'2026-10-16', time:'08:00', source:'manual', createdAt:'2026-10-16T08:00:00.000Z',
});
const local = { records:[rec('a')], deletedIds:[] };
const cloud = { records:[rec('b')], deletedIds:[] };
const merged = mergeDisciplineSyncStates(local,cloud);
assert.deepEqual(merged.records.map(r=>r.id),['a','b']);
assert.deepEqual(local.records.map(r=>r.id),['a']);
assert.deepEqual(cloud.records.map(r=>r.id),['b']);
assert.equal(mergeDisciplineSyncStates({records:[rec('a')],deletedIds:[]},local).records.length,1);
assert.deepEqual(mergeDisciplineSyncStates({records:[],deletedIds:['b']},cloud).records,[]);
assert.deepEqual(mergeDisciplineSyncStates(local,{records:[],deletedIds:['a']}).records,[]);
assert.deepEqual(mergeDisciplineSyncStates(merged,merged),merged);
assert.deepEqual(mergeDisciplineSyncStates({records:[],deletedIds:[]},cloud).records,[rec('b')]);
const app=readFileSync('src/App.tsx','utf8');
assert.match(app,/reconcileDisciplineRecordsWithFirestore\(/);
assert.doesNotMatch(app,/setDisciplineRecords\(cloudData\.disciplineRecords\)/);
assert.doesNotMatch(app,/disciplineRecords:\s*loadDisciplineRecords\(\)/);
assert.doesNotMatch(app,/syncToCloudIfLoggedIn\(\{ disciplineRecords:/);
assert.match(readFileSync('src/utils/firestoreService.ts','utf8'),/runTransaction\(db/);
assert.match(readFileSync('src/services/disciplineService.ts','utf8'),/saveDeletedDisciplineIds\(/);
console.log('PASS: journal merge, no duplicate events, cloud/offline deletion and isolated sync.');
