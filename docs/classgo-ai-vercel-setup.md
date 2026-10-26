# ClassGo: API tạo câu hỏi AI trên Vercel

## Nguyên nhân và phạm vi bản vá
Frontend gửi `POST /api/generate-questions`, nhưng bản cũ chỉ có Express `server.ts` chạy cục bộ và SPA rewrite trên Vercel. Vercel cần Function riêng. PR #8 đã được tài khoản Nhung1312 merge ngoài phiên sửa này lúc 2026-10-25 23:54:46 UTC, tạo main `6ee31fc585c95374ca269797eff80acd772454bc`.

Bản vá tiếp theo dựa trên chính commit đó, giữ Function và công tắc `CLASSGO_AI_ENABLED`, dùng chung handler cho Vercel/Express, loại `/api` khỏi SPA rewrite và kiểm tra entry đã biên dịch bằng Node ESM. Không chỉnh TKB–PPCT, Ô cửa bí mật, thẻ trả lời, điểm hay Firebase Rules. Không có mã ghi Firestore trong API này.

## Bảo vệ khóa trả phí
- Mặc định tắt: chỉ chạy khi `CLASSGO_AI_ENABLED=true`. Không tự bật Production.
- Xác minh chữ ký RS256, issuer, audience đúng `classgopro-1ecf9`, thời hạn Firebase ID token bằng chứng thư Google. Sau đó kiểm tra tài khoản trực tiếp qua Firebase Auth `accounts:lookup`: UID trùng token, chưa bị vô hiệu hóa, email đã xác minh. Dùng Web API key công khai của đúng dự án trong cấu hình hiện có, không nhận key/project khác từ trình duyệt hay biến môi trường.
- UID phải thuộc `CLASSGO_AI_TEACHER_UIDS`. Không tự cấp quyền cho mọi người đã đăng ký.
- `GEMINI_API_KEY` chỉ dùng phía máy chủ. Không đặt bí mật vào `VITE_*`, GitHub, log hoặc phản hồi lỗi.
- Hạn mức Redis REST dùng chung giữa các instance/deployment. Một Lua script đặt chỗ nguyên tử cho: lượt/giáo viên/phút, lượt/giáo viên/ngày UTC, lượt/dự án/ngày UTC, và một yêu cầu đang chạy/giáo viên. UID trong khóa bộ đếm được băm, không lưu nội dung câu hỏi hay dữ liệu học sinh.
- Mặc định 20 lượt/phút, 100 lượt/giáo viên/ngày, 200 lượt toàn dự án/ngày. Có thể giảm bằng biến môi trường; tối đa cho phép 60/1000/2000. Đây là hạn mức lượt gọi, không phải hạn mức tiền; vẫn cần quản lý quota/chi phí Gemini tại nhà cung cấp.
- Đặt chỗ trước mỗi lần gọi Gemini; lỗi cũng tiêu tốn lượt. Redis thiếu cấu hình hoặc không truy cập được thì dừng 503, không dùng bộ đếm RAM thay thế.
- Một lần gọi model, SDK `attempts: 1`, không retry/model fallback tự động. Giới hạn đầu vào 32 KiB, 1–20 câu/lượt để giữ các lựa chọn 5/10/15/20 hiện có cho từng bài và hàng loạt. Giữ prompt sư phạm đã có và hai mức basic/advanced.
- Phía trình duyệt gửi Firebase ID token. Chỉ làm mới token và gửi lại một lần khi backend báo token hết hạn trước khi gọi Gemini; không tự gửi lại khi lỗi quota/provider.

## Cấu hình Preview còn cần bổ sung
Giữ khóa Gemini ClassGo hiện có. Trong **Preview**, cần:

| Biến | Giá trị |
| --- | --- |
| `GEMINI_API_KEY` | Khóa hiện có của ClassGo, server-side |
| `CLASSGO_AI_TEACHER_UIDS` | UID giáo viên được quản trị viên cho phép, ngăn cách bằng dấu phẩy |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Redis REST có quyền EVAL/GET/INCR/EXPIRE/SET/DEL; hoặc cặp `KV_REST_API_URL`, `KV_REST_API_TOKEN` tương thích |
| `CLASSGO_AI_ENABLED` | Chỉ đặt `true` cho Preview sau khi xác nhận các bảo vệ và quota |
| `CLASSGO_AI_MODEL` | Tùy chọn; giữ mặc định `gemini-flash-latest` hoặc model có quyền dùng trong chính dự án |
| `CLASSGO_AI_RPM`, `CLASSGO_AI_DAILY_LIMIT`, `CLASSGO_AI_GLOBAL_DAILY_LIMIT` | Tùy chọn, mặc định 20/100/200 |

Không tạo database/tài khoản mới, cấp thêm quyền giáo viên, đổi khóa, sửa Firebase Rules hay cài đặt Production trong phiên sửa này. Quản trị viên cần cung cấp UID và Redis của chính dự án. Nếu dùng Redis khác cho mỗi môi trường, hạn mức là theo từng Redis; muốn giới hạn tổng phải dùng cùng kho và không để các deployment cũ không có hạn mức tiếp tục gọi khóa đó.

Khi Preview yêu cầu Vercel Authentication, cần quyền truy cập Preview hợp lệ cho người kiểm thử/công cụ; không tắt bảo vệ để thử. Nếu đăng nhập Firebase trên Preview bị chặn domain, quản trị viên cần thêm chính xác hostname Preview tin cậy vào Firebase Authentication Authorized domains. Không thêm wildcard hoặc thay Rules.

Sau cấu hình, tạo lại Preview, đăng nhập giáo viên đã cho phép, thử 1 câu ở từng bài và một lô nhỏ basic/advanced, kiểm tra đáp án rồi đóng bản nháp mà không lưu vào ngân hàng/Firestore. Kiểm tra 403 cho người không có quyền và 429 khi vượt hạn mức. Không dùng dữ liệu học sinh hoặc ghi Sổ điểm.

## Kiểm thử và giới hạn xác nhận
- TypeScript, production build, bộ integration/regression hiện có và browser smoke chạy cục bộ.
- Kiểm thử chữ ký token thật bằng khóa QA sinh cục bộ; xác thực sai project/hết hạn/giả chữ ký/email chưa xác minh/tài khoản bị khóa/UID không cho phép. Không dùng tài khoản thật.
- Chạy chính Lua sản xuất trong Lua VM để kiểm tra đồng thời, giới hạn phút/ngày/toàn cục và lỗi kho; kiểm tra yêu cầu lỗi không gọi Gemini.
- Biên dịch entry Vercel sang Node ESM rồi tải bằng Node thường, không phụ thuộc tsx/Vite.
- Những kiểm thử trên dùng provider/Redis/Firebase Auth giả lập; không khẳng định đã tạo câu hỏi thành công trên Preview. Kết quả Preview và CI được ghi trong PR sau deployment.
- Trước bản vá, HTTP POST không đăng nhập tới Preview bị Vercel Deployment Protection chặn 401. Đây là lỗi của lớp bảo vệ Vercel, không phải kết quả xác thực Firebase của ứng dụng và không chứng minh API tạo câu hỏi thành công.
- Khi kiểm tra Vercel Environment Variables, chỉ thấy `GEMINI_API_KEY` và `APP_URL` cho Production/Preview. Chưa thấy UID giáo viên, công tắc bật AI hoặc Redis. Không đọc giá trị bí mật và không tự thêm cấu hình.

## Mã lỗi
`405` chỉ cho phương thức khác POST; `503 AI_DISABLED` khi chưa bật; `401` cho token/email không hợp lệ; `403` cho UID/nguồn không được phép; `400/413/415` cho đầu vào; `503` cho cấu hình/kho hạn mức không sẵn sàng; `429` có Retry-After cho hạn mức hoặc quota Gemini; `502/504` cho phản hồi/lỗi/thời gian Gemini. Các lỗi trả thông báo an toàn, không trả lỗi thô hoặc khóa.
