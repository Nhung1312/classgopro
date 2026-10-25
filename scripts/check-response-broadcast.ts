import assert from 'node:assert/strict';
const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (k: string) => memory.get(k) || null,
  setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) }, configurable: true });
let posts = 0;
let receive: ((event: any) => void) | undefined;
class TestChannel {
  postMessage(data: unknown) { posts++; receive?.({ data }); }
  addEventListener(_type: string, handler: (event: any) => void) { receive = handler; }
  removeEventListener() { receive = undefined; }
}
Object.defineProperty(globalThis, 'window', { value: { BroadcastChannel: TestChannel }, configurable: true });
Object.defineProperty(globalThis, 'BroadcastChannel', { value: TestChannel, configurable: true });
const service = await import('../src/services/responseCardStorage');
service.setResponseCardOwner('owner-one');
let received = 0;
const unsubscribe = service.subscribeToSessionSync(session => { received++; service.saveActiveQuizSession(session); });
const session = { id: 'qa-broadcast', classId: 'qa', className: '7A9', title: 'QA', questions: [], results: [],
  status: 'running' as const, currentQuestionIndex: 0, createdAt: '2026-10-25', updatedAt: '2026-10-25' };
service.saveActiveQuizSession(session);
assert.equal(posts, 1, 'snapshot received back is not rebroadcast forever');
assert.equal(received, 1);
receive?.({ data: { type: 'SESSION_UPDATED', ownerScope: 'owner-two', session } });
assert.equal(received, 1, 'ignore a different signed-in account');
unsubscribe();
console.log('PASS: same-browser session events, no broadcast echo loop, account-scoped reception.');
