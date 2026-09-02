import * as XLSX from 'xlsx';
import { ExcelPreviewRow, ExcelParseResult } from '../types';

/**
 * Normalizes header string to ease comparison (lowercases, removes accents & special chars)
 */
export function normalizeHeader(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses raw text pasted from clipboard (one name per line or tab-separated table)
 */
export function parsePastedNames(text: string): ExcelParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      rows: [],
      totalParsed: 0,
      warnings: ['Không tìm thấy dữ liệu họ tên nào trong văn bản đã dán.'],
    };
  }

  const rows: ExcelPreviewRow[] = [];
  const seenNames = new Set<string>();
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if tab-separated or comma-separated
    const tokens = line.split(/[\t,;]+/).map((t) => t.trim()).filter(Boolean);

    let name = '';
    let studentCode: string | undefined = undefined;
    let gender: 'nam' | 'nu' | 'khac' | undefined = undefined;

    if (tokens.length === 1) {
      name = tokens[0];
    } else if (tokens.length >= 2) {
      // If first token is STT (number)
      if (/^\d+$/.test(tokens[0])) {
        // e.g. "1\tĐoàn Trần Quốc\tAn" or "1\tNguyễn Văn A\tHS001"
        if (tokens.length >= 3 && tokens[2].length <= 10 && !/^\d+$/.test(tokens[2])) {
          // Might be (STT, Họ đệm, Tên)
          if (!tokens[1].toLowerCase().includes('hoc sinh') && !tokens[1].toLowerCase().includes('ho va ten')) {
            name = `${tokens[1]} ${tokens[2]}`.trim();
          } else {
            name = tokens[2];
          }
        } else {
          name = tokens[1];
          if (tokens[2]) {
            const gNorm = normalizeHeader(tokens[2]);
            if (gNorm.includes('nu') || gNorm === 'f' || gNorm === 'female') gender = 'nu';
            else if (gNorm.includes('nam') || gNorm === 'm' || gNorm === 'male') gender = 'nam';
            else studentCode = tokens[2];
          }
        }
      } else {
        // Might be "Nguyễn Văn\tA"
        if (tokens.length === 2 && tokens[1].length <= 12) {
          name = `${tokens[0]} ${tokens[1]}`.trim();
        } else {
          name = tokens[0];
        }
      }
    }

    // Skip potential header rows like "Họ và tên", "STT", etc.
    const norm = normalizeHeader(name);
    if (
      norm === 'hovaten' ||
      norm === 'hoten' ||
      norm === 'tenhocsinh' ||
      norm === 'stt' ||
      norm.startsWith('danhsach') ||
      norm.startsWith('bangdiem') ||
      norm.startsWith('sohocsinh') ||
      norm.length <= 1
    ) {
      continue;
    }

    const isDuplicate = seenNames.has(name.toLowerCase());
    if (isDuplicate) {
      warnings.push(`Học sinh "${name}" tại dòng ${i + 1} bị trùng lặp.`);
    }
    seenNames.add(name.toLowerCase());

    rows.push({
      stt: rows.length + 1,
      name,
      studentCode,
      gender,
      callCount: 0,
      isValid: true,
      warning: isDuplicate ? 'Trùng tên trong danh sách' : undefined,
    });
  }

  return {
    rows,
    totalParsed: rows.length,
    warnings,
  };
}

/**
 * Universal Excel Parser compatible with standard files and official vnEdu / SMAS templates
 */
export function parseExcelWorkbook(workbook: XLSX.WorkBook, fileName = ''): ExcelParseResult {
  // Use first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], totalParsed: 0, warnings: ['File Excel không có trang tính nào (Sheet).'] };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const warnings: string[] = [];

  // 1. Try to find suggested class name from filename or top rows
  let suggestedClassName = '';
  const classMatch = fileName.match(/(?:lop|class|lớp)?[\s_-]*([0-9]{1,2}\s*[A-Za-z][0-9]{0,2})/i);
  if (classMatch && classMatch[1]) {
    suggestedClassName = classMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  if (!rawData || rawData.length === 0) {
    return { rows: [], totalParsed: 0, warnings: ['File không chứa dữ liệu hợp lệ.'], suggestedClassName };
  }

  // Scan top 6 rows for class names like "Khối 6 - Lớp 6A" or "Lớp 7A1"
  for (let r = 0; r < Math.min(6, rawData.length); r++) {
    const rowStr = (rawData[r] || []).join(' ');
    const match = rowStr.match(/(?:lớp|lop|class)\s*:?\s*([0-9]{1,2}\s*[A-Za-z0-9]+)/i);
    if (match && match[1]) {
      suggestedClassName = match[1].replace(/\s+/g, '').toUpperCase();
      break;
    }
  }

  // 2. Look for header rows and column mapping
  let headerRowIdx = -1;
  let nameColIdx = -1;
  let hoColIdx = -1;
  let tenColIdx = -1;
  let sttColIdx = -1;
  let codeColIdx = -1;
  let genderColIdx = -1;
  let callCountColIdx = -1;
  let noteColIdx = -1;
  let tx1ColIdx = -1;
  let tx2ColIdx = -1;
  let tx3ColIdx = -1;
  let tx4ColIdx = -1;
  let gkColIdx = -1;
  let ckColIdx = -1;

  for (let r = 0; r < Math.min(15, rawData.length); r++) {
    const row = rawData[r];
    if (!Array.isArray(row)) continue;

    const rowNormalized = row.map((cell) => normalizeHeader(String(cell || '')));

    for (let c = 0; c < rowNormalized.length; c++) {
      const val = rowNormalized[c];
      if (val === 'hovaten' || val === 'hoten' || val === 'tenhocsinh' || val === 'hocsinh' || val === 'fullname' || val === 'name') {
        nameColIdx = c;
      }
      if (val === 'ho' || val === 'hodem' || val === 'hovachulot' || val === 'holot' || val === 'hovadem') {
        hoColIdx = c;
      }
      if (val === 'ten' || val === 'firstname') {
        tenColIdx = c;
      }
      if (val === 'stt' || val === 'sothutu' || val === 'no' || val === 'tt') {
        sttColIdx = c;
      }
      if (val === 'mahocsinh' || val === 'mahs' || val === 'studentcode' || val === 'id') {
        codeColIdx = c;
      }
      if (val === 'gioitinh' || val === 'phai' || val === 'gender' || val === 'gt') {
        genderColIdx = c;
      }
      if (val.includes('solan') || val.includes('lenbang') || val.includes('kiemtra') || val.includes('callcount')) {
        callCountColIdx = c;
      }
      if (val === 'ghichu' || val === 'nhanxet' || val === 'note' || val === 'notes') {
        noteColIdx = c;
      }
      // Scores
      if (val === 'tx1' || val === 'mieng' || val === 'ddgtx1' || val.includes('tx1')) {
        tx1ColIdx = c;
      }
      if (val === 'tx2' || val === '15p' || val === 'ddgtx2' || val.includes('tx2')) {
        tx2ColIdx = c;
      }
      if (val === 'tx3' || val === 'ddgtx3' || val.includes('tx3')) {
        tx3ColIdx = c;
      }
      if (val === 'tx4' || val === 'ddgtx4' || val.includes('tx4')) {
        tx4ColIdx = c;
      }
      if (val === 'gk' || val === 'giuaky' || val === 'ddggk' || val.includes('giuaky') || val === 'ddggk') {
        gkColIdx = c;
      }
      if (val === 'ck' || val === 'cuoiky' || val === 'ddgck' || val.includes('cuoiky') || val === 'ddgck') {
        ckColIdx = c;
      }
    }

    // Check if next row (r+1) has sub-headers e.g. vnEdu with TX1, TX2, TX3, TX4
    if (r + 1 < rawData.length) {
      const nextRow = rawData[r + 1];
      if (Array.isArray(nextRow)) {
        const nextNorm = nextRow.map((cell) => normalizeHeader(String(cell || '')));
        for (let c = 0; c < nextNorm.length; c++) {
          const nVal = nextNorm[c];
          if (nVal === 'tx1' && tx1ColIdx === -1) tx1ColIdx = c;
          if (nVal === 'tx2' && tx2ColIdx === -1) tx2ColIdx = c;
          if (nVal === 'tx3' && tx3ColIdx === -1) tx3ColIdx = c;
          if (nVal === 'tx4' && tx4ColIdx === -1) tx4ColIdx = c;
          if (nVal === 'ten' && tenColIdx === -1) tenColIdx = c;
          if ((nVal === 'ho' || nVal === 'hodem') && hoColIdx === -1) hoColIdx = c;
        }
      }
    }

    if (nameColIdx !== -1 || (hoColIdx !== -1 && tenColIdx !== -1)) {
      headerRowIdx = r;
      // If the next row is sub-header (has tx1, tx2, etc.), skip to r + 1
      if (r + 1 < rawData.length && Array.isArray(rawData[r + 1])) {
        const nextNorm = rawData[r + 1].map((cell) => normalizeHeader(String(cell || '')));
        if (nextNorm.some((v) => v === 'tx1' || v === 'tx2' || v === 'ten')) {
          headerRowIdx = r + 1;
        }
      }
      break;
    }
  }

  // Fallback if no header identified
  if (headerRowIdx === -1) {
    let bestCol = 0;
    let maxNameScore = 0;
    for (let c = 0; c < 10; c++) {
      let score = 0;
      for (let r = 0; r < Math.min(20, rawData.length); r++) {
        const val = String(rawData[r]?.[c] || '').trim();
        const wordCount = val.split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 5 && !/^\d+$/.test(val)) {
          score++;
        }
      }
      if (score > maxNameScore) {
        maxNameScore = score;
        bestCol = c;
      }
    }

    if (maxNameScore >= 2) {
      nameColIdx = bestCol;
      headerRowIdx = 0;
      warnings.push('Tự động nhận diện cột Họ và Tên theo cấu trúc dữ liệu.');
    } else {
      warnings.push('Không tìm thấy cột Họ và Tên rõ ràng. Sẽ lấy cột chứa họ tên đầu tiên.');
      nameColIdx = 1;
      headerRowIdx = 0;
    }
  }

  const rows: ExcelPreviewRow[] = [];
  const seenNames = new Set<string>();
  let emptyRowCount = 0;

  for (let r = headerRowIdx + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!Array.isArray(row) || row.every((c) => !c || String(c).trim() === '')) {
      emptyRowCount++;
      continue;
    }

    let fullName = '';
    // vnEdu format check: If nameColIdx is set, but adjacent column (nameColIdx + 1) has single-word first name
    // e.g. Col 1: "Đoàn Trần Quốc", Col 2: "An"
    if (hoColIdx !== -1 && tenColIdx !== -1) {
      const ho = String(row[hoColIdx] || '').trim();
      const ten = String(row[tenColIdx] || '').trim();
      fullName = `${ho} ${ten}`.trim();
    } else if (nameColIdx !== -1) {
      const colVal = String(row[nameColIdx] || '').trim();
      const nextColVal = String(row[nameColIdx + 1] || '').trim();

      // If nextColVal looks like a first name (single word, no numbers, not a score)
      if (
        nextColVal &&
        !/\d/.test(nextColVal) &&
        nextColVal.split(/\s+/).length === 1 &&
        nextColVal.length <= 15 &&
        (nameColIdx + 1 !== tx1ColIdx && nameColIdx + 1 !== codeColIdx && nameColIdx + 1 !== genderColIdx)
      ) {
        // vnEdu 2-column format (Họ đệm + Tên)
        fullName = `${colVal} ${nextColVal}`.trim();
      } else {
        fullName = colVal;
      }
    }

    // Ignore known non-student footer or title rows
    const norm = normalizeHeader(fullName);
    if (
      !fullName ||
      norm.startsWith('tongso') ||
      norm.startsWith('giaovien') ||
      norm.startsWith('nguoilap') ||
      norm.startsWith('hieutruong') ||
      norm.startsWith('ghichu') ||
      norm.startsWith('thongke') ||
      norm === 'hovaten' ||
      /^\d+$/.test(fullName)
    ) {
      continue;
    }

    // Extract student code if present
    let code: string | undefined = undefined;
    if (codeColIdx !== -1 && row[codeColIdx]) {
      code = String(row[codeColIdx]).trim();
    }

    // Extract gender
    let gender: 'nam' | 'nu' | 'khac' | undefined = undefined;
    if (genderColIdx !== -1 && row[genderColIdx]) {
      const gNorm = normalizeHeader(String(row[genderColIdx]));
      if (gNorm.includes('nu') || gNorm === 'f' || gNorm === 'female' || gNorm === 'x') {
        gender = 'nu';
      } else if (gNorm.includes('nam') || gNorm === 'm' || gNorm === 'male') {
        gender = 'nam';
      }
    }

    const isDuplicate = seenNames.has(fullName.toLowerCase());
    if (isDuplicate) {
      warnings.push(`Học sinh "${fullName}" tại dòng ${r + 1} bị trùng tên.`);
    }
    seenNames.add(fullName.toLowerCase());

    // Extract STT or use sequential
    let stt = rows.length + 1;
    if (sttColIdx !== -1 && row[sttColIdx] && /^\d+$/.test(String(row[sttColIdx]).trim())) {
      stt = parseInt(String(row[sttColIdx]).trim(), 10);
    }

    // Extract callCount if present
    let callCount = 0;
    if (callCountColIdx !== -1 && row[callCountColIdx]) {
      const parsedCalls = parseInt(String(row[callCountColIdx]).trim(), 10);
      if (!isNaN(parsedCalls) && parsedCalls >= 0) {
        callCount = parsedCalls;
      }
    }

    // Extract notes if present
    let notes: string | undefined = undefined;
    if (noteColIdx !== -1 && row[noteColIdx]) {
      notes = String(row[noteColIdx]).trim();
    }

    // Extract scores
    const parseScore = (colIdx: number): number | null => {
      if (colIdx === -1 || row[colIdx] === undefined || row[colIdx] === null || String(row[colIdx]).trim() === '') return null;
      const s = parseFloat(String(row[colIdx]).replace(',', '.').trim());
      return !isNaN(s) && s >= 0 && s <= 10 ? Math.round(s * 10) / 10 : null;
    };

    const scores = {
      tx1: parseScore(tx1ColIdx),
      tx2: parseScore(tx2ColIdx),
      tx3: parseScore(tx3ColIdx),
      tx4: parseScore(tx4ColIdx),
      gk: parseScore(gkColIdx),
      ck: parseScore(ckColIdx),
    };

    rows.push({
      stt,
      name: fullName,
      studentCode: code,
      gender,
      callCount,
      notes,
      scores,
      isValid: true,
      warning: isDuplicate ? 'Trùng tên trong file' : undefined,
    });
  }

  return {
    rows,
    totalParsed: rows.length,
    warnings,
    suggestedClassName,
  };
}

/**
 * High-level helper to parse File object (Excel or CSV)
 */
export async function parseExcelOrCSVFile(file: File): Promise<ExcelParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  return parseExcelWorkbook(workbook, file.name);
}

/**
 * High-level helper to parse pasted text
 */
export function parsePastedText(text: string): ExcelParseResult {
  return parsePastedNames(text);
}

/**
 * Export student list and statistics to Excel (.xlsx)
 */
export function exportClassToExcel(className: string, subject?: string, students?: any[]) {
  const stds = Array.isArray(subject) ? subject : (students || []);
  const subjName = typeof subject === 'string' ? subject : 'Toán';

  const data = stds.map((s, idx) => ({
    STT: idx + 1,
    'Mã học sinh': s.studentCode || '',
    'Họ và tên': s.name,
    'Giới tính': s.gender === 'nu' ? 'Nữ' : s.gender === 'nam' ? 'Nam' : '',
    'Số lần lên bảng': s.callCount || 0,
    'Sao thưởng ⭐': s.stars || 0,
    'Ghi chú': s.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Lớp ${className}`);
  XLSX.writeFile(workbook, `Danh_sach_lop_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export student list and statistics to CSV
 */
export function exportClassToCSV(className: string, students?: any[]) {
  const stds = students || [];
  const headers = ['STT', 'Ma_HS', 'Ho_Va_Ten', 'Gioi_Tinh', 'So_Lan_Len_Bang', 'Sao_Thuong', 'Ghi_Chu'];
  const rows = stds.map((s, idx) => [
    idx + 1,
    s.studentCode || '',
    `"${(s.name || '').replace(/"/g, '""')}"`,
    s.gender === 'nu' ? 'Nữ' : s.gender === 'nam' ? 'Nam' : '',
    s.callCount || 0,
    s.stars || 0,
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Danh_sach_lop_${className}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
