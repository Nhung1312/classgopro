import { TimetableSlot, TeachingPlanItem } from '../types';

export const INITIAL_TIMETABLE_SLOTS: TimetableSlot[] = [
  { id: 'tt-1', dayOfWeek: 2, period: 1, classId: 'class-7a1', className: '7A1', subject: 'Toán (Đại số)', room: 'P.201', note: 'Bài: Đạo hàm & ứng dụng' },
  { id: 'tt-2', dayOfWeek: 2, period: 2, classId: 'class-7a1', className: '7A1', subject: 'Toán (Đại số)', room: 'P.201', note: 'Luyện tập phương trình' },
  { id: 'tt-3', dayOfWeek: 2, period: 4, classId: 'class-7a2', className: '7A2', subject: 'Toán (Hình học)', room: 'P.203', note: 'Hình không gian Oxyz' },
  { id: 'tt-4', dayOfWeek: 3, period: 2, classId: 'class-7a1', className: '7A1', subject: 'Toán (Hình học)', room: 'P.201', note: 'Véctơ trong không gian' },
  { id: 'tt-5', dayOfWeek: 3, period: 3, classId: 'class-7a2', className: '7A2', subject: 'Toán (Đại số)', room: 'P.203', note: 'Tích phân xác định' },
  { id: 'tt-6', dayOfWeek: 4, period: 1, classId: 'class-7a1', className: '7A1', subject: 'Toán (Đại số)', room: 'P.201', note: 'Khảo sát hàm số' },
  { id: 'tt-7', dayOfWeek: 4, period: 2, classId: 'class-7a2', className: '7A2', subject: 'Toán (Đại số)', room: 'P.203', note: 'Luyện tập tích phân' },
  { id: 'tt-8', dayOfWeek: 5, period: 3, classId: 'class-7a1', className: '7A1', subject: 'Toán (Hình học)', room: 'P.201', note: 'Khoảng cách & Góc' },
  { id: 'tt-9', dayOfWeek: 6, period: 1, classId: 'class-7a2', className: '7A2', subject: 'Toán (Hình học)', room: 'P.203', note: 'Phương trình mặt phẳng' },
  { id: 'tt-10', dayOfWeek: 6, period: 2, classId: 'class-7a1', className: '7A1', subject: 'Toán Ôn tập', room: 'P.201', note: 'Kiểm tra 15 phút' },
];

export const INITIAL_TEACHING_PLAN: TeachingPlanItem[] = [
  { id: 'tp-1', week: 1, classId: 'class-7a1', className: '7A1', periodNumber: 1, lessonTitle: 'Mệnh đề và tập hợp (Tiết 1)', isCompleted: true, notes: 'HS hiểu khái niệm mệnh đề' },
  { id: 'tp-2', week: 1, classId: 'class-7a1', className: '7A1', periodNumber: 2, lessonTitle: 'Mệnh đề và tập hợp (Tiết 2)', isCompleted: true, notes: 'Luyện tập các phép toán tập hợp' },
  { id: 'tp-3', week: 2, classId: 'class-7a1', className: '7A1', periodNumber: 3, lessonTitle: 'Bất phương trình bậc nhất hai ẩn', isCompleted: true, notes: 'Biểu diễn miền nghiệm' },
  { id: 'tp-4', week: 2, classId: 'class-7a1', className: '7A1', periodNumber: 4, lessonTitle: 'Hệ bất phương trình bậc nhất hai ẩn', isCompleted: false, notes: 'Chuẩn bị bài toán thực tế' },
  { id: 'tp-5', week: 3, classId: 'class-7a1', className: '7A1', periodNumber: 5, lessonTitle: 'Hàm số và đồ thị (Tiết 1)', isCompleted: false, notes: 'Tập xác định & tập giá trị' },
  { id: 'tp-6', week: 1, classId: 'class-7a2', className: '7A2', periodNumber: 1, lessonTitle: 'Khái niệm véc-tơ', isCompleted: true, notes: 'Véc-tơ cùng phương, cùng hướng' },
  { id: 'tp-7', week: 1, classId: 'class-7a2', className: '7A2', periodNumber: 2, lessonTitle: 'Tổng và hiệu của hai véc-tơ', isCompleted: true, notes: 'Quy tắc 3 điểm, hình bình hành' },
  { id: 'tp-8', week: 2, classId: 'class-7a2', className: '7A2', periodNumber: 3, lessonTitle: 'Tích của một số với một véc-tơ', isCompleted: false, notes: 'Tính chất & bài tập' },
];
