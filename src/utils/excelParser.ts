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
      classes: [],
    };
  }

  const rows: ExcelPreviewRow[] = [];
  const seenNames = new Set<string>();
  const warnings: string[] = [];
  let suggestedClassName: string | undefined = undefined;
  let suggestedSubject: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains class or subject info
    if (!suggestedClassName && /(?:lớp|lop|class)\s*:?\s*([0-9]{1,2}\s*[A-Za-z0-9]+)/i.test(line)) {
      suggestedClassName = detectClassNameFromText(line);
    }
    if (!suggestedSubject && /(?:môn|bộ\s*môn|phân\s*môn)\s*[:\-]/i.test(line)) {
      suggestedSubject = detectSubjectFromText(line);
    }

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
      norm.startsWith('monhoc') ||
      norm.startsWith('lophoc') ||
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

  const detectedClasses = [
    {
      id: `pasted-${Date.now()}`,
      className: suggestedClassName || 'Lớp Mới',
      subject: suggestedSubject,
      rows,
      warnings,
      selected: true,
    },
  ];

  return {
    rows,
    totalParsed: rows.length,
    warnings,
    suggestedClassName,
    suggestedSubject,
    classes: detectedClasses,
  };
}

// Vietnamese subjects dictionary for smart detection
const VIETNAMESE_SUBJECTS: { label: string; keywords: string[] }[] = [
  { label: 'Toán', keywords: ['toan', 'toanhoc', 'daiso', 'hinhhoc'] },
  { label: 'Ngữ văn', keywords: ['nguvan', 'van', 'tiengviet'] },
  { label: 'Tiếng Anh', keywords: ['tienganh', 'tienganhhoc', 'english', 'ngoainngu', 'anhvan'] },
  { label: 'Vật lí', keywords: ['vatli', 'vatly', 'vatlyhoc', 'vatlihoc'] },
  { label: 'Hóa học', keywords: ['hoahoc', 'hoa'] },
  { label: 'Sinh học', keywords: ['sinhhoc', 'sinh'] },
  { label: 'Lịch sử', keywords: ['lichsu', 'su'] },
  { label: 'Địa lí', keywords: ['diali', 'dialy', 'dia'] },
  { label: 'Tin học', keywords: ['tinhoc', 'tin', 'it'] },
  { label: 'Công nghệ', keywords: ['congnghe', 'kythuat'] },
  { label: 'GDCD', keywords: ['gdcd', 'giaoduccongdan', 'kinhtevaphapluat', 'gdktpl'] },
  { label: 'GDQP', keywords: ['gdqp', 'giaoducquocphong', 'gdqpan'] },
  { label: 'Âm nhạc', keywords: ['amnhac', 'nhac'] },
  { label: 'Mỹ thuật', keywords: ['mythuat', 'mithuat'] },
  { label: 'GDTC', keywords: ['gdtc', 'theduc', 'giaoducthechat'] },
  { label: 'Khoa học tự nhiên', keywords: ['khtn', 'khoahoctunhien'] },
  { label: 'Lịch sử & Địa lí', keywords: ['lichsuvadiali', 'lichsuvadialy', 'suvadia'] },
  { label: 'HĐTN', keywords: ['hdtn', 'hoatdongtrainghiem', 'huongnghiep'] },
  { label: 'Đạo đức', keywords: ['daoduc'] },
  { label: 'Tự nhiên và Xã hội', keywords: ['tunhienvaxahoi', 'tnxh'] },
];

/**
 * Smart detection of subject name from string (sheet name, header text, or file name)
 */
export function detectSubjectFromText(text: string): string | undefined {
  if (!text) return undefined;

  // 1. Explicit pattern: "Môn: Toán", "Môn học: Vật lý", "Bộ môn: Tiếng Anh"
  const explicitMatch = text.match(/(?:môn\s*học|bộ\s*môn|phân\s*môn|môn)\s*[:\-]\s*([^,\n\r\t;()_\-]+)/i);
  if (explicitMatch && explicitMatch[1]) {
    const rawSubj = explicitMatch[1].trim();
    if (rawSubj.length >= 2 && rawSubj.length <= 30) {
      // Find matching standard label or return capitalized
      const normRaw = normalizeHeader(rawSubj);
      const found = VIETNAMESE_SUBJECTS.find((s) => s.keywords.some((k) => normRaw.includes(k)));
      if (found) return found.label;
      return rawSubj.charAt(0).toUpperCase() + rawSubj.slice(1);
    }
  }

  // 2. Keyword scanning in tokens
  const norm = normalizeHeader(text);
  for (const s of VIETNAMESE_SUBJECTS) {
    for (const kw of s.keywords) {
      // Must match whole word or boundary
      const regex = new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`);
      if (regex.test(norm)) {
        return s.label;
      }
    }
  }

  return undefined;
}

/**
 * Smart detection of class name from string (e.g. "10A1", "Lớp 6A2", "12C3 - Toán")
 */
export function detectClassNameFromText(text: string): string | undefined {
  if (!text) return undefined;

  // Explicit pattern: "Lớp: 10A1" or "Lớp 7A2"
  const explicit = text.match(/(?:lớp|lop|class)\s*:?\s*([0-9]{1,2}\s*[A-Za-z0-9\-_]+)/i);
  if (explicit && explicit[1]) {
    const clean = explicit[1].replace(/\s+/g, '').toUpperCase();
    if (/^[0-9]{1,2}[A-Za-z0-9\-_]+$/.test(clean)) return clean;
  }

  // Standalone class code: e.g. "10A1", "6A", "12B3", "7A-1"
  const standalone = text.match(/(?:^|[\s_\-(])([0-9]{1,2}\s*[A-Za-z][0-9]{0,3})(?:[\s_\-).:]|$)/i);
  if (standalone && standalone[1]) {
    return standalone[1].replace(/\s+/g, '').toUpperCase();
  }

  return undefined;
}

/**
 * Universal Excel Parser compatible with standard files and official vnEdu / SMAS templates
 */
export function parseExcelWorkbook(workbook: XLSX.WorkBook, fileName = ''): ExcelParseResult {
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    return { rows: [], totalParsed: 0, warnings: ['File Excel không có trang tính nào (Sheet).'] };
  }

  const detectedClasses: import('../types').ParsedClassData[] = [];
  const allWarnings: string[] = [];

  // Parse each sheet in workbook
  for (let sIdx = 0; sIdx < sheetNames.length; sIdx++) {
    const sheetName = sheetNames[sIdx];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawData || rawData.length === 0) continue;

    // Detect class and subject from sheet name and top rows
    let sheetClassName = detectClassNameFromText(sheetName);
    let sheetSubject = detectSubjectFromText(sheetName);

    // If not found in sheet name, scan top rows
    if (!sheetClassName || !sheetSubject) {
      for (let r = 0; r < Math.min(8, rawData.length); r++) {
        const rowStr = (rawData[r] || []).join(' ');
        if (!sheetClassName) {
          sheetClassName = detectClassNameFromText(rowStr);
        }
        if (!sheetSubject) {
          sheetSubject = detectSubjectFromText(rowStr);
        }
        if (sheetClassName && sheetSubject) break;
      }
    }

    // Fallback class name from file name or sheet index
    if (!sheetClassName) {
      sheetClassName = detectClassNameFromText(fileName) || sheetName;
    }
    if (!sheetSubject) {
      sheetSubject = detectSubjectFromText(fileName);
    }

    // Look for header rows and column mapping
    let headerRowIdx = -1;
    let nameColIdx = -1;
    let hoColIdx = -1;
    let tenColIdx = -1;
    let sttColIdx = -1;
    let codeColIdx = -1;
    let genderColIdx = -1;
    let callCountColIdx = -1;
    let noteColIdx = -1;
    let classColIdx = -1;
    let subjectColIdx = -1;
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
        if (val === 'lop' || val === 'tenlop' || val === 'lophoc' || val === 'class') {
          classColIdx = c;
        }
        if (val === 'mon' || val === 'monhoc' || val === 'subject' || val === 'phanmon') {
          subjectColIdx = c;
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
        if (val === 'gk' || val === 'giuaky' || val === 'ddggk' || val.includes('giuaky')) {
          gkColIdx = c;
        }
        if (val === 'ck' || val === 'cuoiky' || val === 'ddgck' || val.includes('cuoiky')) {
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
      } else {
        nameColIdx = 1;
        headerRowIdx = 0;
      }
    }

    // Temporary container for rows in this sheet (either all together or partitioned by class column)
    const sheetRows: { row: ExcelPreviewRow; className: string; subject?: string }[] = [];
    const seenNames = new Set<string>();

    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!Array.isArray(row) || row.every((c) => !c || String(c).trim() === '')) {
        continue;
      }

      let fullName = '';
      if (hoColIdx !== -1 && tenColIdx !== -1) {
        const ho = String(row[hoColIdx] || '').trim();
        const ten = String(row[tenColIdx] || '').trim();
        fullName = `${ho} ${ten}`.trim();
      } else if (nameColIdx !== -1) {
        const colVal = String(row[nameColIdx] || '').trim();
        const nextColVal = String(row[nameColIdx + 1] || '').trim();

        if (
          nextColVal &&
          !/\d/.test(nextColVal) &&
          nextColVal.split(/\s+/).length === 1 &&
          nextColVal.length <= 15 &&
          (nameColIdx + 1 !== tx1ColIdx && nameColIdx + 1 !== codeColIdx && nameColIdx + 1 !== genderColIdx && nameColIdx + 1 !== classColIdx)
        ) {
          fullName = `${colVal} ${nextColVal}`.trim();
        } else {
          fullName = colVal;
        }
      }

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

      // Check student code
      let code: string | undefined = undefined;
      if (codeColIdx !== -1 && row[codeColIdx]) {
        code = String(row[codeColIdx]).trim();
      }

      // Check gender
      let gender: 'nam' | 'nu' | 'khac' | undefined = undefined;
      if (genderColIdx !== -1 && row[genderColIdx]) {
        const gNorm = normalizeHeader(String(row[genderColIdx]));
        if (gNorm.includes('nu') || gNorm === 'f' || gNorm === 'female' || gNorm === 'x') {
          gender = 'nu';
        } else if (gNorm.includes('nam') || gNorm === 'm' || gNorm === 'male') {
          gender = 'nam';
        }
      }

      // Row-level class and subject if column exists
      let rowClassName = sheetClassName;
      if (classColIdx !== -1 && row[classColIdx]) {
        const valClass = String(row[classColIdx]).trim();
        if (valClass && valClass.length <= 20 && !valClass.toLowerCase().includes('lớp')) {
          rowClassName = valClass.toUpperCase();
        } else if (valClass) {
          rowClassName = detectClassNameFromText(valClass) || valClass;
        }
      }

      let rowSubject = sheetSubject;
      if (subjectColIdx !== -1 && row[subjectColIdx]) {
        const valSubj = String(row[subjectColIdx]).trim();
        if (valSubj) {
          rowSubject = detectSubjectFromText(valSubj) || valSubj;
        }
      }

      const isDuplicate = seenNames.has(`${rowClassName}_${fullName.toLowerCase()}`);
      seenNames.add(`${rowClassName}_${fullName.toLowerCase()}`);

      let stt = sheetRows.length + 1;
      if (sttColIdx !== -1 && row[sttColIdx] && /^\d+$/.test(String(row[sttColIdx]).trim())) {
        stt = parseInt(String(row[sttColIdx]).trim(), 10);
      }

      let callCount = 0;
      if (callCountColIdx !== -1 && row[callCountColIdx]) {
        const parsedCalls = parseInt(String(row[callCountColIdx]).trim(), 10);
        if (!isNaN(parsedCalls) && parsedCalls >= 0) {
          callCount = parsedCalls;
        }
      }

      let notes: string | undefined = undefined;
      if (noteColIdx !== -1 && row[noteColIdx]) {
        notes = String(row[noteColIdx]).trim();
      }

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

      sheetRows.push({
        row: {
          stt,
          name: fullName,
          studentCode: code,
          gender,
          callCount,
          notes,
          scores,
          isValid: true,
          warning: isDuplicate ? 'Trùng tên' : undefined,
        },
        className: rowClassName || `Lớp ${sIdx + 1}`,
        subject: rowSubject,
      });
    }

    if (sheetRows.length === 0) continue;

    // Group rows in this sheet by className
    const classGroups = new Map<string, { subject?: string; rows: ExcelPreviewRow[] }>();
    for (const item of sheetRows) {
      const clsKey = item.className;
      if (!classGroups.has(clsKey)) {
        classGroups.set(clsKey, { subject: item.subject, rows: [] });
      }
      const grp = classGroups.get(clsKey)!;
      grp.rows.push({
        ...item.row,
        stt: grp.rows.length + 1, // normalize STT per class
      });
    }

    classGroups.forEach((grp, clsName) => {
      detectedClasses.push({
        id: `cls-parsed-${sIdx}-${detectedClasses.length}-${Date.now()}`,
        sheetName,
        className: clsName,
        subject: grp.subject,
        rows: grp.rows,
        warnings: [],
        selected: true,
      });
    });
  }

  if (detectedClasses.length === 0) {
    return {
      rows: [],
      totalParsed: 0,
      warnings: ['Không tìm thấy dữ liệu học sinh hợp lệ trong các trang tính của file Excel.'],
      classes: [],
    };
  }

  // Summary message
  if (detectedClasses.length > 1) {
    allWarnings.push(
      `Đã tìm thấy ${detectedClasses.length} lớp học trong file (${detectedClasses.map((c) => c.className + (c.subject ? ` - ${c.subject}` : '')).join(', ')}).`
    );
  }

  return {
    rows: detectedClasses[0].rows,
    totalParsed: detectedClasses.reduce((sum, c) => sum + c.rows.length, 0),
    warnings: allWarnings,
    suggestedClassName: detectedClasses[0].className,
    suggestedSubject: detectedClasses[0].subject,
    classes: detectedClasses,
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
