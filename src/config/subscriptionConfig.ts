/**
 * =========================================================================================
 * ⚙️ CẤU HÌNH DÙNG THỬ & GIỚI HẠN TÀI KHOẢN CLASSGO (TRIAL & SUBSCRIPTION SETTINGS)
 * =========================================================================================
 * 
 * 👉 CÔNG TẮC BẬT / TẮT GIỚI HẠN DÙNG THỬ 30 NGÀY (TRIAL LIMIT TOGGLE):
 * 
 * [1] Khi ENABLE_TRIAL_LIMIT = false (HIỆN TẠI):
 *     - TẠM THỜI TẮT toàn bộ giới hạn dùng thử 30 ngày.
 *     - Người dùng đăng nhập hợp lệ được sử dụng ClassGo MIỄN PHÍ HOÀN TOÀN, không giới hạn thời gian.
 *     - Không khóa tài khoản, không khóa ứng dụng, không chặn vòng quay gọi tên.
 *     - Không hiện thông báo hay popup bắt buộc nâng cấp vì hết hạn.
 *     - Người dùng mới, người dùng cũ, và tài khoản từng hết hạn trước đây đều sử dụng bình thường.
 *     - Dữ liệu Firebase Authentication & Firestore vẫn hoạt động đọc/ghi 100% trơn tru.
 * 
 * [2] Khi ENABLE_TRIAL_LIMIT = true (BẬT LẠI SAU NÀY):
 *     - KÍCH HOẠT LẠI cơ chế dùng thử 30 ngày như trước đây.
 *     - Người dùng quá 30 ngày dùng thử sẽ được thông báo hết hạn và hướng dẫn nâng cấp gói PRO.
 *     - Toàn bộ code tính ngày bắt đầu, ngày hết hạn, daysLeft, kiểm tra expired được giữ nguyên vẹn.
 * =========================================================================================
 */

// CÔNG TẮC CHÍNH: Đổi thành 'true' khi muốn bật lại cơ chế giới hạn 30 ngày dùng thử
export const ENABLE_TRIAL_LIMIT: boolean = false;

// Số ngày dùng thử mặc định khi ENABLE_TRIAL_LIMIT = true
export const TRIAL_DURATION_DAYS: number = 30;
