import type { DisciplineRecord } from '../types';

/** Independently reconcile journal events, never based on class/gradebook timestamps. */
export interface DisciplineSyncState {
  records: DisciplineRecord[];
  deletedIds: string[];
}

export function mergeDisciplineSyncStates(
  local: DisciplineSyncState, cloud: DisciplineSyncState,
): DisciplineSyncState {
  const deletedIds = [...new Set([...local.deletedIds, ...cloud.deletedIds].filter(Boolean))];
  const deleted = new Set(deletedIds);
  const byId = new Map<string, DisciplineRecord>();
  for (const record of [...cloud.records, ...local.records]) {
    if (record?.id && !deleted.has(record.id)) byId.set(record.id, record);
  }
  const records = [...byId.values()].sort((a,b) =>
    (b.createdAt || `${b.date}T${b.time}`).localeCompare(a.createdAt || `${a.date}T${a.time}`));
  return { records, deletedIds };
}
