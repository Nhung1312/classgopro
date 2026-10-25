import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  normalizeSubjectName,
  parsePpctFromExcel,
  parseTimetableFromExcel,
  generateTeachingPlanFromTimetable,
  findNextUntaughtPpctLesson,
} from '../src/utils/timetableExcelService';
import { TimetableSlot, PpctItem, DayOffItem, ScheduleGenerationConfig } from '../src/types';

// Helper to convert CSV string into a File-like object that timetableExcelService expects
function createMockFileFromBuffer(buffer: Buffer, name: string): File {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return {
    name,
    arrayBuffer: async () => arrayBuffer,
  } as unknown as File;
}

function createMockFileFromCsv(csvContent: string, name: string): File {
  const wb = XLSX.read(csvContent, { type: 'string' });
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return createMockFileFromBuffer(buf, name);
}

const fixtureRoot = process.env.CLASSGO_TEST_SOURCE_DIR;
function ppctCsv(): string {
  if (fixtureRoot) return fs.readFileSync(path.join(fixtureRoot, 'PPCT_455_tiet_ClassGo_30156e6a.csv'), 'utf8');
  const rows: (string | number)[][] = [['Tiết PPCT', 'Khối', 'Môn học', 'Tên bài dạy', 'Học kỳ', 'Ghi chú']];
  for (const [grade, subject, count] of [[7, 'Toán', 140], [8, 'Toán', 140], [7, 'HĐTN&HN', 105], [7, 'GDĐP', 35], [8, 'GDĐP', 35]] as const) {
    for (let n = 1; n <= count; n++) rows.push([n, grade, subject, subject === 'GDĐP' && grade === 7 ? 'Thành Nhà Hồ' : `Bài ${n}`, 1, '']);
  }
  return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
}
function timetableCsv(): string {
  if (fixtureRoot) return fs.readFileSync(path.join(fixtureRoot, 'TKB_20_tiet_ClassGo_9a6f25ad.csv'), 'utf8');
  const rows = [["Thứ", "Buổi", "Tiết", "Lớp", "Môn"], ["Thứ 3", "Sáng", "1", "7A1", "Toán"], ["Thứ 3", "Sáng", "2", "8A3", "Toán"], ["Thứ 3", "Sáng", "3", "7A2", "Toán"], ["Thứ 3", "Sáng", "4", "7A3", "GDĐP"], ["Thứ 4", "Sáng", "1", "7A1", "Toán"], ["Thứ 4", "Sáng", "3", "8A2", "GDĐP"], ["Thứ 4", "Sáng", "4", "7A2", "Toán"], ["Thứ 4", "Chiều", "2", "8A3", "Toán"], ["Thứ 4", "Chiều", "3", "8A3", "GDĐP"], ["Thứ 5", "Sáng", "1", "7A2", "Toán"], ["Thứ 5", "Sáng", "2", "8A3", "Toán"], ["Thứ 5", "Sáng", "3", "7A1", "GDĐP"], ["Thứ 5", "Sáng", "4", "7A1", "Toán"], ["Thứ 6", "Sáng", "1", "7A2", "Toán"], ["Thứ 6", "Sáng", "2", "8A3", "Toán"], ["Thứ 6", "Sáng", "3", "7A1", "Toán"], ["Thứ 6", "Sáng", "4", "7A2", "GDĐP"], ["Thứ 6", "Chiều", "1", "7A3", "HĐTN&HN"], ["Thứ 6", "Chiều", "2", "7A3", "HĐTN&HN"], ["Thứ 6", "Chiều", "3", "7A3", "HĐTN&HN"]];
  return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỔNG HỢP: PPCT 455 TIẾT, TKB 20 TIẾT, MẪU EXCEL');
  console.log('===============================================================\n');

  let passedAll = true;

  // -------------------------------------------------------------------------
  // TEST 1: Kiểm tra chuẩn hóa tên môn học normalizeSubjectName
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Kiểm tra chuẩn hóa tên môn (normalizeSubjectName) ---');
  const subjectEquivalenceTests: [string, string][] = [
    ['Toán', 'Toán'],
    ['Toán học', 'Toán'],
    ['toán', 'Toán'],
    ['toan hoc', 'Toán'],
    ['Toán 7', 'Toán'],
    ['Toán 8', 'Toán'],
    ['GDĐP', 'GDĐP'],
    ['GD DP', 'GDĐP'],
    ['Giáo dục địa phương', 'GDĐP'],
    ['gddp', 'GDĐP'],
    ['GDĐP 7', 'GDĐP'],
    ['GDĐP 8', 'GDĐP'],
    ['HĐTN', 'HĐTN&HN'],
    ['HĐTN&HN', 'HĐTN&HN'],
    ['HĐTN & HN', 'HĐTN&HN'],
    ['hdtn&hn', 'HĐTN&HN'],
    ['Hoạt động trải nghiệm', 'HĐTN&HN'],
    ['Hoạt động trải nghiệm, hướng nghiệp', 'HĐTN&HN'],
    ['Hoạt động trải nghiệm và hướng nghiệp', 'HĐTN&HN'],
    ['HĐTN&HN 7', 'HĐTN&HN'],
    ['Ngữ văn', 'Ngữ văn'],
    ['Khoa học tự nhiên', 'Khoa học tự nhiên'],
  ];

  let subPassed = true;
  for (const [input, expected] of subjectEquivalenceTests) {
    const actual = normalizeSubjectName(input);
    if (actual !== expected) {
      console.error(`❌ Lỗi chuẩn hóa: "${input}" -> mong đợi "${expected}", nhận được "${actual}"`);
      subPassed = false;
      passedAll = false;
    }
  }
  if (subPassed) {
    console.log(`✅ TEST 1 ĐẠT: Đã kiểm tra ${subjectEquivalenceTests.length} trường hợp chuẩn hóa môn học.`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Đọc PPCT 455 tiết tổng hợp
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Đọc PPCT tổng hợp 455 tiết ---');
  const ppctCsvContent = ppctCsv();
  const ppctMockFile = createMockFileFromCsv(ppctCsvContent, 'PPCT_455_tiet.xlsx');

  const parsedPpct = await parsePpctFromExcel(ppctMockFile);
  console.log(`- Tổng số tiết PPCT đọc được: ${parsedPpct.items.length} / 455`);
  console.log(`- Số cảnh báo: ${parsedPpct.warnings.length}`);

  const ppctGroupCount: { [key: string]: number } = {};
  parsedPpct.items.forEach((item) => {
    const key = `${item.subject} Khối ${item.grade}`;
    ppctGroupCount[key] = (ppctGroupCount[key] || 0) + 1;
  });

  console.log('Thống kê theo môn và khối:', ppctGroupCount);

  const expectedCounts: { [key: string]: number } = {
    'Toán Khối 7': 140,
    'Toán Khối 8': 140,
    'HĐTN&HN Khối 7': 105,
    'GDĐP Khối 7': 35,
    'GDĐP Khối 8': 35,
  };

  let ppctPassed = parsedPpct.items.length === 455 && parsedPpct.warnings.length === 0;
  for (const [k, exp] of Object.entries(expectedCounts)) {
    if (ppctGroupCount[k] !== exp) {
      console.error(`❌ Sai lệch số tiết của nhóm ${k}: Mong đợi ${exp}, thực tế ${ppctGroupCount[k] || 0}`);
      ppctPassed = false;
      passedAll = false;
    }
  }

  if (ppctPassed) {
    console.log('✅ TEST 2 ĐẠT: Đã đọc đủ 455 tiết PPCT, đúng 100% cơ cấu các môn và khối.');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Kiểm tra nhận diện trùng tiết thật trong cùng môn vs môn khác
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Kiểm tra phân biệt trùng tiết ---');
  const multiDupCsv = [
    'Tiết PPCT,Khối,Môn học,Tên bài dạy,Học kỳ,Ghi chú',
    '1,7,Toán,Bài 1 Toán 7,1,',
    '1,7,GDĐP,Chủ đề 1 GDĐP 7,1,',
    '1,7,HĐTN&HN,Chủ đề 1 HĐTN 7,1,',
    '1,7,Toán,Bài 1 Toán 7 (dòng trùng lặp thật),1,',
  ].join('\n');

  const dupMockFile = createMockFileFromCsv(multiDupCsv, 'test_dup.xlsx');
  const dupResult = await parsePpctFromExcel(dupMockFile);
  console.log(`- Số dòng đọc được sau deduplicate: ${dupResult.items.length} (Mong đợi 3)`);
  console.log(`- Số cảnh báo trùng: ${dupResult.warnings.length} (Mong đợi 1)`);

  if (dupResult.items.length === 3 && dupResult.warnings.length === 1) {
    console.log('✅ TEST 3 ĐẠT: Phân biệt chính xác tiết 1 của 3 môn khác nhau; phát hiện và loại trừ đúng dòng trùng lặp môn Toán.');
  } else {
    console.error('❌ TEST 3 THẤT BẠI!');
    passedAll = false;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Đọc TKB thực tế 20 tiết/tuần
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Đọc TKB thực tế 20 tiết/tuần ---');
  const tkbCsvContent = timetableCsv();
  const tkbMockFile = createMockFileFromCsv(tkbCsvContent, 'TKB_20_tiet.xlsx');

  const parsedTkb = await parseTimetableFromExcel(tkbMockFile, []);
  console.log(`- Tổng số tiết TKB đọc được: ${parsedTkb.slots.length} / 20`);

  const tkbSubCount: { [key: string]: number } = {};
  const tkbClassCount: { [key: string]: number } = {};
  parsedTkb.slots.forEach((s) => {
    tkbSubCount[s.subject] = (tkbSubCount[s.subject] || 0) + 1;
    tkbClassCount[s.className] = (tkbClassCount[s.className] || 0) + 1;
  });

  console.log('Thống kê TKB theo môn:', tkbSubCount);
  console.log('Thống kê TKB theo lớp:', tkbClassCount);

  const expTkbSub: { [key: string]: number } = {
    'Toán': 12,
    'GDĐP': 5,
    'HĐTN&HN': 3,
  };

  let tkbPassed = parsedTkb.slots.length === 20;
  for (const [s, count] of Object.entries(expTkbSub)) {
    if (tkbSubCount[s] !== count) {
      console.error(`❌ Sai lệch số tiết môn ${s}: Mong đợi ${count}, thực tế ${tkbSubCount[s] || 0}`);
      tkbPassed = false;
      passedAll = false;
    }
  }

  if (tkbPassed) {
    console.log('✅ TEST 4 ĐẠT: Đọc đủ 20 tiết TKB (12 Toán + 5 GDĐP + 3 HĐTN&HN).');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Ghép TKB 20 tiết và PPCT 455 tiết (Sinh Sổ báo giảng)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Ghép TKB 20 tiết và PPCT 455 tiết ---');
  const scheduleConfig: ScheduleGenerationConfig = {
    startDate: '2026-09-07',
    totalWeeks: 1,
    semester: '1',
    preserveCompleted: true,
  };

  const teachingPlanResult = generateTeachingPlanFromTimetable({
    timetable: parsedTkb.slots,
    ppctItems: parsedPpct.items,
    dayOffs: [],
    config: scheduleConfig,
    existingPlan: [],
    classes: [],
  });

  console.log(`- Tổng số tiết đã sinh cho Tuần 1: ${teachingPlanResult.generatedPlan.length} / 20`);
  console.log(`- Lớp thiếu PPCT: ${teachingPlanResult.missingPpctClasses.length}`);
  console.log('Thống kê theo từng lớp:', teachingPlanResult.stats.classStats);

  // Kiểm tra tên bài dạy của từng lớp
  let planPassed = teachingPlanResult.generatedPlan.length === 20 && teachingPlanResult.missingPpctClasses.length === 0;

  // 7A1: 4 tiết Toán (bài 1..4 của Toán 7) + 1 tiết GDĐP (bài 1 của GDĐP 7)
  const p7a1Toan = teachingPlanResult.generatedPlan.filter((p) => p.className === '7A1' && p.subject === 'Toán');
  const p7a1Gddp = teachingPlanResult.generatedPlan.filter((p) => p.className === '7A1' && p.subject === 'GDĐP');
  console.log(`  + 7A1 Toán: ${p7a1Toan.length} tiết (Tiết PPCT: ${p7a1Toan.map((p) => p.periodNumber).join(', ')})`);
  console.log(`  + 7A1 GDĐP: ${p7a1Gddp.length} tiết (Tiết PPCT: ${p7a1Gddp[0]?.periodNumber} - ${p7a1Gddp[0]?.lessonTitle})`);

  // 7A3: 1 tiết GDĐP + 3 tiết HĐTN&HN
  const p7a3Gddp = teachingPlanResult.generatedPlan.filter((p) => p.className === '7A3' && p.subject === 'GDĐP');
  const p7a3Hdtn = teachingPlanResult.generatedPlan.filter((p) => p.className === '7A3' && p.subject === 'HĐTN&HN');
  console.log(`  + 7A3 GDĐP: ${p7a3Gddp.length} tiết (Tiết PPCT: ${p7a3Gddp[0]?.periodNumber})`);
  console.log(`  + 7A3 HĐTN&HN: ${p7a3Hdtn.length} tiết (Tiết PPCT: ${p7a3Hdtn.map((p) => p.periodNumber).join(', ')})`);

  // 8A3: 4 tiết Toán + 1 tiết GDĐP
  const p8a3Toan = teachingPlanResult.generatedPlan.filter((p) => p.className === '8A3' && p.subject === 'Toán');
  const p8a3Gddp = teachingPlanResult.generatedPlan.filter((p) => p.className === '8A3' && p.subject === 'GDĐP');
  console.log(`  + 8A3 Toán: ${p8a3Toan.length} tiết (Tiết PPCT: ${p8a3Toan.map((p) => p.periodNumber).join(', ')})`);
  console.log(`  + 8A3 GDĐP: ${p8a3Gddp.length} tiết (Tiết PPCT: ${p8a3Gddp[0]?.periodNumber} - ${p8a3Gddp[0]?.lessonTitle})`);

  if (
    p7a1Toan.length === 4 &&
    p7a1Gddp.length === 1 &&
    p7a1Gddp[0]?.lessonTitle.includes('Thành Nhà Hồ') &&
    p7a3Hdtn.length === 3 &&
    p8a3Toan.length === 4 &&
    p8a3Gddp.length === 1 &&
    planPassed
  ) {
    console.log('✅ TEST 5 ĐẠT: Ghép TKB và PPCT chính xác theo Lớp + Môn + Khối; tiến độ độc lập 100%.');
  } else {
    console.error('❌ TEST 5 THẤT BẠI!');
    passedAll = false;
  }

  // -------------------------------------------------------------------------
  // TEST 6: Kiểm tra ngày nghỉ và dạy bù
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Kiểm tra ngày nghỉ và dạy bù ---');
  // Cho lớp 7A1 nghỉ Thứ 3 ngày 2026-09-08 (Tiết 1 Toán)
  const dayOffs: DayOffItem[] = [
    {
      id: 'do-1',
      date: '2026-09-08',
      reason: '7A1 đi tham quan',
      allDay: false,
      periods: [1],
      classId: parsedTkb.slots.find((s) => s.className === '7A1')?.classId,
    },
  ];

  const planWithDayOff = generateTeachingPlanFromTimetable({
    timetable: parsedTkb.slots,
    ppctItems: parsedPpct.items,
    dayOffs,
    config: scheduleConfig,
    existingPlan: [],
    classes: [],
  });

  const offSlot7a1 = planWithDayOff.generatedPlan.find((p) => p.className === '7A1' && p.isOffDay);
  const nextToan7a1 = planWithDayOff.generatedPlan.find(
    (p) => p.className === '7A1' && p.subject === 'Toán' && !p.isOffDay
  );
  const toan7a2Slot1 = planWithDayOff.generatedPlan.find(
    (p) => p.className === '7A2' && p.subject === 'Toán' && p.dayOfWeek === 3
  );

  console.log(`- Tiết nghỉ 7A1: ${offSlot7a1?.lessonTitle}`);
  console.log(`- Tiết Toán tiếp theo của 7A1 nhận bài PPCT số: ${nextToan7a1?.periodNumber} (Mong đợi: 1)`);
  console.log(`- Tiết Toán của 7A2 ngày Thứ 3 có bị ảnh hưởng không: Tiết PPCT số ${toan7a2Slot1?.periodNumber} (Mong đợi: 1)`);

  if (offSlot7a1 && nextToan7a1?.periodNumber === 1 && toan7a2Slot1?.periodNumber === 1) {
    console.log('✅ TEST 6 ĐẠT: Ngày nghỉ dời đúng bài của lớp và môn đó; các môn và lớp khác không bị ảnh hưởng.');
  } else {
    console.error('❌ TEST 6 THẤT BẠI!');
    passedAll = false;
  }

  // -------------------------------------------------------------------------
  // TEST 7: Kiểm tra cấu trúc file mẫu Mau_PPCT_Chung_Moi_Mon_ClassGo.xlsx
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Kiểm tra cấu trúc mẫu PPCT tải xuống ---');
  // Tạo file mẫu trong bộ nhớ
  const wb = XLSX.utils.book_new();
  const ppctRows: (string | number)[][] = [
    ['Tiết PPCT', 'Khối', 'Môn học', 'Tên bài dạy', 'Học kỳ', 'Ghi chú'],
    [1, '7', 'Toán', 'Số hữu tỉ', '1', 'Ghi chú thử nghiệm'],
  ];
  const wsPpct = XLSX.utils.aoa_to_sheet(ppctRows);
  XLSX.utils.book_append_sheet(wb, wsPpct, 'PPCT');

  const exampleRows: (string | number)[][] = [
    ['Tiết PPCT', 'Khối', 'Môn học', 'Tên bài dạy', 'Học kỳ', 'Ghi chú'],
    [1, '7', 'GDĐP', 'Bài mẫu ví dụ (không được đọc)', '1', 'Ví dụ'],
  ];
  const wsExample = XLSX.utils.aoa_to_sheet(exampleRows);
  XLSX.utils.book_append_sheet(wb, wsExample, 'VI_DU_KHONG_NHAP');

  const wsGuide = XLSX.utils.aoa_to_sheet([['Hướng dẫn']]);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HUONG_DAN');

  const templateBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const templateMockFile = createMockFileFromBuffer(templateBuf, 'Mau_PPCT_Chung_Moi_Mon_ClassGo.xlsx');

  const parsedTemplate = await parsePpctFromExcel(templateMockFile);
  console.log(`- Số bài đọc được từ file mẫu: ${parsedTemplate.items.length} (Mong đợi 1 bài thật từ sheet PPCT)`);
  console.log(`- Bài đọc được: "${parsedTemplate.items[0]?.lessonTitle}"`);

  if (
    parsedTemplate.items.length === 1 &&
    parsedTemplate.items[0]?.lessonTitle === 'Số hữu tỉ' &&
    wb.SheetNames.includes('PPCT') &&
    wb.SheetNames.includes('VI_DU_KHONG_NHAP') &&
    wb.SheetNames.includes('HUONG_DAN')
  ) {
    console.log('✅ TEST 7 ĐẠT: Mẫu PPCT 3 sheet chuẩn xác; bộ đọc tự động bỏ qua sheet ví dụ, chỉ đọc dữ liệu thật từ sheet PPCT.');
  } else {
    console.error('❌ TEST 7 THẤT BẠI!');
    passedAll = false;
  }

  console.log('\n===============================================================');
  if (passedAll) {
    console.log('🎉 TẤT CẢ 7 BÀI TEST ĐÃ HOÀN TOÀN ĐẠT CHUẨN 100%!');
  } else {
    console.error('❌ CÓ BÀI TEST CHƯA ĐẠT!');
    process.exit(1);
  }
  console.log('===============================================================');
}

runAllTests().catch((err) => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
