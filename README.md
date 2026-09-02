# ClassGo - Classroom Engagement & Management Platform

ClassGo là ứng dụng hỗ trợ giáo viên quay số gọi tên học sinh ngẫu nhiên, chấm điểm thi đua, tạo câu hỏi khởi động/kiểm tra bài cũ, quản lý thời khóa biểu và kế hoạch giảng dạy.

## 🚀 Hướng Dẫn Deploy Lên Vercel

### Cách 1: Deploy qua kết nối GitHub (Khuyên Dùng)
1. Đẩy mã nguồn dự án lên GitHub của bạn.
2. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
3. Bấm **"Add New..."** -> **"Project"**.
4. Chọn repository `ClassGo` (hoặc `classgo-app`).
5. Ở phần cấu hình build:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. (Tùy chọn) Khai báo các biến môi trường (Environment Variables) nếu muốn ghi đè cấu hình Firebase:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_FIRESTORE_DATABASE_ID`
7. Bấm **Deploy**. Vercel sẽ tự động build và cung cấp tên miền `.vercel.app` miễn phí.

### Cấu hình Firebase Authorized Domains (Quan trọng để đăng nhập trên Vercel)
Sau khi Vercel cấp tên miền cho bạn (ví dụ: `class-go-xyz.vercel.app`):
1. Truy cập [Firebase Console](https://console.firebase.google.com).
2. Chọn project của bạn: `classgopro-1ecf9`.
3. Vào **Authentication** -> Thẻ **Settings** -> Mục **Authorized domains**.
4. Bấm **Add domain** và nhập domain Vercel của bạn (ví dụ: `class-go-xyz.vercel.app`).
5. Bây giờ chức năng đăng nhập Google và Email trên Vercel sẽ hoạt động mượt mà 100%!
