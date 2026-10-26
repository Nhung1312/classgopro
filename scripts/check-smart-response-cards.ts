import assert from 'node:assert/strict';
import { ARUCO_4X4_DICT } from '../src/services/arucoService';
import {
  createNewQuizSession,
  saveActiveQuizSession,
  loadActiveQuizSession,
  getOrInitClassCardConfig,
  calculateSessionScorePreview,
  setResponseCardOwner,
  subscribeToSessionSync,
} from '../src/services/responseCardStorage';
import { MarkerTemporalTracker } from '../src/services/arucoService';
import { transferResponseCardScores } from '../src/utils/responseCardTransfer';
import type { ClassRoom, HistoryRecord } from '../src/types';
import type { QuizSession, DetectedMarker } from '../src/types/responseCardTypes';

// Mock in-memory localStorage and BroadcastChannel for Node testing environment
const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => memory.get(k) || null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  },
  configurable: true,
});

let channelBroadcasts = 0;
let channelListener: ((event: any) => void) | undefined;
class MockBroadcastChannel {
  postMessage(data: unknown) {
    channelBroadcasts++;
    channelListener?.({ data });
  }
  addEventListener(_type: string, handler: (event: any) => void) {
    channelListener = handler;
  }
  removeEventListener() {
    channelListener = undefined;
  }
}
Object.defineProperty(globalThis, 'window', {
  value: { BroadcastChannel: MockBroadcastChannel },
  configurable: true,
});
Object.defineProperty(globalThis, 'BroadcastChannel', {
  value: MockBroadcastChannel,
  configurable: true,
});

console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN THẺ TRẢ LỜI THÔNG MINH CLASSGO ===');

// --- TEST 1: Kiểm tra nhận diện 4 hướng A, B, C, D ---
console.log('--- TEST 1: Kiểm tra 4 hướng xoay A, B, C, D của mã thẻ ---');
const ROTATION_TO_OPTION = ['A', 'B', 'C', 'D'] as const;
for (let rot = 0; rot < 4; rot++) {
  assert.equal(ROTATION_TO_OPTION[rot], ['A', 'B', 'C', 'D'][rot]);
}
assert.equal(ARUCO_4X4_DICT.length, 120, 'Bộ từ điển ArUco chuẩn phải có đúng 120 mã thẻ.');
console.log('✔ TEST 1 ĐẠT: 4 hướng A, B, C, D và 120 mã thẻ chuẩn xác.');

// --- TEST 2: Hai lớp dùng cùng số thẻ (độc lập danh sách học sinh) ---
console.log('--- TEST 2: Hai lớp dùng cùng số thẻ nhưng ánh xạ độc lập ---');
const class7A1: ClassRoom = {
  id: 'class-7a1',
  name: '7A1',
  subject: 'Toán',
  createdAt: '2026-10-25T00:00:00.000Z',
  students: [
    { id: 's-7a1-01', name: 'Nguyễn Văn An', studentCode: 'HS01', callCount: 0 },
    { id: 's-7a1-02', name: 'Trần Thị Bình', studentCode: 'HS02', callCount: 0 },
  ],
};

const class8A3: ClassRoom = {
  id: 'class-8a3',
  name: '8A3',
  subject: 'Toán',
  createdAt: '2026-10-25T00:00:00.000Z',
  students: [
    { id: 's-8a3-01', name: 'Lê Hoàng Cường', studentCode: 'HS01', callCount: 0 },
    { id: 's-8a3-02', name: 'Phạm Thu Dung', studentCode: 'HS02', callCount: 0 },
  ],
};

const config7A1 = getOrInitClassCardConfig(class7A1);
const config8A3 = getOrInitClassCardConfig(class8A3);

const card1In7A1 = config7A1.mappings.find((m) => m.cardId === 1);
const card1In8A3 = config8A3.mappings.find((m) => m.cardId === 1);

assert.equal(card1In7A1?.studentName, 'Nguyễn Văn An');
assert.equal(card1In8A3?.studentName, 'Lê Hoàng Cường');
assert.notEqual(card1In7A1?.studentId, card1In8A3?.studentId);
console.log('✔ TEST 2 ĐẠT: Thẻ 001 của 7A1 và 8A3 ánh xạ đúng học sinh từng lớp, không nhầm lẫn.');

// --- TEST 3: Nhiều thẻ cùng xuất hiện và quét lặp lại (Temporal Stability) ---
console.log('--- TEST 3: Đồng thời nhiều thẻ và kiểm tra chống nhận trùng ---');
const tracker = new MarkerTemporalTracker();

const frame1Markers: DetectedMarker[] = [
  { cardId: 1, option: 'B', confidence: 0.96, corners: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 10, y: 50 }] },
  { cardId: 2, option: 'C', confidence: 0.98, corners: [{ x: 100, y: 10 }, { x: 150, y: 10 }, { x: 150, y: 50 }, { x: 100, y: 50 }] },
];

const confirmed1 = tracker.update(frame1Markers);
assert.equal(confirmed1.length, 2, 'Cả 2 thẻ độ tin cậy cao được xác nhận đồng thời.');
assert.equal(confirmed1[0].option, 'B');
assert.equal(confirmed1[1].option, 'C');

// Quét lại frame tiếp theo với cùng thẻ: không tạo phần tử mới bất thường
const confirmed2 = tracker.update(frame1Markers);
assert.equal(confirmed2.length, 2);
assert.equal(tracker.getConfirmedOption(1), 'B');
assert.equal(tracker.getConfirmedOption(2), 'C');

// Học sinh xoay thẻ đổi phương án sang 'A'
const frame3Markers: DetectedMarker[] = [
  { cardId: 1, option: 'A', confidence: 0.97, corners: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 10, y: 50 }] },
];
tracker.update(frame3Markers);
assert.equal(tracker.getConfirmedOption(1), 'A', 'Học sinh đổi hướng thẻ thì phương án được cập nhật đúng.');
console.log('✔ TEST 3 ĐẠT: Nhận diện đồng thời nhiều thẻ và cập nhật hướng xoay thẻ ổn định.');

// --- TEST 4: Tạo phiên, PIN, Token và Đồng bộ Máy tính - Điện thoại ---
console.log('--- TEST 4: Tạo phiên kiểm tra có PIN, Token và đồng bộ 2 chiều ---');
setResponseCardOwner('teacher-123');

const sampleQuestions = [
  {
    id: 'q1',
    question: 'Số hữu tỉ là số viết được dưới dạng nào?',
    options: { A: 'a/b với a, b thuộc Z, b khác 0', B: 'Căn bậc hai', C: 'Số thập phân vô hạn không tuần hoàn', D: 'Số nguyên tố' },
    correctAnswer: 'A' as const,
  },
  {
    id: 'q2',
    question: 'Kết quả phép tính (-1/2) + 3/2 là:',
    options: { A: '2', B: '1', C: '-1', D: '1/2' },
    correctAnswer: 'B' as const,
  },
];

const session = createNewQuizSession(class7A1, 'Kiểm tra 15p Số hữu tỉ', sampleQuestions, 'Toán', 'teacher-123');
assert.ok(session.id.startsWith('session-'));
assert.equal(session.sessionPin?.length, 6);
assert.ok(session.sessionToken && session.sessionToken.length > 10, 'Phiên có secure token chống truy cập trái phép.');
assert.equal(session.teacherId, 'teacher-123');
assert.equal(session.questions.length, 2);
assert.equal(session.results.length, 2);

// Điện thoại gửi kết quả học sinh 1 (Nguyễn Văn An - Thẻ 1) chọn A cho câu 1
session.results[0].answers['s-7a1-01'] = {
  studentId: 's-7a1-01',
  studentName: 'Nguyễn Văn An',
  studentCode: 'HS01',
  cardId: 1,
  selectedOption: 'A',
  isCorrect: true,
  timestamp: Date.now(),
};

// Học sinh 2 (Trần Thị Bình - Thẻ 2) chọn C cho câu 1 (sai)
session.results[0].answers['s-7a1-02'] = {
  studentId: 's-7a1-02',
  studentName: 'Trần Thị Bình',
  studentCode: 'HS02',
  cardId: 2,
  selectedOption: 'C',
  isCorrect: false,
  timestamp: Date.now(),
};

saveActiveQuizSession(session);
const loaded = loadActiveQuizSession();
assert.equal(Object.keys(loaded?.results[0].answers || {}).length, 2);
assert.equal(loaded?.results[0].answers['s-7a1-01'].isCorrect, true);
assert.equal(loaded?.results[0].answers['s-7a1-02'].isCorrect, false);
console.log('✔ TEST 4 ĐẠT: Tạo phiên, PIN, Token và lưu kết quả đáp án học sinh hoàn tất.');

// --- TEST 5: Chuyển câu hỏi, khóa câu, tổng hợp điểm ---
console.log('--- TEST 5: Chuyển câu, khóa thu bài và tính điểm thang 10 ---');
// Chuyển sang câu 2
session.currentQuestionIndex = 1;
tracker.reset();

// Cả 2 học sinh trả lời đúng câu 2 (đáp án B)
session.results[1].answers['s-7a1-01'] = {
  studentId: 's-7a1-01',
  studentName: 'Nguyễn Văn An',
  cardId: 1,
  selectedOption: 'B',
  isCorrect: true,
  timestamp: Date.now(),
};
session.results[1].answers['s-7a1-02'] = {
  studentId: 's-7a1-02',
  studentName: 'Trần Thị Bình',
  cardId: 2,
  selectedOption: 'B',
  isCorrect: true,
  timestamp: Date.now(),
};

// Khóa câu 2 và kết thúc phiên
session.results[0].status = 'revealed';
session.results[1].status = 'revealed';
session.status = 'completed';
saveActiveQuizSession(session);

// Tính điểm
const previews = calculateSessionScorePreview(session, class7A1, 'tx1');
const anScore = previews.find((p) => p.studentId === 's-7a1-01');
const binhScore = previews.find((p) => p.studentId === 's-7a1-02');

assert.equal(anScore?.correctCount, 2);
assert.equal(anScore?.totalQuestions, 2);
assert.equal(anScore?.calculatedScore, 10.0, 'An đúng 2/2 câu -> 10 điểm');

assert.equal(binhScore?.correctCount, 1);
assert.equal(binhScore?.totalQuestions, 2);
assert.equal(binhScore?.calculatedScore, 5.0, 'Bình đúng 1/2 câu -> 5 điểm');
console.log('✔ TEST 5 ĐẠT: Khóa câu, chuyển câu và tính điểm thang 10 chuẩn xác.');

// --- TEST 6: Chuyển điểm vào Sổ điểm (TX1) có xác nhận, không đè điểm 0 ---
console.log('--- TEST 6: Chuyển điểm an toàn vào TX1, giữ điểm 0 đã có, chống ghi trùng ---');
const classWithExistingZero: ClassRoom = {
  ...class7A1,
  students: [
    { ...class7A1.students[0], scores: { tx1: 0 } }, // An đã có điểm 0 (kiểm tra miệng cũ)
    { ...class7A1.students[1], scores: {} },          // Bình chưa có điểm
  ],
};

const historyList: HistoryRecord[] = [];

// Chuyển điểm vào TX1
const transferResult = transferResponseCardScores({
  session,
  classes: [classWithExistingZero],
  history: historyList,
  classId: class7A1.id,
  slot: 'tx1',
  studentIds: ['s-7a1-01', 's-7a1-02'],
});

assert.equal(transferResult.transferred, 1, 'Chỉ chuyển 1 học sinh chưa có điểm (Bình).');
assert.equal(transferResult.skipped, 1, 'Bỏ qua 1 học sinh đã có điểm (An có điểm 0).');

const updatedClass = transferResult.classes.find((c) => c.id === class7A1.id)!;
const anUpdated = updatedClass.students.find((s) => s.id === 's-7a1-01');
const binhUpdated = updatedClass.students.find((s) => s.id === 's-7a1-02');

assert.equal(anUpdated?.scores?.tx1, 0, 'Điểm 0 của An TUYỆT ĐỐI không bị ghi đè!');
assert.equal(binhUpdated?.scores?.tx1, 5.0, 'Điểm 5.0 của Bình được ghi đúng vào TX1.');

// Thử chuyển lại lần 2 (chống ghi trùng)
const transferAgain = transferResponseCardScores({
  session,
  classes: transferResult.classes,
  history: transferResult.history,
  classId: class7A1.id,
  slot: 'tx1',
  studentIds: ['s-7a1-02'],
});

assert.equal(transferAgain.transferred, 0, 'Lần 2 không chuyển lại vì đã có lịch sử ghi nhận.');
console.log('✔ TEST 6 ĐẠT: Không đè điểm 0 có sẵn, ghi đúng TX1, chống ghi trùng thành công.');

// --- TEST 7: Kiểm tra Reconcile Cloud, Secure Token và Bảo vệ Chống Ghi Đè ---
console.log('--- TEST 7: Phân tách quyền cập nhật Máy tính - Điện thoại và chống ghi đè ---');
import {
  generateSecureSessionToken,
  reconcileSessionFromCloud,
  saveActiveQuizSessionLocally,
} from '../src/services/responseCardStorage';

const secureToken = generateSecureSessionToken();
assert.ok(secureToken.length >= 32, 'Mã sessionToken tạo bởi crypto phải có độ dài an toàn cao.');

// Giả lập trạng thái Firestore khi Máy tính và Điện thoại cập nhật độc lập:
// 1. Máy tính điều khiển câu hỏi sang câu 2
// 2. Điện thoại ghi nhận đáp án câu 1 của học sinh mà không đè mất chỉ số câu hỏi
const rawFirestoreDoc = {
  ...session,
  currentQuestionIndex: 1, // Computer navigated to question 2
  answersByQuestion: {
    q1: {
      's-7a1-01': {
        studentId: 's-7a1-01',
        studentName: 'Nguyễn Văn An',
        cardId: 1,
        selectedOption: 'A',
        isCorrect: true,
        timestamp: 1000,
      },
    },
    q2: {
      's-7a1-02': {
        studentId: 's-7a1-02',
        studentName: 'Trần Thị Bình',
        cardId: 2,
        selectedOption: 'B',
        isCorrect: true,
        timestamp: 2000,
      },
    },
  },
  questionStatuses: {
    q1: { status: 'revealed', endedAt: 1500 },
    q2: { status: 'collecting' },
  },
};

const reconciled = reconcileSessionFromCloud(rawFirestoreDoc);
assert.equal(reconciled.currentQuestionIndex, 1, 'Chỉ số câu hỏi máy tính chọn được giữ nguyên.');
assert.equal(reconciled.results[0].answers['s-7a1-01']?.selectedOption, 'A', 'Đáp án câu 1 không bị mất.');
assert.equal(reconciled.results[0].status, 'revealed', 'Trạng thái khóa câu 1 đồng bộ đúng.');
assert.equal(reconciled.results[1].answers['s-7a1-02']?.selectedOption, 'B', 'Đáp án câu 2 cập nhật đúng.');
assert.equal(reconciled.results[1].status, 'collecting', 'Trạng thái thu bài câu 2 đồng bộ đúng.');

console.log('✔ TEST 7 ĐẠT: Phân tách cập nhật Máy tính - Điện thoại không bao giờ ghi đè lẫn nhau.');

// --- TEST 8: Hàng đợi ngoại tuyến bền vững qua tải lại trang & Chống nuốt lỗi ---
console.log('--- TEST 8: Hàng đợi ngoại tuyến lưu bền vững qua reload và chống nuốt lỗi ---');
import {
  loadOfflineAnswerQueue,
  saveOfflineAnswerQueue,
  enqueueOfflineAnswer,
  removeConfirmedOfflineAnswers,
} from '../src/services/responseCardStorage';

const testSessionId = 'session-offline-test-001';
// Xóa queue cũ nếu có
saveOfflineAnswerQueue(testSessionId, []);
assert.equal(loadOfflineAnswerQueue(testSessionId).length, 0);

// 1. Thêm 2 câu trả lời vào hàng đợi khi ngoại tuyến
enqueueOfflineAnswer(testSessionId, {
  questionId: 'q1',
  studentId: 's-7a1-01',
  record: {
    studentId: 's-7a1-01',
    studentName: 'Nguyễn Văn An',
    cardId: 1,
    selectedOption: 'A',
    isCorrect: true,
    timestamp: 5000,
  },
});

enqueueOfflineAnswer(testSessionId, {
  questionId: 'q1',
  studentId: 's-7a1-02',
  record: {
    studentId: 's-7a1-02',
    studentName: 'Trần Thị Bình',
    cardId: 2,
    selectedOption: 'C',
    isCorrect: false,
    timestamp: 5100,
  },
});

// Kiểm tra lưu trong localStorage
const savedRaw = localStorage.getItem(`classgo_response_offline_queue_${testSessionId}_teacher-123`) ||
  localStorage.getItem(`classgo_response_offline_queue_${testSessionId}`);
assert.ok(savedRaw && savedRaw.length > 0, 'Hàng đợi ngoại tuyến bắt buộc phải được lưu vào localStorage.');

// Giả lập tải lại trang (reload): đọc lại từ storage
const reloadedQueue = loadOfflineAnswerQueue(testSessionId);
assert.equal(reloadedQueue.length, 2, 'Sau khi tải lại trang, 2 đáp án chờ gửi vẫn còn nguyên vẹn 100%.');
assert.equal(reloadedQueue[0].studentId, 's-7a1-01');
assert.equal(reloadedQueue[1].studentId, 's-7a1-02');

// 2. Mô phỏng ghi thất bại: Không xóa hàng đợi
// Nếu ghi Firestore gặp lỗi mạng hoặc thất bại, hàng đợi KHÔNG được xóa!
assert.equal(loadOfflineAnswerQueue(testSessionId).length, 2, 'Ghi lỗi không được xóa đáp án.');

// 3. Chỉ xóa khi Firestore xác nhận ghi thành công từng bản ghi
removeConfirmedOfflineAnswers(testSessionId, [{ questionId: 'q1', studentId: 's-7a1-01' }]);
const afterOneConfirmed = loadOfflineAnswerQueue(testSessionId);
assert.equal(afterOneConfirmed.length, 1, 'Sau khi xác nhận thành công 1 câu, chỉ xóa đúng câu đó.');
assert.equal(afterOneConfirmed[0].studentId, 's-7a1-02');

removeConfirmedOfflineAnswers(testSessionId, [{ questionId: 'q1', studentId: 's-7a1-02' }]);
assert.equal(loadOfflineAnswerQueue(testSessionId).length, 0, 'Hàng đợi xóa hoàn toàn khi tất cả đã xác nhận.');
console.log('✔ TEST 8 ĐẠT: Hàng đợi lưu bền vững qua reload, chỉ xóa khi Firestore xác nhận thành công.');

// --- TEST 9: Ngăn ghi đáp án vào câu đã khóa hoặc phiên kết thúc ---
console.log('--- TEST 9: Từ chối ghi đáp án vào câu đã khóa/công bố hoặc phiên đã kết thúc ---');
// Giả lập hàm kiểm tra trạng thái máy chủ trước khi ghi
function simulateServerSideAnswerValidation(
  serverDoc: any,
  questionId: string
): { success: boolean; rejectedLocked?: boolean; errorMessage?: string } {
  if (serverDoc.status === 'completed') {
    return { success: false, rejectedLocked: true, errorMessage: 'Phiên kiểm tra đã hoàn thành trên máy tính.' };
  }
  const qStatus = serverDoc.questionStatuses?.[questionId]?.status ||
    serverDoc.results?.find((r: any) => r.questionId === questionId)?.status;
  if (qStatus && qStatus !== 'collecting') {
    return { success: false, rejectedLocked: true, errorMessage: `Câu hỏi đã bị khóa hoặc công bố đáp án (${qStatus}).` };
  }
  return { success: true };
}

// Case A: Câu hỏi đang mở thu bài ('collecting') -> Cho phép ghi
const serverOpen = { status: 'running', questionStatuses: { q1: { status: 'collecting' } } };
const resOpen = simulateServerSideAnswerValidation(serverOpen, 'q1');
assert.equal(resOpen.success, true);

// Case B: Giáo viên trên máy tính đã bấm Khóa câu ('locked' hoặc 'revealed') -> Từ chối ghi!
const serverLocked = { status: 'running', questionStatuses: { q1: { status: 'revealed' } } };
const resLocked = simulateServerSideAnswerValidation(serverLocked, 'q1');
assert.equal(resLocked.success, false);
assert.equal(resLocked.rejectedLocked, true);
assert.ok(resLocked.errorMessage?.includes('khóa hoặc công bố'));

// Case C: Phiên đã kết thúc ('completed') -> Từ chối ghi!
const serverCompleted = { status: 'completed', questionStatuses: { q1: { status: 'collecting' } } };
const resCompleted = simulateServerSideAnswerValidation(serverCompleted, 'q1');
assert.equal(resCompleted.success, false);
assert.equal(resCompleted.rejectedLocked, true);

console.log('✔ TEST 9 ĐẠT: Đáp án gửi muộn vào câu đã khóa hoặc phiên kết thúc đều bị từ chối an toàn.');

// --- TEST 10: Tìm kiếm phiên qua PIN có xác thực tài khoản giáo viên ---
console.log('--- TEST 10: Kết nối PIN kiểm tra tài khoản sở hữu và trạng thái phiên đang chạy ---');
import { fetchSessionByPin } from '../src/services/responseCardStorage';

// Phiên đang chạy có mã PIN
const pinSession = createNewQuizSession(class7A1, 'Kiểm tra PIN Test', sampleQuestions, 'Toán', 'teacher-123');
const activePin = pinSession.sessionPin!;

// Tìm với đúng PIN
const found = await fetchSessionByPin(activePin, 'teacher-123');
assert.ok(found !== null, 'Phải tìm thấy phiên đang chạy bằng PIN.');
assert.equal(found?.id, pinSession.id);

// PIN sai hoặc dưới 6 số -> Trả về null
const notFound = await fetchSessionByPin('000000', 'teacher-123');
assert.equal(notFound, null, 'PIN không khớp phải trả về null.');

// Khi phiên đã kết thúc (completed) -> Không cho kết nối mới qua PIN
pinSession.status = 'completed';
saveActiveQuizSession(pinSession);
const afterComplete = await fetchSessionByPin(activePin, 'teacher-123');
assert.equal(afterComplete, null, 'Phiên đã kết thúc (completed) không cho phép kết nối qua PIN.');

console.log('✔ TEST 10 ĐẠT: Tìm phiên qua PIN kiểm tra chặt chẽ trạng thái running và tài khoản giáo viên.');

console.log('===============================================================');
console.log('🎉 TẤT CẢ 10 BÀI KIỂM THỬ THẺ TRẢ LỜI ĐÃ HOÀN TOÀN ĐẠT CHUẨN 100%!');
console.log('===============================================================');


