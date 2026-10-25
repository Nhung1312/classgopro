import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Filter,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ClassRoom } from '../../types';
import { CardPrintLayout, ResponseCardMapping } from '../../types/responseCardTypes';
import { getOrInitClassCardConfig } from '../../services/responseCardStorage';
import { getCardMarkerSVG, getCardMatrix6x6 } from '../../services/arucoService';

interface CardPrintSheetProps {
  currentClass: ClassRoom;
  onUpdateCardId?: (studentId: string, newCardId: number) => void;
}

function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export const CardPrintSheet: React.FC<CardPrintSheetProps> = ({ currentClass }) => {
  const [layout, setLayout] = useState<CardPrintLayout>('4');
  const [filterMode, setFilterMode] = useState<'all' | 'students_only' | 'single'>('all');
  const [selectedCardId, setSelectedCardId] = useState<number>(1);
  const [spareCount, setSpareCount] = useState<number>(5);
  const [showStudentName, setShowStudentName] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Load config & stable mappings including spare cards
  const cardConfig = useMemo(() => {
    return getOrInitClassCardConfig(currentClass, spareCount);
  }, [currentClass, spareCount]);

  const cardsToPrint: ResponseCardMapping[] = useMemo(() => {
    if (filterMode === 'single') {
      const match = cardConfig.mappings.find((m) => m.cardId === selectedCardId);
      return match ? [match] : cardConfig.mappings.slice(0, 1);
    }
    if (filterMode === 'students_only') {
      return cardConfig.mappings.filter((m) => !m.isSpare);
    }
    return cardConfig.mappings;
  }, [cardConfig, filterMode, selectedCardId]);

  // Handle Native Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export to PDF via jsPDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      let cols = 2;
      let rows = 2;
      if (layout === '2') {
        cols = 1;
        rows = 2;
      } else if (layout === '6') {
        cols = 2;
        rows = 3;
      }

      const cardWidth = printableWidth / cols;
      const cardHeight = printableHeight / rows;
      const cardsPerPage = cols * rows;

      cardsToPrint.forEach((card, index) => {
        if (index > 0 && index % cardsPerPage === 0) {
          doc.addPage();
        }

        const pageSlotIndex = index % cardsPerPage;
        const col = pageSlotIndex % cols;
        const row = Math.floor(pageSlotIndex / cols);

        const x = margin + col * cardWidth;
        const y = margin + row * cardHeight;

        // Draw card border (dashed cutting line)
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(x + 2, y + 2, cardWidth - 4, cardHeight - 4);
        doc.setLineDashPattern([], 0); // reset line dash

        const padNum = String(card.cardId).padStart(3, '0');
        const cardTitle = card.isSpare ? `THE DU PHONG ${padNum}` : `THE SO: ${padNum}`;

        // Draw Card Header info: Lớp + Số thẻ (Không in tên học sinh theo quy chuẩn dùng chung)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(layout === '2' ? 14 : layout === '4' ? 11 : 9);
        doc.setTextColor(0, 0, 0);
        doc.text(`LOP: ${removeVietnameseTones(currentClass.name).toUpperCase()}`, x + 6, y + (layout === '2' ? 12 : 9));

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(layout === '2' ? 13 : layout === '4' ? 10 : 8.5);
        doc.text(cardTitle, x + cardWidth - 6, y + (layout === '2' ? 12 : 9), { align: 'right' });

        if (showStudentName && !card.isSpare && card.studentName) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(layout === '2' ? 9 : 7.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`HS: ${removeVietnameseTones(card.studentName)}`, x + 6, y + (layout === '2' ? 17 : 13));
        }

        // Draw Marker in Center
        const markerSize = layout === '2' ? 95 : layout === '4' ? 58 : 42;
        const markerX = x + (cardWidth - markerSize) / 2;
        const markerY = y + (cardHeight - markerSize) / 2 + (layout === '2' ? 5 : 3);

        const matrix = getCardMatrix6x6(card.cardId);
        const cellSize = markerSize / 6;

        doc.setFillColor(0, 0, 0);
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            if (matrix[r][c]) {
              doc.rect(markerX + c * cellSize, markerY + r * cellSize, cellSize + 0.1, cellSize + 0.1, 'F');
            }
          }
        }

        // Draw A, B, C, D Labels around marker
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

        // Letter A at Top
        doc.setFontSize(layout === '2' ? 24 : layout === '4' ? 18 : 14);
        doc.text('A', markerX + markerSize / 2, markerY - 3, { align: 'center' });

        // Letter C at Bottom
        doc.text('C', markerX + markerSize / 2, markerY + markerSize + (layout === '2' ? 9 : 7), { align: 'center' });

        // Letter D at Left
        doc.text('D', markerX - (layout === '2' ? 5 : 3), markerY + markerSize / 2 + (layout === '2' ? 4 : 3), { align: 'right' });

        // Letter B at Right
        doc.text('B', markerX + markerSize + (layout === '2' ? 5 : 3), markerY + markerSize / 2 + (layout === '2' ? 4 : 3), { align: 'left' });

        // Bottom instruction tip
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(layout === '2' ? 8 : 7);
        doc.setTextColor(100, 100, 100);
        doc.text('Xoay canh co chu muon chon len tren cung', x + cardWidth / 2, y + cardHeight - 4, { align: 'center' });
      });

      doc.save(`Bo_The_Tra_Loi_Lop_${currentClass.name.replace(/\s+/g, '_')}_A4.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const studentCount = currentClass.students.length;
  const actualSpareCount = cardConfig.mappings.filter((m) => m.isSpare).length;

  return (
    <div className="space-y-5">
      {/* Print Control Toolbar - Hidden when printing */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-400" />
              <span>BỘ THẺ TRẢ LỜI DÙNG CHUNG – LỚP {currentClass.name.toUpperCase()}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bộ thẻ thuộc về lớp, sử dụng chung cho <strong>tất cả các môn học</strong> (Toán, Ngữ văn, Tiếng Anh, KHTN, GDĐP, HĐTN...). Đánh số từ <strong>001</strong> kèm thẻ dự phòng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-102 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay (A4)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Xuất File PDF'}</span>
            </button>
          </div>
        </div>

        {/* Layout & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Card Layout per A4 page */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-semibold">Bố cục in trên trang A4:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setLayout('4')}
                className={`py-2 px-1.5 rounded-xl font-bold border transition-all text-center ${
                  layout === '4'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>4 thẻ/A4</div>
                <div className="text-[9px] font-normal text-slate-400">Chuẩn A6</div>
              </button>

              <button
                type="button"
                onClick={() => setLayout('2')}
                className={`py-2 px-1.5 rounded-xl font-bold border transition-all text-center ${
                  layout === '2'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>2 thẻ/A4</div>
                <div className="text-[9px] font-normal text-slate-400">Cỡ lớn A5</div>
              </button>

              <button
                type="button"
                onClick={() => setLayout('6')}
                className={`py-2 px-1.5 rounded-xl font-bold border transition-all text-center ${
                  layout === '6'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>6 thẻ/A4</div>
                <div className="text-[9px] font-normal text-slate-400">Tiết kiệm</div>
              </button>
            </div>
          </div>

          {/* Scope selection: All, Students only, or single card */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-slate-400 font-semibold">Phạm vi in thẻ:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                  filterMode === 'all'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>Trọn bộ ({cardConfig.mappings.length})</div>
                <div className="text-[9px] font-normal text-slate-200">Kèm {actualSpareCount} dự phòng</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('students_only')}
                className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                  filterMode === 'students_only'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>Chỉ học sinh ({studentCount})</div>
                <div className="text-[9px] font-normal text-slate-400">Thẻ 001 - {String(studentCount).padStart(3, '0')}</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('single');
                  if (!selectedCardId && cardConfig.mappings.length > 0) {
                    setSelectedCardId(cardConfig.mappings[0].cardId);
                  }
                }}
                className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                  filterMode === 'single'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>In bổ sung thẻ mất</div>
                <div className="text-[9px] font-normal text-slate-400">In lại 1 thẻ lẻ</div>
              </button>
            </div>
          </div>

          {/* Spare count & optional name toggle */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-semibold">Tùy chọn in:</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Thẻ dự phòng:</label>
                <select
                  value={spareCount}
                  onChange={(e) => setSpareCount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-amber-500 text-xs"
                >
                  <option value={0}>0 thẻ</option>
                  <option value={2}>+2 thẻ dự phòng</option>
                  <option value={5}>+5 thẻ dự phòng</option>
                  <option value={10}>+10 thẻ dự phòng</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Tên học sinh:</label>
                <button
                  type="button"
                  onClick={() => setShowStudentName(!showStudentName)}
                  className={`w-full py-1.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                    showStudentName
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Theo quy chuẩn dùng chung nhiều môn, trên thẻ không cần in tên học sinh"
                >
                  {showStudentName ? 'Có hiện tên' : 'Ẩn tên (Chuẩn)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* If single card mode: dropdown to pick specific card ID */}
        {filterMode === 'single' && (
          <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl flex items-center gap-3 animate-in fade-in text-xs">
            <span className="font-bold text-slate-300 shrink-0">Chọn số thẻ cần in bổ sung:</span>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-500 text-xs flex-1 max-w-xs"
            >
              {cardConfig.mappings.map((m) => (
                <option key={m.cardId} value={m.cardId}>
                  Thẻ #{String(m.cardId).padStart(3, '0')} {m.isSpare ? '(Thẻ Dự Phòng)' : `- ${m.studentName}${m.studentCode ? ` (${m.studentCode})` : ''}`}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400">
              Chỉ in lại duy nhất thẻ này để bù cho học sinh bị mất hoặc rách thẻ.
            </span>
          </div>
        )}

        {/* User Guide Card */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <div>
              <strong>Quy chuẩn bộ thẻ dùng chung:</strong> Mỗi lớp có một bộ thẻ đánh số từ <strong>001</strong> đến sĩ số lớp ({studentCount}) và thẻ dự phòng ({actualSpareCount}).
              Trên thẻ in <strong>Tên lớp ({currentClass.name})</strong>, <strong>Số thẻ</strong>, <strong>mã ArUco</strong> và <strong>4 đáp án A, B, C, D</strong> ở 4 cạnh.
            </div>
            <div className="text-[11px] text-slate-400">
              Bộ thẻ để tại phòng học của lớp, dùng chung cho tất cả các giáo viên bộ môn dạy lớp đó mà không cần in lại thẻ mới.
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE SHEET CONTAINER */}
      <div className="bg-slate-950 p-2 sm:p-6 rounded-3xl border border-slate-800">
        <div className="text-xs font-bold uppercase text-slate-400 mb-3 px-1 flex items-center justify-between no-print">
          <span>Xem trước bản in ({cardsToPrint.length} thẻ):</span>
          <span>Khổ giấy A4 tiêu chuẩn</span>
        </div>

        {/* Printable Grid */}
        <div
          id="classgo-printable-cards-container"
          className={`grid gap-4 sm:gap-6 ${
            layout === '2'
              ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-1 print:gap-8'
              : layout === '6'
              ? 'grid-cols-2 md:grid-cols-3 print:grid-cols-2 print:gap-3'
              : 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2 print:gap-4'
          }`}
        >
          {cardsToPrint.map((mapping) => {
            const matrix = getCardMatrix6x6(mapping.cardId);
            const padId = String(mapping.cardId).padStart(3, '0');

            return (
              <div
                key={mapping.studentId}
                className="bg-white text-black rounded-2xl p-4 sm:p-6 shadow-md border-2 border-dashed border-slate-300 relative flex flex-col items-center justify-between print:border-slate-400 print:shadow-none print:break-inside-avoid print:p-4"
                style={{
                  minHeight: layout === '2' ? '420px' : layout === '4' ? '320px' : '260px',
                }}
              >
                {/* TOP HEADER: Lớp + Số Thẻ (Theo đúng quy chuẩn dùng chung, không in tên học sinh) */}
                <div className="w-full flex items-center justify-between border-b-2 border-black/10 pb-2 mb-2">
                  <div className="text-left">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-black block">
                      LỚP: {currentClass.name}
                    </span>
                    {showStudentName && !mapping.isSpare && (
                      <span className="text-xs font-bold text-slate-700 block truncate max-w-[160px]">
                        HS: {mapping.studentName}
                      </span>
                    )}
                    {mapping.isSpare && (
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">
                        DỰ PHÒNG
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 rounded-xl bg-black text-white font-black text-base sm:text-lg tracking-tight">
                      THẺ {padId}
                    </div>
                  </div>
                </div>

                {/* LETTER A (TOP) */}
                <div className="w-full text-center font-black text-2xl sm:text-3xl text-black py-1 tracking-wider flex items-center justify-center gap-1">
                  <span>▲ A ▲</span>
                </div>

                {/* MIDDLE ROW: D (Left) - ArUco Marker - B (Right) */}
                <div className="w-full flex items-center justify-between gap-2 my-1">
                  {/* Letter D on Left */}
                  <div className="font-black text-2xl sm:text-3xl text-black px-1 select-none flex flex-col items-center">
                    <span>◄</span>
                    <span>D</span>
                  </div>

                  {/* High Contrast 6x6 ArUco Marker */}
                  <div
                    className="p-1 bg-black rounded-md flex-shrink-0"
                    style={{
                      width: layout === '2' ? '220px' : layout === '4' ? '160px' : '130px',
                      height: layout === '2' ? '220px' : layout === '4' ? '160px' : '130px',
                    }}
                  >
                    <div className="w-full h-full grid grid-cols-6 grid-rows-6 bg-white gap-0">
                      {matrix.map((row, rIdx) =>
                        row.map((isBlack, cIdx) => (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={isBlack ? 'bg-black' : 'bg-white'}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Letter B on Right */}
                  <div className="font-black text-2xl sm:text-3xl text-black px-1 select-none flex flex-col items-center">
                    <span>B</span>
                    <span>►</span>
                  </div>
                </div>

                {/* LETTER C (BOTTOM) */}
                <div className="w-full text-center font-black text-2xl sm:text-3xl text-black py-1 tracking-wider flex items-center justify-center gap-1">
                  <span>▼ C ▼</span>
                </div>

                {/* Card Footer Guide */}
                <div className="w-full text-center border-t border-black/10 pt-1 mt-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 block">
                    Giơ đáp án muốn chọn lên TRÊN CÙNG • ClassGo Smart Card
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
