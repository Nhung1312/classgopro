import { jsPDF } from 'jspdf';
import { getCardMatrix6x6 } from './arucoService';
import type { ResponseCardMapping, CardPrintLayout } from '../types/responseCardTypes';

const removeVietnameseTones = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

export function buildResponseCardPdf(cardsToPrint: ResponseCardMapping[], className: string, layout: CardPrintLayout, showStudentName = false) {
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
        doc.text(`LOP: ${removeVietnameseTones(className).toUpperCase()}`, x + 6, y + (layout === '2' ? 12 : 9));

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


  return doc;
}
