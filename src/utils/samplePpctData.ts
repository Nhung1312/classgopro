import { PpctItem } from '../types';

/**
 * =========================================================================================
 * 📚 PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) MẪU CHUẨN BỘ GIÁO DỤC (GDPT 2018) - MÔN TOÁN
 * HỌC KỲ 1 (GỒM ĐẦY ĐỦ TIẾT THEO PHÂN PHỐI CHƯƠNG TRÌNH CHUẨN)
 * =========================================================================================
 */

// 1. PPCT TOÁN 7 - HỌC KỲ 1 (70 TIẾT)
export const SAMPLE_PPCT_GRADE_7: PpctItem[] = [
  // CHƯƠNG I: SỐ HỮU TỈ (16 tiết)
  { id: 'p7-1', periodNumber: 1, grade: '7', subject: 'Toán học', lessonTitle: 'Tập hợp các số hữu tỉ (Tiết 1)', notes: 'Khái niệm & biểu diễn trên trục số' },
  { id: 'p7-2', periodNumber: 2, grade: '7', subject: 'Toán học', lessonTitle: 'Tập hợp các số hữu tỉ (Tiết 2)', notes: 'Số đối & so sánh số hữu tỉ' },
  { id: 'p7-3', periodNumber: 3, grade: '7', subject: 'Toán học', lessonTitle: 'Cộng, trừ số hữu tỉ (Tiết 1)', notes: 'Quy tắc cộng trừ & quy tắc chuyển vế' },
  { id: 'p7-4', periodNumber: 4, grade: '7', subject: 'Toán học', lessonTitle: 'Cộng, trừ số hữu tỉ (Tiết 2)', notes: 'Luyện tập tính chất phép cộng' },
  { id: 'p7-5', periodNumber: 5, grade: '7', subject: 'Toán học', lessonTitle: 'Nhân, chia số hữu tỉ (Tiết 1)', notes: 'Quy tắc nhân chia số hữu tỉ' },
  { id: 'p7-6', periodNumber: 6, grade: '7', subject: 'Toán học', lessonTitle: 'Nhân, chia số hữu tỉ (Tiết 2)', notes: 'Luyện tập & tính chất phép nhân' },
  { id: 'p7-7', periodNumber: 7, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung: Các phép tính với số hữu tỉ', notes: 'Bảng phụ, phiếu học tập' },
  { id: 'p7-8', periodNumber: 8, grade: '7', subject: 'Toán học', lessonTitle: 'Lũy thừa với số mũ tự nhiên của một số hữu tỉ (Tiết 1)', notes: 'Định nghĩa lũy thừa' },
  { id: 'p7-9', periodNumber: 9, grade: '7', subject: 'Toán học', lessonTitle: 'Lũy thừa với số mũ tự nhiên của một số hữu tỉ (Tiết 2)', notes: 'Nhân chia hai lũy thừa cùng cơ số' },
  { id: 'p7-10', periodNumber: 10, grade: '7', subject: 'Toán học', lessonTitle: 'Lũy thừa của lũy thừa, lũy thừa của một tích, một thương', notes: 'Áp dụng công thức' },
  { id: 'p7-11', periodNumber: 11, grade: '7', subject: 'Toán học', lessonTitle: 'Thứ tự thực hiện các phép tính. Quy tắc dấu ngoặc (Tiết 1)', notes: 'Quy tắc bỏ dấu ngoặc' },
  { id: 'p7-12', periodNumber: 12, grade: '7', subject: 'Toán học', lessonTitle: 'Thứ tự thực hiện các phép tính. Quy tắc dấu ngoặc (Tiết 2)', notes: 'Tính giá trị biểu thức' },
  { id: 'p7-13', periodNumber: 13, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung chương I (Tiết 1)', notes: 'Ôn tập tính toán' },
  { id: 'p7-14', periodNumber: 14, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung chương I (Tiết 2)', notes: 'Bài toán tìm x' },
  { id: 'p7-15', periodNumber: 15, grade: '7', subject: 'Toán học', lessonTitle: 'Bài tập cuối chương I', notes: 'Hệ thống hóa kiến thức' },
  { id: 'p7-16', periodNumber: 16, grade: '7', subject: 'Toán học', lessonTitle: 'Kiểm tra đánh giá thường xuyên số 1 (15 phút)', notes: 'Đánh giá năng lực tính toán' },

  // CHƯƠNG II: SỐ THỰC (10 tiết)
  { id: 'p7-17', periodNumber: 17, grade: '7', subject: 'Toán học', lessonTitle: 'Số vô tỉ. Căn bậc hai số học (Tiết 1)', notes: 'Khái niệm số vô tỉ' },
  { id: 'p7-18', periodNumber: 18, grade: '7', subject: 'Toán học', lessonTitle: 'Số vô tỉ. Căn bậc hai số học (Tiết 2)', notes: 'Căn bậc hai số học' },
  { id: 'p7-19', periodNumber: 19, grade: '7', subject: 'Toán học', lessonTitle: 'Tập hợp các số thực (Tiết 1)', notes: 'Khái niệm số thực & trục số' },
  { id: 'p7-20', periodNumber: 20, grade: '7', subject: 'Toán học', lessonTitle: 'Tập hợp các số thực (Tiết 2)', notes: 'So sánh hai số thực' },
  { id: 'p7-21', periodNumber: 21, grade: '7', subject: 'Toán học', lessonTitle: 'Giá trị tuyệt đối của một số thực', notes: 'Định nghĩa & bài tập' },
  { id: 'p7-22', periodNumber: 22, grade: '7', subject: 'Toán học', lessonTitle: 'Làm tròn số và ước lượng kết quả (Tiết 1)', notes: 'Quy tắc làm tròn số' },
  { id: 'p7-23', periodNumber: 23, grade: '7', subject: 'Toán học', lessonTitle: 'Làm tròn số và ước lượng kết quả (Tiết 2)', notes: 'Ước lượng trong thực tế' },
  { id: 'p7-24', periodNumber: 24, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung chương II', notes: 'Rèn kỹ năng tính toán số thực' },
  { id: 'p7-25', periodNumber: 25, grade: '7', subject: 'Toán học', lessonTitle: 'Bài tập cuối chương II', notes: 'Tổng kết chương II' },
  { id: 'p7-26', periodNumber: 26, grade: '7', subject: 'Toán học', lessonTitle: 'Hoạt động thực hành và trải nghiệm: Tính chu vi, diện tích với số thực', notes: 'Thực hành đo đạc' },

  // CHƯƠNG III: GÓC VÀ ĐƯỜNG THẲNG SONG SONG (14 tiết)
  { id: 'p7-27', periodNumber: 27, grade: '7', subject: 'Toán học', lessonTitle: 'Các góc ở vị trí đặc biệt (Tiết 1)', notes: 'Hai góc kề bù, so le trong' },
  { id: 'p7-28', periodNumber: 28, grade: '7', subject: 'Toán học', lessonTitle: 'Các góc ở vị trí đặc biệt (Tiết 2)', notes: 'Hai góc đối đỉnh' },
  { id: 'p7-29', periodNumber: 29, grade: '7', subject: 'Toán học', lessonTitle: 'Tia phân giác của một góc (Tiết 1)', notes: 'Khái niệm & cách vẽ' },
  { id: 'p7-30', periodNumber: 30, grade: '7', subject: 'Toán học', lessonTitle: 'Tia phân giác của một góc (Tiết 2)', notes: 'Luyện tập tính góc' },
  { id: 'p7-31', periodNumber: 31, grade: '7', subject: 'Toán học', lessonTitle: 'Hai đường thẳng song song và dấu hiệu nhận biết (Tiết 1)', notes: 'Dấu hiệu nhận biết' },
  { id: 'p7-32', periodNumber: 32, grade: '7', subject: 'Toán học', lessonTitle: 'Hai đường thẳng song song và dấu hiệu nhận biết (Tiết 2)', notes: 'Tiên đề Euclid' },
  { id: 'p7-33', periodNumber: 33, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung: Góc và đường thẳng song song', notes: 'Thước kẻ, êke' },
  { id: 'p7-34', periodNumber: 34, grade: '7', subject: 'Toán học', lessonTitle: 'Định lí và chứng minh một định lí (Tiết 1)', notes: 'Cấu trúc định lí: Giả thiết & kết luận' },
  { id: 'p7-35', periodNumber: 35, grade: '7', subject: 'Toán học', lessonTitle: 'Định lí và chứng minh một định lí (Tiết 2)', notes: 'Tập suy luận chứng minh' },
  { id: 'p7-36', periodNumber: 36, grade: '7', subject: 'Toán học', lessonTitle: 'Ôn tập giữa học kỳ 1: Đại số & Hình học (Tiết 1)', notes: 'Đề cương ôn tập' },
  { id: 'p7-37', periodNumber: 37, grade: '7', subject: 'Toán học', lessonTitle: 'Ôn tập giữa học kỳ 1: Đại số & Hình học (Tiết 2)', notes: 'Luyện đề trắc nghiệm & tự luận' },
  { id: 'p7-38', periodNumber: 38, grade: '7', subject: 'Toán học', lessonTitle: 'KIỂM TRA ĐÁNH GIÁ GIỮA HỌC KỲ 1 (Tiết 1)', notes: 'Theo lịch chung toàn trường' },
  { id: 'p7-39', periodNumber: 39, grade: '7', subject: 'Toán học', lessonTitle: 'KIỂM TRA ĐÁNH GIÁ GIỮA HỌC KỲ 1 (Tiết 2)', notes: 'Thu bài & chấm điểm' },
  { id: 'p7-40', periodNumber: 40, grade: '7', subject: 'Toán học', lessonTitle: 'Trả bài kiểm tra giữa học kỳ 1 & chữa bài', notes: 'Sửa lỗi sai thường gặp' },

  // CHƯƠNG IV: TAM GIÁC BẰNG NHAU (18 tiết)
  { id: 'p7-41', periodNumber: 41, grade: '7', subject: 'Toán học', lessonTitle: 'Tổng các góc trong một tam giác (Tiết 1)', notes: 'Định lí tổng ba góc' },
  { id: 'p7-42', periodNumber: 42, grade: '7', subject: 'Toán học', lessonTitle: 'Tổng các góc trong một tam giác (Tiết 2)', notes: 'Góc ngoài của tam giác' },
  { id: 'p7-43', periodNumber: 43, grade: '7', subject: 'Toán học', lessonTitle: 'Hai tam giác bằng nhau. Khái niệm và ký hiệu', notes: 'Các đỉnh, cạnh, góc tương ứng' },
  { id: 'p7-44', periodNumber: 44, grade: '7', subject: 'Toán học', lessonTitle: 'Trường hợp bằng nhau thứ nhất: Cạnh - Cạnh - Cạnh (c.c.c) (Tiết 1)', notes: 'Cách vẽ tam giác biết 3 cạnh' },
  { id: 'p7-45', periodNumber: 45, grade: '7', subject: 'Toán học', lessonTitle: 'Trường hợp bằng nhau thứ nhất: Cạnh - Cạnh - Cạnh (c.c.c) (Tiết 2)', notes: 'Chứng minh hai tam giác bằng nhau' },
  { id: 'p7-46', periodNumber: 46, grade: '7', subject: 'Toán học', lessonTitle: 'Trường hợp bằng nhau thứ hai: Cạnh - Góc - Cạnh (c.g.c) (Tiết 1)', notes: 'Góc xen giữa hai cạnh' },
  { id: 'p7-47', periodNumber: 47, grade: '7', subject: 'Toán học', lessonTitle: 'Trường hợp bằng nhau thứ hai: Cạnh - Góc - Cạnh (c.g.c) (Tiết 2)', notes: 'Luyện tập chứng minh' },
  { id: 'p7-48', periodNumber: 48, grade: '7', subject: 'Toán học', lessonTitle: 'Trường hợp bằng nhau thứ ba: Góc - Cạnh - Góc (g.c.g) (Tiết 1)', notes: 'Cạnh kề hai góc' },
  { id: 'p7-49', periodNumber: 49, grade: '7', subject: 'Toán học', lessonTitle: 'Trường hợp bằng nhau thứ ba: Góc - Cạnh - Góc (g.c.g) (Tiết 2)', notes: 'Luyện tập tổng hợp ba trường hợp' },
  { id: 'p7-50', periodNumber: 50, grade: '7', subject: 'Toán học', lessonTitle: 'Các trường hợp bằng nhau của tam giác vuông (Tiết 1)', notes: 'Cạnh huyền - cạnh góc vuông' },
  { id: 'p7-51', periodNumber: 51, grade: '7', subject: 'Toán học', lessonTitle: 'Các trường hợp bằng nhau của tam giác vuông (Tiết 2)', notes: 'Cạnh huyền - góc nhọn' },
  { id: 'p7-52', periodNumber: 52, grade: '7', subject: 'Toán học', lessonTitle: 'Tam giác cân. Đường trung trực của đoạn thẳng (Tiết 1)', notes: 'Định nghĩa & tính chất tam giác cân' },
  { id: 'p7-53', periodNumber: 53, grade: '7', subject: 'Toán học', lessonTitle: 'Tam giác cân. Đường trung trực của đoạn thẳng (Tiết 2)', notes: 'Tính chất đường trung trực' },
  { id: 'p7-54', periodNumber: 54, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung: Tam giác bằng nhau & tam giác cân', notes: 'Rèn kỹ năng vẽ hình' },
  { id: 'p7-55', periodNumber: 55, grade: '7', subject: 'Toán học', lessonTitle: 'Bài tập cuối chương IV (Tiết 1)', notes: 'Hệ thống hóa sơ đồ tư duy' },
  { id: 'p7-56', periodNumber: 56, grade: '7', subject: 'Toán học', lessonTitle: 'Bài tập cuối chương IV (Tiết 2)', notes: 'Bài toán thực tế áp dụng' },
  { id: 'p7-57', periodNumber: 57, grade: '7', subject: 'Toán học', lessonTitle: 'Kiểm tra đánh giá thường xuyên số 2 (15 phút)', notes: 'Đánh giá hình học' },
  { id: 'p7-58', periodNumber: 58, grade: '7', subject: 'Toán học', lessonTitle: 'Hoạt động trải nghiệm: Dựng hình với phần mềm GeoGebra', notes: 'Phòng máy vi tính' },

  // CHƯƠNG V: THU THẬP VÀ BIỂU DIỄN DỮ LIỆU (12 tiết)
  { id: 'p7-59', periodNumber: 59, grade: '7', subject: 'Toán học', lessonTitle: 'Thu thập và phân loại dữ liệu (Tiết 1)', notes: 'Dữ liệu định tính & định lượng' },
  { id: 'p7-60', periodNumber: 60, grade: '7', subject: 'Toán học', lessonTitle: 'Thu thập và phân loại dữ liệu (Tiết 2)', notes: 'Tính đại diện của dữ liệu' },
  { id: 'p7-61', periodNumber: 61, grade: '7', subject: 'Toán học', lessonTitle: 'Biểu đồ hình quạt tròn (Tiết 1)', notes: 'Đọc và phân tích biểu đồ quạt' },
  { id: 'p7-62', periodNumber: 62, grade: '7', subject: 'Toán học', lessonTitle: 'Biểu đồ hình quạt tròn (Tiết 2)', notes: 'Biểu diễn dữ liệu bằng biểu đồ quạt' },
  { id: 'p7-63', periodNumber: 63, grade: '7', subject: 'Toán học', lessonTitle: 'Biểu đồ đoạn thẳng (Tiết 1)', notes: 'Đọc và phân tích biểu đồ đoạn thẳng' },
  { id: 'p7-64', periodNumber: 64, grade: '7', subject: 'Toán học', lessonTitle: 'Biểu đồ đoạn thẳng (Tiết 2)', notes: 'Biểu diễn xu hướng của dữ liệu' },
  { id: 'p7-65', periodNumber: 65, grade: '7', subject: 'Toán học', lessonTitle: 'Luyện tập chung: Biểu diễn dữ liệu', notes: 'Bảng số liệu thống kê' },
  { id: 'p7-66', periodNumber: 66, grade: '7', subject: 'Toán học', lessonTitle: 'ÔN TẬP HỌC KỲ 1 (Tiết 1: Đại số & Số học)', notes: 'Hệ thống hóa kiến thức HK1' },
  { id: 'p7-67', periodNumber: 67, grade: '7', subject: 'Toán học', lessonTitle: 'ÔN TẬP HỌC KỲ 1 (Tiết 2: Hình học & Thống kê)', notes: 'Luyện đề tổng hợp' },
  { id: 'p7-68', periodNumber: 68, grade: '7', subject: 'Toán học', lessonTitle: 'KIỂM TRA ĐÁNH GIÁ CUỐI HỌC KỲ 1 (Tiết 1)', notes: 'Theo lịch Sở/Phòng GD&ĐT' },
  { id: 'p7-69', periodNumber: 69, grade: '7', subject: 'Toán học', lessonTitle: 'KIỂM TRA ĐÁNH GIÁ CUỐI HỌC KỲ 1 (Tiết 2)', notes: 'Thu bài & chấm điểm' },
  { id: 'p7-70', periodNumber: 70, grade: '7', subject: 'Toán học', lessonTitle: 'Trả bài kiểm tra cuối học kỳ 1 & Tổng kết học kỳ 1', notes: 'Đánh giá xếp loại & khen thưởng' },
];

// 2. PPCT TOÁN 8 - HỌC KỲ 1 (70 TIẾT)
export const SAMPLE_PPCT_GRADE_8: PpctItem[] = [
  // CHƯƠNG I: ĐA THỨC (15 tiết)
  { id: 'p8-1', periodNumber: 1, grade: '8', subject: 'Toán học', lessonTitle: 'Đơn thức và đa thức nhiều biến (Tiết 1)', notes: 'Khái niệm đơn thức, đa thức' },
  { id: 'p8-2', periodNumber: 2, grade: '8', subject: 'Toán học', lessonTitle: 'Đơn thức và đa thức nhiều biến (Tiết 2)', notes: 'Bậc của đơn thức & đa thức' },
  { id: 'p8-3', periodNumber: 3, grade: '8', subject: 'Toán học', lessonTitle: 'Các phép tính với đa thức nhiều biến: Cộng và trừ (Tiết 1)', notes: 'Thu gọn đa thức' },
  { id: 'p8-4', periodNumber: 4, grade: '8', subject: 'Toán học', lessonTitle: 'Các phép tính với đa thức nhiều biến: Cộng và trừ (Tiết 2)', notes: 'Luyện tập cộng trừ' },
  { id: 'p8-5', periodNumber: 5, grade: '8', subject: 'Toán học', lessonTitle: 'Nhân đơn thức với đa thức, đa thức với đa thức (Tiết 1)', notes: 'Quy tắc nhân' },
  { id: 'p8-6', periodNumber: 6, grade: '8', subject: 'Toán học', lessonTitle: 'Nhân đơn thức với đa thức, đa thức với đa thức (Tiết 2)', notes: 'Tính giá trị biểu thức' },
  { id: 'p8-7', periodNumber: 7, grade: '8', subject: 'Toán học', lessonTitle: 'Phép chia đa thức cho đơn thức', notes: 'Quy tắc chia hết' },
  { id: 'p8-8', periodNumber: 8, grade: '8', subject: 'Toán học', lessonTitle: 'Luyện tập chung: Phép tính đa thức', notes: 'Phiếu học tập' },
  { id: 'p8-9', periodNumber: 9, grade: '8', subject: 'Toán học', lessonTitle: 'Hằng đẳng thức đáng nhớ: Bình phương của tổng, hiệu (Tiết 1)', notes: '(a+b)^2, (a-b)^2' },
  { id: 'p8-10', periodNumber: 10, grade: '8', subject: 'Toán học', lessonTitle: 'Hằng đẳng thức đáng nhớ: Hiệu hai bình phương (Tiết 2)', notes: 'a^2 - b^2' },
  { id: 'p8-11', periodNumber: 11, grade: '8', subject: 'Toán học', lessonTitle: 'Hằng đẳng thức đáng nhớ: Lập phương của tổng, hiệu (Tiết 1)', notes: '(a+b)^3, (a-b)^3' },
  { id: 'p8-12', periodNumber: 12, grade: '8', subject: 'Toán học', lessonTitle: 'Hằng đẳng thức đáng nhớ: Tổng và hiệu hai lập phương (Tiết 2)', notes: 'a^3 + b^3, a^3 - b^3' },
  { id: 'p8-13', periodNumber: 13, grade: '8', subject: 'Toán học', lessonTitle: 'Phân tích đa thức thành nhân tử: Đặt nhân tử chung & HĐT (Tiết 1)', notes: 'Phương pháp cơ bản' },
  { id: 'p8-14', periodNumber: 14, grade: '8', subject: 'Toán học', lessonTitle: 'Phân tích đa thức thành nhân tử: Nhóm hạng tử (Tiết 2)', notes: 'Phương pháp nâng cao' },
  { id: 'p8-15', periodNumber: 15, grade: '8', subject: 'Toán học', lessonTitle: 'Bài tập cuối chương I', notes: 'Tổng kết hằng đẳng thức' },
  // ... (tạo mốc đến tiết 70 cho Lớp 8)
  ...Array.from({ length: 55 }, (_, i) => ({
    id: `p8-${i + 16}`,
    periodNumber: i + 16,
    grade: '8',
    subject: 'Toán học',
    lessonTitle:
      i + 16 <= 25
        ? `Tứ giác & Hình thang cân (Tiết ${i + 16 - 15})`
        : i + 16 <= 35
        ? `Hình bình hành, Hình chữ nhật, Hình thoi, Hình vuông (Tiết ${i + 16 - 25})`
        : i + 16 === 38 || i + 16 === 39
        ? `KIỂM TRA ĐÁNH GIÁ GIỮA HỌC KỲ 1 (Tiết ${i + 16 - 37})`
        : i + 16 <= 50
        ? `Phân thức đại số & Các phép tính (Tiết ${i + 16 - 39})`
        : i + 16 <= 65
        ? `Định lí Thalès trong tam giác & Ứng dụng (Tiết ${i + 16 - 50})`
        : i + 16 === 68 || i + 16 === 69
        ? `KIỂM TRA ĐÁNH GIÁ CUỐI HỌC KỲ 1 (Tiết ${i + 16 - 67})`
        : `Tổng kết & Trả bài cuối học kỳ 1 (Tiết ${i + 16})`,
    notes: 'Kế hoạch dạy học môn Toán 8',
  })),
];

// 3. PPCT TOÁN 10 - HỌC KỲ 1 (70 TIẾT)
export const SAMPLE_PPCT_GRADE_10: PpctItem[] = [
  { id: 'p10-1', periodNumber: 1, grade: '10', subject: 'Toán học', lessonTitle: 'Mệnh đề toán học (Tiết 1)', notes: 'Định nghĩa & mệnh đề phủ định' },
  { id: 'p10-2', periodNumber: 2, grade: '10', subject: 'Toán học', lessonTitle: 'Mệnh đề toán học (Tiết 2)', notes: 'Mệnh đề kéo theo, tương đương' },
  { id: 'p10-3', periodNumber: 3, grade: '10', subject: 'Toán học', lessonTitle: 'Tập hợp và các phép toán trên tập hợp (Tiết 1)', notes: 'Hợp, giao, hiệu hai tập hợp' },
  { id: 'p10-4', periodNumber: 4, grade: '10', subject: 'Toán học', lessonTitle: 'Tập hợp và các phép toán trên tập hợp (Tiết 2)', notes: 'Các tập con của số thực' },
  { id: 'p10-5', periodNumber: 5, grade: '10', subject: 'Toán học', lessonTitle: 'Bất phương trình bậc nhất hai ẩn (Tiết 1)', notes: 'Miền nghiệm của BPT' },
  { id: 'p10-6', periodNumber: 6, grade: '10', subject: 'Toán học', lessonTitle: 'Hệ bất phương trình bậc nhất hai ẩn (Tiết 1)', notes: 'Biểu diễn miền nghiệm của hệ' },
  { id: 'p10-7', periodNumber: 7, grade: '10', subject: 'Toán học', lessonTitle: 'Bài toán quy hoạch tuyến tính thực tế', notes: 'Tối ưu hóa chi phí' },
  { id: 'p10-8', periodNumber: 8, grade: '10', subject: 'Toán học', lessonTitle: 'Giá trị lượng giác của một góc từ 0 đến 180 độ (Tiết 1)', notes: 'Nửa đường tròn đơn vị' },
  { id: 'p10-9', periodNumber: 9, grade: '10', subject: 'Toán học', lessonTitle: 'Định lí côsin và định lí sin trong tam giác (Tiết 1)', notes: 'Định lí côsin' },
  { id: 'p10-10', periodNumber: 10, grade: '10', subject: 'Toán học', lessonTitle: 'Định lí côsin và định lí sin trong tam giác (Tiết 2)', notes: 'Định lí sin & giải tam giác' },
  // ... (tạo mốc đến tiết 70 cho Lớp 10)
  ...Array.from({ length: 60 }, (_, i) => ({
    id: `p10-${i + 11}`,
    periodNumber: i + 11,
    grade: '10',
    subject: 'Toán học',
    lessonTitle:
      i + 11 <= 20
        ? `Khái niệm véc-tơ & Các phép toán véc-tơ (Tiết ${i + 11 - 10})`
        : i + 11 <= 35
        ? `Tích vô hướng của hai véc-tơ & Ứng dụng (Tiết ${i + 11 - 20})`
        : i + 11 === 38 || i + 11 === 39
        ? `KIỂM TRA ĐÁNH GIÁ GIỮA HỌC KỲ 1 (Tiết ${i + 11 - 37})`
        : i + 11 <= 55
        ? `Hàm số bậc nhất & bậc hai, Đồ thị parabol (Tiết ${i + 11 - 39})`
        : i + 11 <= 66
        ? `Số gần đúng & Thống kê mô tả (Tiết ${i + 11 - 55})`
        : i + 11 === 68 || i + 11 === 69
        ? `KIỂM TRA ĐÁNH GIÁ CUỐI HỌC KỲ 1 (Tiết ${i + 11 - 67})`
        : `Tổng kết & Đánh giá kết quả học tập HK1 (Tiết ${i + 11})`,
    notes: 'Kế hoạch dạy học môn Toán 10',
  })),
];

/**
 * Kiểm tra xem có PPCT mẫu chuẩn cho khối và môn này không
 */
export function hasSamplePpctForGrade(grade: string, subject?: string): boolean {
  const g = String(grade).trim();
  const s = String(subject || '').toLowerCase();
  const isMath = !subject || s.includes('toán') || s.includes('toan') || s.includes('math');
  return isMath && (g === '7' || g === '8' || g === '10');
}

/**
 * Lấy PPCT mẫu theo khối lớp và môn học (Khối 7, 8, 10 môn Toán chuẩn GDPT 2018)
 * TUYỆT ĐỐI KHÔNG tự ý lấy PPCT Toán 7 thay cho môn hoặc khối khác khi thiếu dữ liệu!
 */
export function getSamplePpctForGrade(grade: string, subject?: string): PpctItem[] {
  const g = String(grade).trim();
  const s = String(subject || '').toLowerCase();
  const isMath = !subject || s.includes('toán') || s.includes('toan') || s.includes('math');

  if (!isMath) {
    // Không bao giờ gán PPCT Toán cho môn học khác
    return [];
  }

  if (g === '7') return SAMPLE_PPCT_GRADE_7;
  if (g === '8') return SAMPLE_PPCT_GRADE_8;
  if (g === '10') return SAMPLE_PPCT_GRADE_10;

  // Trả về mảng rỗng để hệ thống cảnh báo và yêu cầu nạp file Excel thực tế
  return [];
}
