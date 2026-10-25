# ClassGo — báo cáo tích hợp an toàn ngày 25/10/2026

Bản này được đưa lên nhánh riêng để giáo viên xem xét. Chưa merge, chưa triển khai Production. Các giới hạn ở mục “Chưa xác minh / chưa tích hợp an toàn” cần được xem trước khi phê duyệt.

## Mốc gốc và nguồn mã

- Repository: https://github.com/Nhung1312/classgopro
- `main` trước khi làm: `e758ecd4c5b80a6388c98af62ecbf2c51e1901be`.
- PR #6: mở, draft, chưa merge; head `f5e098ca7d44023fb7ebfeb17b5ebb037c1ddf7d`.
- PR #7 đã tồn tại trước nhiệm vụ: mở, draft; head `8df0889ff193bd5d5b823cfd432becbb366fb52b`. Đã đối chiếu, không sửa hoặc đóng PR này.
- Nhánh tích hợp mới: `integrate/classgo-complete-20261025`, bắt đầu từ đúng `main` nêu trên.
- Gói đính kèm `ClassGo_Nhanh_GitHub_An_Toan_25_10_2026(1).zip` chứa `classgopro (1)(3).zip`; không chạy PowerShell trong gói.
- SHA-256 ZIP mã nguồn bên trong: `275adb7badcbdfe9f7371c3f5e897d8f739baf7f03f8985ba36d781f252d2c1f`.
- Đã kiểm kê/đọc bytes cả 108 tệp (124 mục gồm thư mục), đối chiếu Git và rà mẫu bí mật; không có tệp nguồn rỗng. Không thấy private key hay GitHub token. Cấu hình Firebase công khai có sẵn được giữ nguyên từ main.

## Cách xử lý PR #6 và các bản sửa hiện có

Không merge PR #6 hoặc chép nguyên ZIP lên main. Bản tích hợp giữ giao diện Ô cửa bí mật của Google, kết hợp các phần đã kiểm thử từ PR #6:

- Kho câu hỏi của từng lớp vẫn ở `ClassRoom.questions`; bộ chuyển đổi chỉ đọc giúp kho này xuất hiện trong cùng bộ chọn bài của Google, không di chuyển hay xóa dữ liệu, không tạo module trò chơi thứ hai.
- Giữ nhập/xuất JSON schema v1, nhập Excel và kiểm tra khối/môn/trùng câu trong `QuestionBankModal`.
- Dùng bộ gán cửa cố định/chống câu trùng của PR #6, chọn chương/bài, mức cơ bản/nâng cao, 2/4/6/8/10 ô.
- Đánh giá Đạt/Chưa đạt, lưu điểm và thưởng sao dùng cùng mã lượt; không tăng số lần gọi tên. Chặn lưu điểm/sao lặp; lịch sử phân loại hoạt động.
- Chỉ ghi TX sau xác nhận; giữ nguyên ô đã có điểm, kể cả 0. Lưu lịch sử riêng không ghi TX. Chuyển từ lịch sử dùng đúng record ID, không sửa nhầm lượt gần nhất của học sinh.
- Giữ toàn bộ test PR #6, kết hợp test main và test thực tế qua giao diện mới.

Đã đối chiếu byte và giữ nguyên 16 tệp bảo vệ/config của main: Firebase Rules, Firebase config, `.env.example`, Vercel config, các tiện ích đếm lượt/kim tự tháp/tìm kiếm, dịch vụ Firestore/nề nếp và các màn quản lý lớp/điểm/danh sách liên quan. `App.tsx` được bổ sung trên bản main, giữ hoàn tác theo nhóm, nhập/khôi phục sao lưu và đối soát nề nếp. `storage.ts` giữ tombstone nề nếp, thêm PPCT/ngày nghỉ/cấu hình lịch vào sao lưu; không tự bỏ ngày nghỉ 20/11 do giáo viên nhập.

## Chức năng từ ZIP đã đưa vào nhánh

| Nhóm | Nội dung | Trạng thái xác minh |
| --- | --- | --- |
| TKB–PPCT | Nhập TKB, PPCT nhiều môn, định danh Khối + Môn + Tiết, chuẩn hóa Toán/GDĐP/HĐTN&HN, tải mẫu chung, sinh báo giảng theo lớp/môn, nghỉ và dạy bù | Test dữ liệu ZIP 20 tiết/455 tiết đạt; test dữ liệu giả tái lập trên CI; kiểm tra xung đột dạy bù đạt |
| Kho KT bài cũ | Màn quản trị Google, dữ liệu mục lục KNTT, nhập/xuất, bộ chọn bài và một giao diện Ô cửa bí mật thống nhất | TypeScript/build/test module đạt; trình duyệt kiểm tra gọi tên → kho lớp → lưu lịch sử → xác nhận TX → thưởng sao đạt |
| Thẻ trả lời | Bộ mã 120 thẻ, gán theo mã học sinh, quét ảnh/camera UI, phiên kiểm tra, thống kê, Excel, in/PDF, ghi TX có xác nhận | 480 hướng mã + 480 lỗi một bit đạt; bộ phát hiện ảnh thực sự đọc 120 thẻ × 4 hướng trên ảnh tổng hợp; PDF/Excel tải qua trình duyệt đạt |
| Gán thẻ dùng chung | Cấu hình theo lớp độc lập với môn, giữ mã thẻ khi đổi thứ tự/mã nội bộ HS mà mã học sinh còn nguyên | Test đạt; từ chối mã HS trùng và ngoài 1–120; lỗi bộ thẻ được chặn tại module, không làm trắng toàn ứng dụng |
| Điểm thẻ | Tính lại đúng/sai từ đáp án, chặn ghi đè và ghi lặp, giữ số lượt gọi thực tế; từ chối chuyển TX nếu môn phiên khác môn sổ lớp | Test đạt; hiện mô hình sổ điểm của app gắn môn vào lớp, không tự tạo cấu trúc điểm nhiều môn mới |
| Đồng bộ cùng trình duyệt | BroadcastChannel cùng origin và cùng phạm vi tài khoản; chặn vòng lặp phát lại snapshot | Test sự kiện và chống phát vòng lặp đạt; chưa xác minh mọi tình huống tranh chấp đồng thời |
| AI tạo câu hỏi | Có mã UI tạo từng bài/hàng loạt và server cục bộ từ ZIP; giữ tên model của nguồn | Không gọi Gemini; không xác nhận Gemini thật hoặc Vercel API hoạt động |

## Lỗi phát hiện và xử lý có bằng chứng

1. Bộ nhận diện ảnh dùng RDP cho contour khép kín có đầu/cuối trùng nhau nên ngay ảnh thẻ rõ nét cũng trả về rỗng. Đã tách contour thành hai cung trước khi rút gọn; toàn bộ 120 thẻ × 4 hướng qua pipeline ảnh đạt. Giữ nguyên từ điển mã thẻ để không làm mất tính tương thích thẻ đã in.
2. Luồng lưu lịch sử của ZIP có thể vô tình ghi TX; ghi trực tiếp TX có thể đè điểm 0 và báo thành công dù callback lỗi. Đã tách xử lý an toàn, thêm xác nhận kết quả callback và kiểm thử trình duyệt.
3. Hoàn tác theo nhóm và sao lưu tombstone nề nếp có thể bị lùi khi áp bản ZIP/PR #7. Giữ cơ chế main, chỉ thêm chức năng cần thiết.
4. Đồng bộ PIN của ZIP đưa cả session vào Map RAM không xác thực. Cấu hình Vercel hiện chỉ rewrite SPA, không triển khai Express đó. Không thể xem đây là backend hai thiết bị an toàn/bền vững. Không đưa endpoint PIN đọc/ghi/SSE không xác thực vào sử dụng; server trả 503, client không truyền dữ liệu học sinh tới endpoint này. UI có thông báo rõ chưa bật.
5. Kho ẩn danh có thể tự xuất hiện ở tài khoản đăng nhập khác trên thiết bị chung. Bỏ fallback ngầm; giữ nguyên dữ liệu ẩn danh để giáo viên chủ động xuất/nhập. Cấu hình/phiên thẻ mới được tách phạm vi theo tài khoản.

## Kết quả kiểm thử

- `npm run lint`: đạt.
- `npm run build`: đạt. Còn cảnh báo bundle lớn khoảng 3,45 MB JS trước gzip; chưa xem đây là bản đã tối ưu tốc độ tải.
- `npm run test:integration`: 14 bộ kiểm thử đạt, gồm toàn bộ test main và PR #6, TKB–PPCT, ArUco, pipeline ảnh, an toàn TX/sao/backup, server cục bộ và BroadcastChannel.
- Đã chạy riêng test TKB–PPCT bằng hai CSV từ ZIP: đủ 455 tiết (Toán 7: 140; Toán 8: 140; HĐTN&HN 7: 105; GDĐP 7: 35; GDĐP 8: 35), TKB đủ 20 tiết (12 Toán + 5 GDĐP + 3 HĐTN&HN). Không đưa CSV/TXT nguồn vào public/repository.
- `npm run test:browser`: trình duyệt headless, hồ sơ mới và dữ liệu giả; đạt tải PDF, Excel kết quả, mẫu PPCT; gọi tên tăng một lượt; kho lớp mở cửa; chỉ lưu lịch sử không ghi TX; xác nhận TX giữ điểm 0; cộng sao lần hai bị chặn.
- Mọi request ngoài localhost trong test trình duyệt đều bị chặn trước khi ứng dụng chạy. Không đăng nhập, không ghi Firebase, không gọi Gemini.
- Workflow CI tích hợp mới chạy npm ci, TypeScript, 14 bộ test, build và kiểm thử trình duyệt; trạng thái chạy cụ thể nằm trên PR/checks của commit hiện tại.
- `git diff --check`: đạt.

## Chưa xác minh / chưa tích hợp an toàn

- Chưa kiểm thử camera vật lý, thẻ in giấy, ánh sáng/góc nghiêng/che khuất, lớp đông, nhiều thẻ trong một khung hoặc hai thiết bị thật. Ảnh tổng hợp không thay thế kiểm tra lớp học.
- Đồng bộ điện thoại–máy chiếu qua Vercel **chưa sẵn sàng**. Cần backend lưu bền vững, xác thực/quyền scanner–projector, hết hạn phiên và xử lý xung đột; không dùng Map RAM/PIN 6 số để bảo vệ dữ liệu học sinh. Không thay Firebase Rules để cố bật chức năng này.
- Chưa kiểm tra Gemini thật; API tạo câu hỏi không được triển khai lên Vercel trong PR. `dev:server` chỉ mở server cục bộ 127.0.0.1, không tự thiết lập API key hoặc billing. Frontend báo rõ khi API chưa sẵn sàng.
- Dữ liệu localStorage giữa domain Google AI Studio và domain GitHub/Vercel không tự chuyển theo mã nguồn. Các kho/phiên thẻ giữ ở thiết bị/tài khoản tương ứng; không khẳng định đã đồng bộ cloud.
- Chưa xác minh quyền Firebase với tài khoản thật; chỉ rà cấu hình/rules trong repository và xác nhận chúng không thay đổi.
- PR này để draft cho giáo viên xem. Chưa khẳng định toàn bộ module thẻ đã ổn định hoàn toàn hoặc khuyến nghị dùng kết nối điện thoại trong giờ dạy.

## Tệp thay đổi

Không xóa tệp đã theo dõi từ main. Không đưa `bun.lock` của nguồn để tránh hai lockfile; có `package-lock.json` để tái lập cài đặt bằng npm ci. Không đưa PowerShell, ba CSV/TXT thử, file env thật, khóa bí mật hay build output lên repository. Danh sách bên dưới là mã/kiểm thử/config CI có chủ đích (báo cáo này là tệp bổ sung).

### Thêm mới (50 tệp, chưa tính báo cáo)

- `.github/workflows/verify-integration.yml`
- `.github/workflows/verify-review-game.yml`
- `package-lock.json`
- `scripts/check-aruco-images.ts`
- `scripts/check-browser-integration.mjs`
- `scripts/check-integration-safety.ts`
- `scripts/check-local-server.ts`
- `scripts/check-mystery-door.ts`
- `scripts/check-mystery-score.ts`
- `scripts/check-response-broadcast.ts`
- `scripts/check-review-choices.ts`
- `scripts/check-review-exchange.ts`
- `scripts/check-review-import.ts`
- `scripts/testArucoDetection.ts`
- `scripts/testPpctAndTimetable.ts`
- `scripts/verify-integration.mjs`
- `server.ts`
- `src/components/BulkAiQuestionModal.tsx`
- `src/components/ReviewQuestionBankScreen.tsx`
- `src/components/mystery-door/MysteryBankPickerModal.tsx`
- `src/components/mystery-door/MysteryDoorGame.tsx`
- `src/components/mystery-door/MysteryDoorGrid.tsx`
- `src/components/mystery-door/MysteryQuestionCard.tsx`
- `src/components/response-cards/CameraScannerScreen.tsx`
- `src/components/response-cards/CardPrintSheet.tsx`
- `src/components/response-cards/CreateQuizModal.tsx`
- `src/components/response-cards/QuizProjectorView.tsx`
- `src/components/response-cards/QuizSessionResultsScreen.tsx`
- `src/components/response-cards/ResponseCardsBoundary.tsx`
- `src/components/response-cards/ResponseCardsScreen.tsx`
- `src/components/timetable/AutoScheduleModal.tsx`
- `src/components/timetable/DayOffAndMakeupModal.tsx`
- `src/components/timetable/MakeupLessonModal.tsx`
- `src/data/knttMathCatalog.json`
- `src/data/knttMathCatalog.ts`
- `src/services/arucoService.ts`
- `src/services/responseCardPdf.ts`
- `src/services/responseCardStorage.ts`
- `src/services/reviewQuestionService.ts`
- `src/types/responseCardTypes.ts`
- `src/utils/classReviewBanks.ts`
- `src/utils/mysteryDoorAssessment.ts`
- `src/utils/mysteryDoorSession.ts`
- `src/utils/questionParser.ts`
- `src/utils/responseCardTransfer.ts`
- `src/utils/reviewBankExchange.ts`
- `src/utils/reviewBankImport.ts`
- `src/utils/reviewQuestionChoices.ts`
- `src/utils/safeReviewTx.ts`
- `src/utils/samplePpctData.ts`

### Sửa (11 tệp)

- `package.json`
- `src/App.tsx`
- `src/components/HistoryScreen.tsx`
- `src/components/Navbar.tsx`
- `src/components/QuestionBankModal.tsx`
- `src/components/SpinScreen.tsx`
- `src/components/TimetableScreen.tsx`
- `src/types.ts`
- `src/utils/storage.ts`
- `src/utils/timetableExcelService.ts`
- `src/utils/undoCompletedSpin.ts`

## Dừng và khôi phục

`main`, PR #6 và PR #7 giữ nguyên các mốc gốc. Chưa merge, không force-push, không xóa nhánh, không gửi lệnh deploy Production; thay đổi chỉ trên nhánh tích hợp và PR mới. Nếu chưa chấp nhận ứng viên, tiếp tục dùng main gốc; không cần hoàn tác dữ liệu vì test không ghi dữ liệu thật. Commit SHA mới và URL PR được ghi trong metadata PR và báo cáo trả cho giáo viên; không chèn SHA tự tham chiếu vào chính commit.
