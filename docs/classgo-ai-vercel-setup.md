# ClassGo: cấu hình tạo câu hỏi AI trên Vercel (PR #8)

## Nguyên nhân lỗi 405
Trước đây frontend gửi `POST /api/generate-questions` nhưng Vercel chỉ triển khai SPA; Express `server.ts` chỉ chạy trên máy cục bộ. PR tích hợp có thêm Vercel Function `api/generate-questions.ts`. Phần còn lại cần quản trị viên cấu hình Vercel và Firebase, không thể thực hiện chỉ bằng commit GitHub.

## An toàn trước tiên
- **Mặc định API không gọi Gemini** (`CLASSGO_AI_ENABLED` không bằng `true` thì trả 503 rõ ràng). Merge GitHub vào main không tự bật tài khoản Gemini trả phí.
- Backend chỉ nhận POST; có xác thực Firebase ID token qua Firebase Auth REST `accounts:lookup`, yêu cầu email đã xác minh và UID thuộc danh sách cho phép.
- API key Gemini giữ trong Environment Variables của Vercel, không đưa vào GitHub hoặc `VITE_*`.
- Mỗi lượt tối đa 10 câu, hạn chế chiều dài nội dung; không thử model dự phòng tự động.
- **Chưa có giới hạn số lượt toàn cục bền vững theo ngày.** Danh sách UID và giới hạn 10 câu/yêu cầu không thay thế được giới hạn tiền/quota của Google Cloud. Trước khi bật ở Production, cấu hình quota/giới hạn chi phí và hạn mức ứng dụng tại nhà cung cấp hoặc bổ sung rate-limit bền vững. Không bật công khai cho mọi tài khoản.

## Kích hoạt sau khi kiểm thử bản Preview

1. Vào **Firebase Console** của đúng dự án đang chạy ClassGo (`classgopro-1ecf9`) → Authentication → Settings → Authorized domains → Add domain. Thêm **chính xác** hostname của Preview đang mở nếu tin cậy, ví dụ `classgopro-git-integrate-classgo-complete-20261025-matsuda4.vercel.app` (không nhập `https://`). Không thêm wildcard. Production dùng `classgopro.vercel.app` nếu chưa có trong danh sách. Đây là cài đặt Firebase Console, không nằm trong GitHub.
2. Trên Vercel Project ClassGo → Settings → Environment Variables, cho môi trường **Preview** thiết lập:
   - `GEMINI_API_KEY`: khóa Gemini riêng của dự án ClassGo (server-side).
   - `CLASSGO_AI_TEACHER_UIDS`: UID Firebase của giáo viên được cấp quyền, nhiều UID ngăn bằng dấu phẩy; tìm trong Firebase Authentication → Users.
   - `CLASSGO_AI_ENABLED`: `true` **chỉ khi** đã xác minh khóa, quota, quyền truy cập và muốn thử có tính phí.
   - `CLASSGO_AI_MODEL`: model Gemini Flash khả dụng với dự án (không bắt buộc, mặc định `gemini-flash-latest`).
   - `CLASSGO_FIREBASE_API_KEY`: Web API key đúng dự án Firebase ClassGo (nếu không khai báo, server dùng cấu hình Firebase công khai có trong repo).
3. Redeploy Preview sau khi thêm biến môi trường. Đăng nhập bằng tài khoản giáo viên UID đã cho phép rồi thử **một lần, 1–2 câu**, kiểm tra chi phí/quota.
4. Sau khi thử thành công và có giới hạn sử dụng phù hợp, mới cân nhắc bật biến `CLASSGO_AI_ENABLED=true` ở môi trường **Production**.

## Mã lỗi có ý nghĩa
- `405` cho GET: phương thức không hỗ trợ, API đã tồn tại.
- `503`: chưa bật AI hoặc thiếu cấu hình máy chủ.
- `401`: chưa đăng nhập, token không hợp lệ hoặc email chưa xác minh.
- `403`: đã đăng nhập nhưng UID không thuộc danh sách được cấp quyền.
- `429`: Google Gemini giới hạn lượt gọi/quota.
- `502`: Gemini/model lỗi hoặc phản hồi không đúng chuẩn.

## Phạm vi thay đổi
Không thay Firebase Rules, không đụng TKB–PPCT/Sổ báo giảng, Ô cửa bí mật, thẻ ArUco hoặc chức năng điểm. Đồng bộ camera điện thoại–máy chiếu vẫn bị tắt an toàn. PR #6 và #7 không cần merge chồng lên bản PR #8.
